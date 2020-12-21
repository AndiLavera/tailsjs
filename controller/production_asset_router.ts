import { Configuration } from "../core/configuration.ts";
import { ModuleHandler } from "../core/module_handler.ts";
import { ComponentType, Context, Router as ServerRouter } from "../deps.ts";
import { path, walk } from "../std.ts";
import { getContentType } from "../mime.ts";

export class ProductionAssetRouter {
  readonly serverRouter: ServerRouter;

  constructor() {
    this.serverRouter = new ServerRouter();
  }

  async setRoutes(moduleHandler: ModuleHandler, config: Configuration) {
    this.setJSRoutes(moduleHandler, config);
    await this.setPublicRoutes(config.appRoot);
  }

  private setJSRoutes(
    moduleHandler: ModuleHandler,
    config: Configuration,
  ): void {
    const { modules } = moduleHandler;

    console.log("JS ASSET ROUTES:\n");
    Object.keys(modules).forEach((key) => {
      const file = modules[key].module;
      const path = key
        .replace("/pages", "");

      console.log(path);

      this.serverRouter.get(
        path,
        (context: Context) => {
          context.response.type = "application/javascript";
          context.response.body = file;
        },
      );
    });

    console.log("\n");

    this.serverRouter
      .get(config.mainJSPath, (context: Context) => {
        context.response.type = "application/javascript";
        context.response.body = config.mainJS;
      })
      .get("/bootstrap.ts", (context: Context) => {
        context.response.type = "application/javascript";
        context.response.body = moduleHandler.bootstrap;
      });
  }

  async setPublicRoutes(appRoot: string) {
    const dir = path.join(appRoot, "public");
    const decoder = new TextDecoder("utf-8");

    for await (const { path: staticFilePath } of walk(dir)) {
      if (dir === staticFilePath) continue;

      const routePath = staticFilePath.replace(dir, "");
      const data = await Deno.readFile(staticFilePath);
      const file = decoder.decode(data);

      this.serverRouter.get(
        routePath,
        (context: Context) => {
          context.response.type = getContentType(routePath);
          context.response.body = file;
        },
      );
    }
  }
}
