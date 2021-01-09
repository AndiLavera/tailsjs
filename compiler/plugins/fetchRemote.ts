import {
  reDoubleQuotes,
  reExportPath,
  reHttp,
  reImportPath,
} from "../../core/utils.ts";
import { ensureTextFile } from "../../fs.ts";
import { path } from "../../std.ts";
import { CompilerOptions, CompilerPlugin } from "../../types.ts";

/**
 * Handles converting non `.js` local import paths
 * to `.js`.
 */
const defaultPlugin: CompilerPlugin = {
  name: "fetch-remote",
  test: /\.(jsx|mjs|tsx|ts|js?)/g,
  acceptHMR: true,
  transform: async ({ pathname, content }, opts: CompilerOptions) => {
    const { remoteWritePath, writeRemote } = opts;
    if (!writeRemote && !remoteWritePath) {
      return content;
    }

    return await recurseImports({ pathname, content }, opts);
  },
};

async function recurseImports(
  { pathname, content }: { pathname: string; content: string },
  opts: CompilerOptions,
) {
  let matchedImports = content.match(reImportPath);
  matchedImports ||= content.match(reExportPath);
  matchedImports ||= [];
  let transformedContent = content;

  for await (const imp of matchedImports) {
    let transformedImp = imp;

    // TODO: Match remaining string types
    // || path.match(reSingleQuotes) || path.match(reBackTicks)
    const importURL = imp.match(reDoubleQuotes);
    if (!importURL || !importURL[0] || !importURL[0].match(reHttp)) continue;

    transformedImp = imp.replace(
      importURL[0],
      await fetchRemote(importURL[0], opts),
    );

    transformedContent = transformedContent.replace(
      imp,
      transformedImp,
    );
  }

  return transformedContent;
}

async function fetchRemote(url: string, opts: CompilerOptions) {
  console.log(url);
  const { remoteWritePath } = opts;
  // Strip quotes from string
  const cleanURL = url.slice(1, -1);
  const writePath = path.join(
    remoteWritePath as string,
    cleanURL.replace(reHttp, "-/") + ".js",
  );

  const asset = await fetch(cleanURL);
  if (asset.status === 200) {
    const content = await asset.text();
    // console.log(
    //   await recurseImports({ pathname: writePath, content }, opts),
    // );

    await ensureTextFile(
      writePath,
      await recurseImports({ pathname: writePath, content }, opts),
    );
    // console.log(await asset.text());
  }

  return url;
}

export default defaultPlugin;
