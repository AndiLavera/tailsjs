import { Configuration } from "../core/configuration.ts";
import { ModuleHandler } from "../core/module_handler.ts";
import { Router as OakRouter } from "../deps.ts";
import { Context } from "../deps.ts";
import { path, walk } from "../std.ts";
import log from "../logger/logger.ts";
import { getContentType } from "../mime.ts";
import { injectHMR } from "../hmr/injectHMR.ts";
import { acceptWebSocket } from "https://deno.land/std@0.82.0/ws/mod.ts";
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
    const watcher = this.moduleHandler.addEventListener();

    /**
     * HMR
     */
    const hmrData = await Deno.readFile("./hmr/hmr.ts");
    const eventData = await Deno.readFile("./hmr/events.ts");

    const hmrContent = await Deno.transpileOnly({
      "hmr.ts": decoder.decode(hmrData),
      "events.ts": decoder.decode(eventData),
    });
    this.router.get("/_hmr", async (ctx) => {
      const socket = await ctx.upgrade();

      for await (const event of socket) {
        if (typeof event === "string") {
          console.log("ws:Text", event);

          const data = JSON.parse(event);
          if (data.type === "hotAccept" && util.isNEString(data.id)) {
            const mod = this.moduleHandler.modules[data.id];

            if (mod) {
              watcher.on(
                "modify-" + data.id,
                async () => {
                  await socket.send(
                    JSON.stringify({
                      type: "update",
                      moduleId: data.id,
                      updateUrl: data.id.replace("/pages", ""),
                    }),
                  );
                },
              );
            }
          }
        }
      }
    });

    this.router.get("/_hmr.ts", (context: Context) => {
      context.response.type = "application/javascript";
      context.response.body = hmrContent["hmr.ts"].source;
    });

    this.router.get("/events.ts", (context: Context) => {
      context.response.type = "application/javascript";
      context.response.body = hmrContent["events.ts"].source;
    });
    /**
     * End of HMR
     */

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
        context.response.type = getContentType(route);

        let module = this.moduleHandler.modules[moduleKey].module;
        if (this.config.mode === "development") {
          module = injectHMR(moduleKey, module);
        }
        context.response.body = module;
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
