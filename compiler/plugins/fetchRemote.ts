import {
  reDoubleQuotes,
  reExportPath,
  reHttp,
  reImportPath,
  reModuleExt,
} from "../../core/utils.ts";
import { ensureTextFile } from "../../fs.ts";
import { path } from "../../std.ts";
import { CompilerOptions, CompilerPlugin } from "../../types.ts";
import { getRelativePath } from "../../utils/getRelativePath.ts";

/**
 * Handles converting non `.js` local import paths
 * to `.js`.
 */
const defaultPlugin: CompilerPlugin = {
  name: "fetch-remote",
  test: /\.(jsx|mjs|tsx|ts|js?)/g,
  acceptHMR: true,
  transform: async ({ pathname, content }, opts: CompilerOptions) => {
    const { remoteWritePath, writeRemote, appRoot } = opts;
    if (!writeRemote && !remoteWritePath && !appRoot) {
      return content;
    }

    if (pathname.includes("/server/")) return content;

    return await recurseImports({ pathname, content }, opts);
  },
};

async function recurseImports(
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

    const to = await fetchRemote(importURL[0], opts);

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

async function fetchRemote(url: string, opts: CompilerOptions) {
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

export default defaultPlugin;
