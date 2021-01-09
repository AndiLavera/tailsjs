import { Configuration } from "../core/configuration.ts";
import { __reactRegex, doubleQuotesRegex, reHttp } from "../core/utils.ts";
import { ensureTextFile } from "../fs.ts";
import { path } from "../std.ts";
import { getRelativePath } from "./getRelativePath.ts";
import { recurseImports } from "./recurseImports.ts";

/**
 * Handles fetching react & writing it, fetching reactDOMServer,
 * mutating the import to that of the local react and then writing it,
 * finally injects the local paths for both into opts
 *
 * @param opts
 */
export async function fetchReactAssets(config: Configuration) {
  const { appRoot, mode, buildDir } = config;
  const reactURL = "https://esm.sh/react@17.0.1";
  const reactLocalURL = reactURL.replace(reHttp, "-/");
  const reactDOMURL = "https://esm.sh/react-dom@17.0.1";
  const reactDOMLocalURL = reactDOMURL.replace(reHttp, "-/");
  const reactServerURL = "https://esm.sh/react-dom@17.0.1/server";
  const reactServerLocalURL = reactServerURL.replace(reHttp, "-/");
  const opts = {
    appRoot,
    reactLocalPath: config.reactDomUrl,
    remoteWritePath: config.buildDir.replace(appRoot, ""),
  };

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

    const importURL = transformedContent.match(doubleQuotesRegex);
    if (!importURL || !importURL[0]) {
      throw new Error("Some error occured when compiling react-dom");
    }

    const reactDOMPath = path.join(
      path.dirname(reactDOMWritePath),
      importURL[0],
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
      __reactRegex,
      `import __react from "${relativePath}"`,
    );

    await ensureTextFile(reactDOMPath, reactDOMFile);
  }

  const reactServerAsset = await fetch(
    mode === "development" ? (reactServerURL + "?dev") : reactServerURL,
  );
  const reactServerWritePath = path.join(
    buildDir,
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

    const importURL = transformedContent.match(doubleQuotesRegex);
    if (!importURL || !importURL[0]) {
      throw new Error("Some error occured when compiling react-dom");
    }

    const reactServerPath = path.join(
      path.dirname(reactServerWritePath),
      importURL[0],
    );

    const decoder = new TextDecoder();

    let reactServer = decoder.decode(
      await Deno.readFile(reactServerPath),
    );

    const relativePath = getRelativePath(
      path.dirname(reactServerPath),
      reactWritePath,
    );

    reactServer = reactServer.replace(
      __reactRegex,
      `import __react from "${relativePath}"`,
    );

    await ensureTextFile(reactServerPath, reactServer);
  }

  return { reactDOMWritePath, reactWritePath, reactServerWritePath };
}
