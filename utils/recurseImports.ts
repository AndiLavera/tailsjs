import {
  doubleQuotesRegex,
  reExportPath,
  reHttp,
  reImportPath,
  reModuleExt,
  urlRegex,
} from "../core/utils.ts";
import { ensureTextFile } from "../fs.ts";
import { path } from "../std.ts";
import { CompilerOptions } from "../types.ts";
import { getRelativePath } from "./getRelativePath.ts";

/** TODO: Document */
export async function recurseImports(
  { pathname, content }: { pathname: string; content: string },
  opts: CompilerOptions,
) {
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
    if (urlRegex.test(url) && opts.reactLocalPath) {
      to = opts.reactLocalPath;
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
  const { buildDir } = opts;
  const cleanURL = url;

  let writePath = path.join(
    buildDir as string,
    cleanURL.replace(reHttp, "-/"),
  );

  if (!writePath.match(reModuleExt)) {
    writePath = writePath + ".js";
  }

  const asset = await fetch(cleanURL);
  if (asset.status === 200) {
    const content = await asset.text();
    await ensureTextFile(
      writePath,
      await recurseImports({ pathname: writePath, content }, opts),
    );
  }

  return writePath;
}
