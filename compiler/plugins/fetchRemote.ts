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
 * TODO:
 * 1. Download & write react
 * 2. Download react-dom
 * 3. change the import __react to the react we just downloaded path
 * 4. write react dom
 * 5. when recursing components, ensure they use the react we just downloaded
 * 6. ensure generateHTML.tsx uses those 2 packages instead of deps.ts
 */
// reactUrl: "https://esm.sh/react@17.0.1",
// reactDomUrl: "https://esm.sh/react-dom@17.0.1"
// /^(https?:\/\/[0-9a-z\.\-]+)?\/react(@[0-9a-z\.\-]+)?\/?$/i.test(dlUrl)

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

    await fetchReact(opts);

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

async function fetchReact(opts: CompilerOptions) {
  const { remoteWritePath, appRoot } = opts;
  const reactURL = "https://esm.sh/react@17.0.1";
  const reactLocalURL = reactURL.replace(reHttp, "-/");
  const reactDOMURL = "https://esm.sh/react-dom@17.0.1/server";
  const reactDOMLocalURL = reactDOMURL.replace(reHttp, "-/");

  const reactAsset = await fetch(reactURL);
  const reactWritePath = path.join(
    appRoot as string,
    remoteWritePath as string,
    reactLocalURL + ".js",
  );

  if (reactAsset.status === 200) {
    const content = await reactAsset.text();
    await ensureTextFile(
      reactWritePath,
      await recurseImports({ pathname: reactWritePath, content }, opts),
    );
  }

  const reactDOMAsset = await fetch(reactDOMURL);
  const reactDOMWritePath = path.join(
    appRoot as string,
    remoteWritePath as string,
    reactDOMLocalURL + ".js",
  );

  if (reactDOMAsset.status === 200) {
    const content = await reactDOMAsset.text();
    const transformedContent = await recurseImports(
      { pathname: reactDOMWritePath, content },
      opts,
    );
    await ensureTextFile(
      reactDOMWritePath,
      transformedContent,
    );

    const importURL = transformedContent.match(reDoubleQuotes);
    if (!importURL || !importURL[0]) {
      throw new Error("Some error occured when compiling react-dom");
    }

    const reactDomServerPath = path.join(
      path.dirname(reactDOMWritePath),
      importURL[0].slice(1, -1),
    );

    const decoder = new TextDecoder();

    let reactDOMServer = decoder.decode(
      await Deno.readFile(reactDomServerPath),
    );

    // TODO: Better regex
    reactDOMServer = reactDOMServer.replace(
      /import __react from "\/(\w+)\/(\w+)@(\w+).(\w+).(\w+)\/(\w+)\/(\w+).js"/,
      `import __react from "${reactWritePath}"`,
    );

    await ensureTextFile(reactDomServerPath, reactDOMServer);
  }
}

export default defaultPlugin;
