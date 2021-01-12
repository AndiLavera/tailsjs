import { existsDirSync } from "../fs.ts";
import log from "../logger/logger.ts";
import { ensureDir, path } from "../std.ts";
import { version } from "../version.ts";
import { Configuration } from "./configuration.ts";
import { RouteHandler } from "../router/route_handler.ts";
import { ModuleHandler } from "../modules/module_handler.ts";

export class Application {
  readonly config: Configuration;
  readonly appRoot: string;
  readonly moduleHandler: ModuleHandler;
  private readonly routeHandler: RouteHandler;
  private readonly mode: "test" | "development" | "production";

  constructor(
    appDir: string,
    mode: "test" | "development" | "production",
    reload = false,
    building = false,
  ) {
    this.appRoot = path.resolve(appDir);
    this.mode = mode;
    this.config = new Configuration(appDir, mode, building, reload);
    this.moduleHandler = new ModuleHandler(this.config);
    this.routeHandler = new RouteHandler(
      this.config,
      this.moduleHandler,
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
    await this.init(this.config.reload);

    await this.routeHandler.init();
    const staticRoutes = this.routeHandler._staticRoutes;

    const compilationTime = performance.now();
    await this.moduleHandler.init(staticRoutes);
    log.info(
      `Compliation time: ${Math.round(performance.now() - compilationTime)}ms`,
    );

    // await this.moduleHandler.build(staticRoutes);

    await this.routeHandler.build();

    log.info(
      `Project loaded in ${Math.round(performance.now() - startTime)}ms`,
    );

    this.moduleHandler.watch(this.routeHandler);
  }

  /**
   * Handles loading configuration files, ensuring the users
   * project is following our conventions & compiling the project.
   */
  async build(): Promise<void> {
    const startTime = performance.now();

    await this.config.loadConfig();
    await this.init(this.config.reload);

    await this.routeHandler.init();
    const staticRoutes = this.routeHandler._staticRoutes;

    await this.moduleHandler.init(staticRoutes, { building: true });
    await this.moduleHandler.build(this.routeHandler);

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
    await this.routeHandler.init();

    await this.moduleHandler.init(this.routeHandler._staticRoutes);

    await this.routeHandler.build();
    log.info(
      "Project started in " + Math.round(performance.now() - startTime) + "ms",
    );
  }

  private async init(reload: boolean): Promise<void> {
    const pagesDir = path.join(this.appRoot, "app/pages");

    if (!(existsDirSync(pagesDir))) {
      log.fatal(`'pages' directory not found.`);
    }

    if (reload) {
      if (existsDirSync(this.config.buildDir)) {
        await Deno.remove(this.config.buildDir, { recursive: true });
      }

      await ensureDir(this.config.buildDir);
    }
  }
}
