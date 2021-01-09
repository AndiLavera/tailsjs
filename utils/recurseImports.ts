import {
  reDoubleQuotes,
  reExportPath,
  reHttp,
  reImportPath,
  reModuleExt,
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
    const importURL = imp.match(reDoubleQuotes);
    if (!importURL || !importURL[0] || !importURL[0].match(reHttp)) continue;

    let to;
    if (
      /^(https?:\/\/[0-9a-z\.\-]+)?\/react(@[0-9a-z\.\-]+)?\/?$/i.test(
        importURL[0].slice(1, -1),
      ) && opts.reactLocalPath
    ) {
      to = opts.reactLocalPath;
    } else {
      to = await fetchRemote(importURL[0], opts);
    }

    const pathToAdd = !pathname.includes(".tails/_tails")
      ? path.join(opts.appRoot as string, opts.remoteWritePath as string)
      : path.join(opts.appRoot as string);

    const from = pathname.replace(
      opts.appRoot as string,
      pathToAdd,
    );

    transformedImp = imp.replace(
      importURL[0],
      `"${getRelativePath(path.dirname(from), to)}"`,
    );

    transformedContent = transformedContent.replace(
      imp,
      transformedImp,
    );
  }

  return transformedContent;
}

export async function fetchRemote(url: string, opts: CompilerOptions) {
  const { remoteWritePath, appRoot } = opts;
  const cleanURL = url.slice(1, -1); // Strip quotes from string

  let writePath = path.join(
    appRoot as string,
    remoteWritePath as string,
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
