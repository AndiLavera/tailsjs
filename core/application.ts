import { existsDirSync } from "../fs.ts";
import log from "../logger/logger.ts";
import { ensureDir, path } from "../std.ts";
import { version } from "../version.ts";
import { Configuration } from "./configuration.ts";
import { RouteHandler } from "../controller/route_handler.ts";
import { ModuleHandler } from "./module_handler.ts";
import { ProductionAssetRouter } from "../controller/production_asset_router.ts";
// import { ProductionWebRouter } from "../controller/web_router.ts";

export class Application {
  readonly config: Configuration;
  readonly appRoot: string;
  readonly moduleHandler: ModuleHandler;
  private readonly routeHandler: RouteHandler;
  private readonly mode: "test" | "development" | "production";
  private readonly reload: boolean;

  constructor(
    appDir: string,
    mode: "test" | "development" | "production",
    reload = false,
    building = false,
  ) {
    this.appRoot = path.resolve(appDir);
    this.mode = mode;
    this.reload = reload;
    this.config = new Configuration(appDir, mode, building);
    this.moduleHandler = new ModuleHandler(this.config);
    this.routeHandler = this.fetchRouteHandler();
  }

  get buildDir() {
    return path.join(
      this.appRoot,
      ".tails",
      this.mode + "." + this.config.buildTarget,
    );
  }

  get routers() {
    return this.routeHandler.serverRouters;
  }

  /**
   * Handles loading configuration files, ensuring the users
   * project is following our conventions, compiling the project
   * & setting all the proper routes.
   */
  async ready(): Promise<void> {
    const startTime = performance.now();

    await this.config.loadConfig();
    await this.init(this.reload);

    await this.moduleHandler.init();
    await this.routeHandler.init();

    const compilationTime = performance.now();
    const staticRoutes = this.routeHandler._staticRoutes;

    await this.moduleHandler.build(staticRoutes);
    log.info(
      `Compliation time: ${Math.round(performance.now() - compilationTime)}ms`,
    );

    await this.routeHandler.build();

    log.info(
      `Project loaded in ${Math.round(performance.now() - startTime)}ms`,
    );

    this.moduleHandler.watch(this.routeHandler, staticRoutes);
  }

  /**
   * Handles loading configuration files, ensuring the users
   * project is following our conventions & compiling the project.
   */
  async build(): Promise<void> {
    const startTime = performance.now();

    await this.config.loadConfig();
    await this.init(this.reload);

    await this.moduleHandler.init({ building: true });
    await this.routeHandler.init();

    await this.moduleHandler.build(this.routeHandler._staticRoutes);

    log.info(
      "Project built in " + Math.round(performance.now() - startTime) + "ms",
    );
  }

  /**
   * Handles loading configuration files, loading the users
   * project from the compiled `manifest.json` & setting all
   * the proper routes.
   */
  async start(): Promise<void> {
    const startTime = performance.now();
    await this.config.loadConfig();
    await this.moduleHandler.init();
    await this.routeHandler.init();
    await this.routeHandler.build();

    log.info(
      "Project started in " + Math.round(performance.now() - startTime) + "ms",
    );
  }

  private async init(reload: boolean): Promise<void> {
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

    if (this.config.isDev) {
      // this._watch();
    }
  }

  fetchRouteHandler(): RouteHandler {
    if (this.mode === "development") {
      return new RouteHandler(this.config, this.moduleHandler);
    }

    return new RouteHandler(
      this.config,
      this.moduleHandler,
    );
  }
}
