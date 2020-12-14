import { existsDirSync } from "../fs.ts";
import log from "../logger/logger.ts";
import { ensureDir, path } from "../std.ts";
import { version } from "../version.ts";
import { Configuration } from "./configuration.ts";
import { AssetHandler } from "../controller/asset_handler.ts";
import { Modules } from "../types.ts";
import { compileApplication } from "../compiler/compiler.ts";

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
    await this.compile();
    await this.assetHandler.init(this.modules);

    log.info(
      "Project loaded in " + Math.round(performance.now() - startTime) + "ms",
    );
  }

  async build() {
    const startTime = performance.now();

    await this.config.loadConfig();
    await this.compile();

    log.info(
      "Project built in " + Math.round(performance.now() - startTime) + "ms",
    );
  }

  async start() {
    const startTime = performance.now();
    await this.config.loadConfig();
    // TODO: Load manifest
    await this.assetHandler.init(this.modules);

    if (this.config.isDev) {
      // this._watch();
    }

    log.info(
      "Project started in " + Math.round(performance.now() - startTime) + "ms",
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
  }

  private async compile() {
    await compileApplication(
      this.modules,
      this.assetHandler.assetPath.bind(this.assetHandler),
      this.assetHandler.assetDir,
      this.appRoot,
    );

    console.log("COMPILED MODULES:\n");
    console.log(this.modules);
    console.log("\n");
  }
}
