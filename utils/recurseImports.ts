import {
  doubleQuotesRegex,
  reactUrlRegex,
  reExportPath,
  reHttp,
  reImportPath,
  reModuleExt,
} from "../core/utils.ts";
import { ensureTextFile, existsFile } from "../fs.ts";
import { path } from "../std.ts";
import { CompilerOptions } from "../types.ts";
import { getRelativePath } from "./getRelativePath.ts";
import log from "../logger/logger.ts";

/** TODO: Document */
export async function recurseImports(
  { pathname, content }: { pathname: string; content: string },
  opts: CompilerOptions,
) {
  const { reactLocalPath, buildDir, reload, isBuilding } = opts;
  if (
    reactLocalPath === undefined ||
    buildDir === undefined ||
    reload === undefined ||
    isBuilding === undefined
  ) {
    return content;
  }

  let transformedContent = content;
  let matchedImports = content.match(reImportPath);
  matchedImports ||= content.match(reExportPath);
  matchedImports ||= [];

  for await (const imp of matchedImports) {
    let transformedImp = imp;

    // TODO: Match remaining string types
    // || path.match(reSingleQuotes) || path.match(reBackTicks)
    // Note: Matches contain quotes: "\"https://...\""
    const matchedURL = imp.match(doubleQuotesRegex);
    if (!matchedURL || !matchedURL[0] || !matchedURL[0].match(reHttp)) continue;

    const url = matchedURL[0];

    let to;
    if (reactUrlRegex.test(url) && reactLocalPath) {
      to = reactLocalPath;
    } else {
      to = await fetchRemote(url, opts);
    }

    const pathToAdd = !pathname.includes(".tails/_tails")
      ? opts.buildDir as string
      : path.join(opts.appRoot as string);

    const from = pathname.replace(
      opts.appRoot as string,
      pathToAdd,
    );

    transformedImp = imp.replace(
      url,
      getRelativePath(path.dirname(from), to),
    );

    transformedContent = transformedContent.replace(
      imp,
      transformedImp,
    );
  }

  return transformedContent;
}

export async function fetchRemote(url: string, opts: CompilerOptions) {
  const { buildDir, isBuilding, reload } = opts;

  let writePath = path.join(
    buildDir as string,
    url.replace(reHttp, "-/"),
  );

  if (!writePath.match(reModuleExt)) {
    writePath = writePath + ".js";
  }

  if (!isBuilding && !reload && await existsFile(writePath)) {
    return writePath;
  }

  log.debug(`Downloading ${url}`);

  const asset = await fetch(url);
  if (asset.status === 200) {
    const content = await asset.text();
    await ensureTextFile(
      writePath,
      await recurseImports({ pathname: writePath, content }, opts),
    );
  }

  return writePath;
}
