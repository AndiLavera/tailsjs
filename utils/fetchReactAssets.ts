import { Configuration } from "../core/configuration.ts";
import {
  __reactRegex,
  doubleQuotesRegex,
  reHttp,
  reModuleExt,
} from "../core/utils.ts";
import { ensureTextFile, existsFile } from "../fs.ts";
import { path } from "../std.ts";
import { getRelativePath } from "./getRelativePath.ts";
import { recurseImports } from "./recurseImports.ts";
import log from "../logger/logger.ts";

// TODO: Both react & react dev get written as the same file name
// if you "build" & then run dev, react-refresh will break because
// react will be the production version while refresh is the dev version.

/**
 * Handles fetching react, react-dom, react-dom server & react
 * refresh runtime, compiling them locally & rewriting import
 * paths to the local version.
 *
 * @param config
 */
export async function fetchReactAssets(config: Configuration) {
  const { reactUrl, reactDomUrl, reactHmrUrl } = config;

  const reactWritePath = await compileRemoteAsset({
    url: reactUrl,
    acceptsDev: true,
    config,
  });

  /**
   * Callback invoked after writing the package locally. This
   * handles fetching the local file and rewriting the "react"
   * import to that of the local version.
   *
   * @param content
   * @param writePath
   */
  const reactDomCallback = async (content: string, writePath: string) => {
    const importURL = content.match(doubleQuotesRegex);
    if (!importURL || !importURL[0]) {
      throw new Error("Some error occured when compiling react-dom");
    }

    const reactDOMPath = path.join(
      path.dirname(writePath),
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
  };

  const reactDOMWritePath = await compileRemoteAsset({
    url: reactDomUrl,
    acceptsDev: true,
    config,
    callback: reactDomCallback,
  });

  const reactServerWritePath = await compileRemoteAsset({
    url: reactDomUrl + "/server",
    acceptsDev: true,
    config,
    callback: reactDomCallback,
  });

  let reactHmrWritePath;

  if (config.isDev) {
    reactHmrWritePath = await compileRemoteAsset({
      url: reactHmrUrl,
      acceptsDev: true,
      config,
    });
  }

  return {
    reactDOMWritePath,
    reactWritePath,
    reactServerWritePath,
    reactHmrWritePath,
  };
}

/**
 * Handles recursively fetching remote assets & rewriting
 * their import paths to that of the local version. Accepts
 * a callback to handle "after writing" behavior. **NOTE:**
 * if the file exists locally, it will not be fetched again
 * unless the project is `building` or `--reload` flag was
 * used.
 *
 * @param opts
 */
export async function compileRemoteAsset(
  { url, acceptsDev, config, callback }: {
    url: string;
    acceptsDev: boolean;
    config: Configuration;
    callback?: (content: string, writePath: string) => Promise<void>;
  },
) {
  const { appRoot, mode, buildDir } = config;
  const opts = {
    appRoot,
    reactLocalPath: config.reactUrl,
    reactDomLocalPath: config.reactDomUrl,
    buildDir: config.buildDir,
    isBuilding: config.isBuilding,
    reload: config.reload,
  };

  let remoteURL = url;
  if (acceptsDev && mode === "development") {
    remoteURL = remoteURL + "?dev";
  }

  const localUrl = remoteURL
    .replace(reHttp, "-/")
    .replace("?dev", ".development");
  let writePath = path.join(buildDir, localUrl);
  if (!writePath.match(reModuleExt)) {
    writePath = writePath + ".js";
  }

  if (!config.isBuilding && !config.reload && await existsFile(writePath)) {
    return writePath;
  }

  log.debug(`Downloading ${remoteURL}`);
  const asset = await fetch(remoteURL);

  if (asset.status === 200) {
    const content = await asset.text();
    const transformedContent = await recurseImports(
      { pathname: writePath, content },
      opts,
    );
    await ensureTextFile(
      writePath,
      transformedContent,
    );

    if (callback) {
      await callback(transformedContent, writePath);
    }
  }

  return writePath;
}
