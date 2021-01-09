import { reDoubleQuotes, reHttp } from "../core/utils.ts";
import { ensureTextFile } from "../fs.ts";
import { path } from "../std.ts";
import { getRelativePath } from "./getRelativePath.ts";
import { recurseImports } from "./recurseImports.ts";

// TODO: Just pass config in and use that..
/**
 * Handles fetching react & writing it, fetching reactDOMServer,
 * mutating the import to that of the local react and then writing it,
 * finally injects the local paths for both into opts
 *
 * @param opts
 */
export async function fetchReactAssets(opts: {
  remoteWritePath: string;
  appRoot: string;
  mode: string;
}) {
  const { remoteWritePath, appRoot, mode } = opts;
  const reactURL = "https://esm.sh/react@17.0.1";
  const reactLocalURL = reactURL.replace(reHttp, "-/");
  const reactDOMURL = "https://esm.sh/react-dom@17.0.1";
  const reactDOMLocalURL = reactDOMURL.replace(reHttp, "-/");
  const reactServerURL = "https://esm.sh/react-dom@17.0.1/server";
  const reactServerLocalURL = reactServerURL.replace(reHttp, "-/");
  const buildDir = path.join(
    appRoot as string,
    remoteWritePath as string,
  );

  const reactAsset = await fetch(
    mode === "development" ? (reactURL + "?dev") : reactURL,
  );
  const reactWritePath = path.join(buildDir, reactLocalURL + ".js");

  if (reactAsset.status === 200) {
    const content = await reactAsset.text();
    await ensureTextFile(
      reactWritePath,
      await recurseImports({ pathname: reactWritePath, content }, opts),
    );
  }

  const reactDOMAsset = await fetch(
    mode === "development" ? (reactDOMURL + "?dev") : reactDOMURL,
  );
  const reactDOMWritePath = path.join(buildDir, reactDOMLocalURL + ".js");

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

    const reactDOMPath = path.join(
      path.dirname(reactDOMWritePath),
      importURL[0].slice(1, -1),
    );

    const decoder = new TextDecoder();

    let reactDOMFile = decoder.decode(
      await Deno.readFile(reactDOMPath),
    );

    const relativePath = getRelativePath(
      path.dirname(reactDOMPath),
      reactWritePath,
    );

    // TODO: Better regex
    reactDOMFile = reactDOMFile.replace(
      /import __react from "\/(\w+)\/(\w+)@(\w+).(\w+).(\w+)\/(\w+)\/(\w+).js"/,
      `import __react from "${relativePath}"`,
    );
    reactDOMFile = reactDOMFile.replace(
      /import __react from "\/(\w+)\/(\w+)@(\w+).(\w+).(\w+)\/(\w+)\/(\w+).development.js"/,
      `import __react from "${relativePath}"`,
    );

    await ensureTextFile(reactDOMPath, reactDOMFile);
  }

  const reactServerAsset = await fetch(
    mode === "development" ? (reactServerURL + "?dev") : reactServerURL,
  );
  const reactServerWritePath = path.join(
    appRoot as string,
    remoteWritePath as string,
    reactServerLocalURL + ".js",
  );

  if (reactServerAsset.status === 200) {
    const content = await reactServerAsset.text();
    const transformedContent = await recurseImports(
      { pathname: reactServerWritePath, content },
      opts,
    );
    await ensureTextFile(
      reactServerWritePath,
      transformedContent,
    );

    const importURL = transformedContent.match(reDoubleQuotes);
    if (!importURL || !importURL[0]) {
      throw new Error("Some error occured when compiling react-dom");
    }

    const reactServerPath = path.join(
      path.dirname(reactServerWritePath),
      importURL[0].slice(1, -1),
    );

    const decoder = new TextDecoder();

    let reactServer = decoder.decode(
      await Deno.readFile(reactServerPath),
    );

    const relativePath = getRelativePath(
      path.dirname(reactServerPath),
      reactWritePath,
    );

    // TODO: Better regex
    reactServer = reactServer.replace(
      /import __react from "\/(\w+)\/(\w+)@(\w+).(\w+).(\w+)\/(\w+)\/(\w+).js"/,
      `import __react from "${relativePath}"`,
    );
    reactServer = reactServer.replace(
      /import __react from "\/(\w+)\/(\w+)@(\w+).(\w+).(\w+)\/(\w+)\/(\w+).development.js"/,
      `import __react from "${relativePath}"`,
    );

    await ensureTextFile(reactServerPath, reactServer);
  }

  return { reactDOMWritePath, reactWritePath, reactServerWritePath };
}
