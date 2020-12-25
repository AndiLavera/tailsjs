import { Configuration } from "../core/configuration.ts";
import { ModuleHandler } from "../core/module_handler.ts";
import { ComponentType, Context, Router as ServerRouter } from "../deps.ts";
import { path, walk } from "../std.ts";
import { getContentType } from "../mime.ts";
import { existsFile } from "../fs.ts";
import log from "../logger/logger.ts";

export class DevelopmentAssetRouter {
  readonly serverRouter: ServerRouter;

  constructor() {
    this.serverRouter = new ServerRouter();
  }

  async setRoutes(moduleHandler: ModuleHandler, config: Configuration) {
    await this._setRoutes(moduleHandler, config);
  }

  async _setRoutes(
    moduleHandler: ModuleHandler,
    config: Configuration,
  ): Promise<void> {
    const assetFolder = path.join(config.appRoot, ".tails/src");
    const decoder = new TextDecoder("utf-8");
    const paths: string[] = [config.mainJSPath, "/bootstrap.ts"];
    const publicDir = path.join(config.appRoot, "public");
    const { modules } = moduleHandler;

    for await (const { path: staticFilePath } of walk(publicDir)) {
      if (publicDir === staticFilePath) continue;

      paths.push(staticFilePath.replace(publicDir, ""));
    }

    log.debug("JS Asset Routes:");
    Object.keys(modules).forEach((key) => {
      paths.push(key.replace("/pages", ""));
      log.debug(`  ${key.replace("/pages", "")}`);
    });

    this.serverRouter.use(async (ctx, next) => {
      const { pathname } = ctx.request.url;

      if (!paths.includes(pathname)) {
        await next();
        return;
      }

      if (pathname === "/bootstrap.ts") {
        ctx.response.type = "application/javascript";
        ctx.response.body = moduleHandler.bootstrap;
        return;
      }

      if (pathname === config.mainJSPath) {
        ctx.response.type = "application/javascript";
        ctx.response.body = config.mainJS;
        return;
      }

      let assetPath = path.join(assetFolder, pathname);

      if (await existsFile(assetPath)) {
        ctx.response.type = getContentType(pathname);
        ctx.response.body = await fetchAsset(assetPath, decoder);
        return;
      }

      assetPath = path.join(assetFolder, "pages", pathname);

      if (await existsFile(assetPath)) {
        ctx.response.type = getContentType(pathname);
        ctx.response.body = await fetchAsset(assetPath, decoder);
        return;
      }

      // TODO: Move public files into .tails during compilation
      assetPath = path.join(config.appRoot, "public", pathname);

      if (await existsFile(assetPath)) {
        ctx.response.type = getContentType(pathname);
        ctx.response.body = await fetchAsset(assetPath, decoder);
        return;
      }

      log.error(`COULD NOT FIND ASSET FOR ${pathname}`);
    });

    paths.forEach((pathName) => this.serverRouter.get(pathName));
  }
}

async function fetchAsset(
  pathName: string,
  decoder: TextDecoder,
): Promise<string> {
  const data = await Deno.readFile(pathName);
  return decoder.decode(data);
}
