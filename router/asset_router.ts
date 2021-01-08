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
import { setStaticMiddleware } from "./utils.ts";
import { APIRoute } from "../types.ts";

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
    await this.setPublicRoutes();
    this.setModuleRoutes();
  }

  private async setDefaultRoutes() {
    let bootstrap = await this.fetchTailsAsset("/browser/bootstrap.js");
    if (this.config.mode === "production") {
      bootstrap = bootstrap.replace('import "./_hmr.ts";\n', "")
        .replace("?dev", "")
        .replace("?dev", "");
    }

    this.router.get("/bootstrap.ts", (context: Context) => {
      context.response.type = "application/javascript";
      context.response.body = bootstrap;
    });

    this.router.get(this.config.mainJSPath, (context: Context) => {
      context.response.type = "application/javascript";
      context.response.body = this.config.mainJS;
    });
  }

  /**
   * Handles walking the users `/public` dir
   * and adding each asset to the router.
   */
  private async setPublicRoutes() {
    const publicDir = path.join(this.config.appRoot, "public");

    for await (const { path: staticFilePath } of walk(publicDir)) {
      if (publicDir === staticFilePath) continue;

      const file = await this.fetchStaticAsset(staticFilePath);
      const route = staticFilePath.replace(publicDir, "");

      this.router.get(route, (context: Context) => {
        context.response.type = getContentType(route);
        context.response.body = file;
      });
    }
  }

  private setModuleRoutes() {
    log.debug("JS Asset Routes:");
    for (const key of this.moduleHandler.keys()) {
      const route = key.replace("/pages", "");
      log.debug(`  ${route}`);

      const module = this.moduleHandler.get(key) as Module;
      if (module.map) {
        log.debug(`  ${route}.map`);
        this.router.get(`${route}.map`, (context: Context) => {
          console.log("hit map");
          try {
            context.response.type = getContentType(route);
            context.response.body = (this.moduleHandler.get(key) as Module).map;
          } catch (error) {
            log.error(error);
          }
        });
      }

      this.router.get(route, (context: Context) => {
        try {
          const module = this.moduleHandler.get(key) as Module;
          let source = module.source as string;

          // if (this.config.mode === "development") {
          //   source = injectHMR(key, source);
          // }

          if (module.map) {
            const sourceMapUrl = (route: string) => route.slice(1);

            context.response.headers.set("SourceMap", sourceMapUrl(route));
            context.response.headers.set("X-SourceMap", sourceMapUrl(route));
            source = source +
              `\n// # sourceMappingURL=${sourceMapUrl(route)}.map`;
          }

          context.response.type = getContentType(route);
          context.response.body = source;
        } catch (error) {
          log.error(error);
        }
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
                    updateUrl: data.id.replace("/pages", ""),
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

    this.router.get("/_hmr.ts", (context: Context) => {
      context.response.type = "application/javascript";
      context.response.body = hmrContent["hmr.ts"].source;
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
