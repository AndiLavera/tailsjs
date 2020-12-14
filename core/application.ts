import { existsDirSync } from "../fs.ts";
import log from "../logger/logger.ts";
import { ensureDir, path } from "../std.ts";
import { version } from "../version.ts";
import { Configuration } from "./configuration.ts";
import { AssetHandler } from "../controller/asset_handler.ts";
import { Modules } from "../types.ts";
import { compilePages, writeCompiledFiles } from "../compiler/compiler.ts";

export class Application {
  readonly config: Configuration;
  readonly appRoot: string;
  private readonly modules: Modules;
  private readonly assetHandler: AssetHandler;
  private readonly mode: "test" | "development" | "production";
  private readonly reload: boolean;

  constructor(
    appDir: string,
    mode: "test" | "development" | "production",
    reload = false,
  ) {
    this.appRoot = path.resolve(appDir);
    this.mode = mode;
    this.reload = reload;
    this.modules = {};
    this.config = new Configuration(appDir, mode);
    this.assetHandler = new AssetHandler(this.config);
  }

  // get isDev() {
  //   return this.mode === "development";
  // }

  get buildDir() {
    return path.join(
      this.appRoot,
      ".tails",
      this.mode + "." + this.config.buildTarget,
    );
  }

  get routers() {
    return this.assetHandler.serverRouters;
  }

  async ready() {
    const startTime = performance.now();
    await this.config.loadConfig();
    await this.init(this.reload);
    log.info(
      "Project loaded in " + Math.round(performance.now() - startTime) + "ms",
    );
  }

  private async init(reload: boolean) {
    const pagesDir = path.join(this.appRoot, "src/pages");

    if (!(existsDirSync(pagesDir))) {
      log.fatal(`'pages' directory not found.`);
    }

    if (reload) {
      if (existsDirSync(this.buildDir)) {
        await Deno.remove(this.buildDir, { recursive: true });
      }

      await ensureDir(this.buildDir);
    }

    await this.assetHandler.init();

    await this.compile();

    await this.assetHandler.generateJSRoutes(this.modules);

    if (this.config.isDev) {
      // this._watch();
    }
  }

  private async compile() {
    const routes = this.assetHandler.webRoutes;
    injectDefaultPages(routes);
    await compilePages(
      routes,
      this.modules,
      this.appRoot,
    );
    console.log("compile:");
    console.log(this.modules);
    await writeCompiledFiles(this.modules, this.appRoot);
  }
}

function injectDefaultPages(routes: Record<string, string>) {
  routes["/_app.tsx"] = "_app.tsx";
  // TODO: Add _document, _loading, _error
}
