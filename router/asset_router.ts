import { Configuration } from "../core/configuration.ts";
import { ModuleHandler } from "../modules/module_handler.ts";
import { Router as OakRouter } from "../deps.ts";
import { Context } from "../deps.ts";
import { path, walk } from "../std.ts";
import { cache } from "https://deno.land/x/cache@0.2.9/mod.ts";
import log from "../logger/logger.ts";
import { getContentType } from "../mime.ts";
import { injectHMR } from "../hmr/injectHMR.ts";
import util from "../core/utils.ts";
import Module from "../modules/module.ts";
import { version } from "../version.ts";

export default class AssetRouter {
  readonly router: OakRouter;
  private readonly config: Configuration;
  private readonly moduleHandler: ModuleHandler;
  private readonly decoder: TextDecoder;

  constructor(config: Configuration, moduleHandler: ModuleHandler) {
    this.config = config;
    this.moduleHandler = moduleHandler;
    this.decoder = new TextDecoder("utf-8");
    this.router = new OakRouter();
  }

  async setRoutes() {
    // setStaticMiddleware(this.router);
    if (this.config.mode === "development") {
      this.handleHMR();
      await this.setHMRAssetRoutes();
    }

    await this.setDefaultRoutes();
    await this.setAssetRoutes();
  }

  private async setDefaultRoutes() {
    let bootstrap = await this.fetchTailsAsset("/browser/bootstrap.js");
    const reactPath = this.config.reactWritePath?.replace(
      this.config.buildDir,
      "",
    );
    const reactDOMPath = this.config.reactDOMWritePath?.replace(
      this.config.buildDir,
      "",
    );
    if (this.config.mode === "development") {
      bootstrap = `
      import "./_hmr.ts";
      import React from "${reactPath}";
      import { hydrate } from "${reactDOMPath}";
      ` + bootstrap;

      // TODO: To remove after updating versions
      bootstrap = bootstrap.replace(
        `import React from "https://esm.sh/react@17.0.1?dev";`,
        "",
      );
      bootstrap = bootstrap.replace(
        `import { hydrate } from "https://esm.sh/react-dom@17.0.1?dev";`,
        "",
      );
    }

    this.router.get("/bootstrap.js", (context: Context) => {
      context.response.type = "application/javascript";
      context.response.body = bootstrap;
    });

    this.router.get(this.config.mainJSPath, (context: Context) => {
      context.response.type = "application/javascript";
      context.response.body = this.config.mainJS;
    });
  }

  private async setAssetRoutes() {
    const buildDir = this.config.buildDir;

    log.debug("JS Asset Routes:");
    for await (const { path: assetFilePath } of walk(buildDir)) {
      if (assetFilePath.includes("/server/")) continue;

      if ((await Deno.lstat(assetFilePath)).isDirectory) continue;

      const route = assetFilePath
        .replace(buildDir, "")
        .replace("/app", "")
        .replace("/pages", "")
        .replace("/public", "");

      log.debug(route);

      this.router.get(route, async (context: Context) => {
        context.response.type = getContentType(route);

        const file = await this.fetchStaticAsset(assetFilePath);
        if (this.config.mode === "production") {
          context.response.body = file;
          return;
        }

        context.response.body = assetFilePath.includes("/app/")
          ? injectHMR(assetFilePath.replace(buildDir, ""), file)
          : file;
      });
    }
  }

  private handleHMR() {
    this.router.get("/_hmr", async (ctx) => {
      const watcher = this.moduleHandler.addEventListener();
      const socket = await ctx.upgrade();

      for await (const event of socket) {
        if (typeof event === "string") {
          log.debug("WS", JSON.parse(event));

          const data = JSON.parse(event);
          if (data.type === "hotAccept" && util.isNEString(data.id)) {
            const mod = this.moduleHandler.get(data.id);

            if (mod) {
              const callback = async () => {
                if (socket.isClosed) return;

                await socket.send(
                  JSON.stringify({
                    type: "update",
                    moduleId: data.id,
                    updateUrl: data.id.replace("/app/pages", ""),
                  }),
                );
              };

              watcher.on("modify-" + data.id, callback);
            }
          }
        }
      }
    });
  }

  private async setHMRAssetRoutes() {
    const hmrData = await this.fetchTailsAsset("/hmr/hmr.ts");
    const eventData = await this.fetchTailsAsset("/hmr/events.ts");
    const hmrContent = await Deno.transpileOnly({
      "hmr.ts": hmrData,
      "events.ts": eventData,
    });

    const reactHmrPath = this.config.reactHmrWritePath?.replace(
      this.config.buildDir,
      "",
    );

    let hmrSource = hmrContent["hmr.ts"].source;

    hmrSource = hmrSource.replace(
      'import runtime from "https://esm.sh/react-refresh@0.8.3/runtime?dev";',
      `import runtime from "${reactHmrPath}";`,
    );

    this.router.get("/_hmr.ts", (context: Context) => {
      context.response.type = "application/javascript";
      context.response.body = hmrSource;
    });

    this.router.get("/events.ts", (context: Context) => {
      context.response.type = "application/javascript";
      context.response.body = hmrContent["events.ts"].source;
    });
  }

  private async fetchTailsAsset(pathname: string): Promise<string> {
    const file = await cache(
      "https://deno.land/x/tails@v" + version + pathname,
    );

    return await Deno.readTextFile(file.path);
  }

  private async fetchStaticAsset(pathName: string): Promise<string> {
    const data = await Deno.readFile(pathName);
    return this.decoder.decode(data);
  }
}
