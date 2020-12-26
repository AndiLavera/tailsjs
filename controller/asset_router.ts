import { Configuration } from "../core/configuration.ts";
import { ModuleHandler } from "../core/module_handler.ts";
import { Router as OakRouter } from "../deps.ts";
import { Context } from "../deps.ts";
import { path, walk } from "../std.ts";
import log from "../logger/logger.ts";
import { getContentType } from "../mime.ts";

export default class AssetRouter {
  readonly router: OakRouter;
  private readonly config: Configuration;
  private readonly moduleHandler: ModuleHandler;

  constructor(config: Configuration, moduleHandler: ModuleHandler) {
    this.config = config;
    this.moduleHandler = moduleHandler;
    this.router = new OakRouter();
  }

  async setRoutes() {
    const decoder = new TextDecoder("utf-8");
    const publicDir = path.join(this.config.appRoot, "public");

    this.router.get("/bootstrap.ts", (context: Context) => {
      context.response.type = "application/javascript";
      context.response.body = this.moduleHandler.bootstrap;
    });

    this.router.get(this.config.mainJSPath, (context: Context) => {
      context.response.type = "application/javascript";
      context.response.body = this.config.mainJS;
    });

    for await (const { path: staticFilePath } of walk(publicDir)) {
      if (publicDir === staticFilePath) continue;

      const file = this.fetchAsset(staticFilePath, decoder);
      const route = staticFilePath.replace(publicDir, "");

      this.router.get(route, (context: Context) => {
        context.response.type = getContentType(route);
        context.response.body = file;
      });
    }

    log.debug("JS Asset Routes:");
    Object.keys(this.moduleHandler.modules).forEach((moduleKey) => {
      const route = moduleKey.replace("/pages", "");
      log.debug(`  ${route}`);

      this.router.get(route, (context: Context) => {
        context.response.type = getContentType(route);
        context.response.body = this.moduleHandler.modules[moduleKey].module;
      });
    });
  }

  private async fetchAsset(
    pathName: string,
    decoder: TextDecoder,
  ): Promise<string> {
    const data = await Deno.readFile(pathName);
    return decoder.decode(data);
  }
}
