import { Configuration } from "../core/configuration.ts";
import { ModuleHandler } from "../core/module_handler.ts";
import { Router as OakRouter } from "../deps.ts";
import { Context } from "../deps.ts";
import { isWebSocketCloseEvent, path, walk } from "../std.ts";
import log from "../logger/logger.ts";
import { getContentType } from "../mime.ts";
import { injectHMR } from "../hmr/injectHMR.ts";
import util from "../core/utils.ts";

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

    if (this.config.mode === "development") {
      await this.handleHMR(decoder);
    }

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

      const file = await this.fetchAsset(staticFilePath, decoder);
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
        try {
          let module = this.moduleHandler.modules[moduleKey].module;
          if (this.config.mode === "development") {
            module = injectHMR(moduleKey, module);
          }

          context.response.type = getContentType(route);
          context.response.body = module;
        } catch (error) {
          log.error(error);
        }
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

  private async handleHMR(decoder: TextDecoder) {
    this.router.get("/_hmr", async (ctx) => {
      const watcher = this.moduleHandler.addEventListener();
      const socket = await ctx.upgrade();

      for await (const event of socket) {
        if (typeof event === "string") {
          log.debug("WS", JSON.parse(event));

          const data = JSON.parse(event);
          if (data.type === "hotAccept" && util.isNEString(data.id)) {
            const mod = this.moduleHandler.modules[data.id];

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

    const hmrData = await Deno.readFile("./hmr/hmr.ts");
    const eventData = await Deno.readFile("./hmr/events.ts");

    const hmrContent = await Deno.transpileOnly({
      "hmr.ts": decoder.decode(hmrData),
      "events.ts": decoder.decode(eventData),
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
}
