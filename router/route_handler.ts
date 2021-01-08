import { Router as ServerRouter } from "../deps.ts";
import { Configuration } from "../core/configuration.ts";
import { path } from "../std.ts";
import { APIModules, Routes, WebModules } from "../types.ts";
import { ModuleHandler } from "../modules/module_handler.ts";
import APIRouter, { loadAPIModule } from "./api_router.ts";
import AssetRouter from "./asset_router.ts";
import { loadWebModule, WebRouter } from "./web_router.ts";
import { reModuleExt } from "../core/utils.ts";
import { existsFileSync } from "../fs.ts";

export class RouteHandler {
  routes: Routes;

  readonly apiModules: APIModules;
  readonly webModules: WebModules;
  readonly serverRouters: ServerRouter[];
  readonly controllersDir: string;
  readonly pagesDir: string;

  private readonly config: Configuration;
  private readonly assetRouter: AssetRouter;
  private readonly webRouter: WebRouter;
  private readonly apiRouter: APIRouter;
  private readonly moduleHandler: ModuleHandler;

  constructor(
    config: Configuration,
    moduleHandler: ModuleHandler,
  ) {
    this.apiModules = {};
    this.webModules = {};
    this.serverRouters = [];

    this.controllersDir = path.join(config.appRoot, ".tails/src/controllers");
    this.pagesDir = path.join(config.appRoot, ".tails/src/pages");

    this.config = config;
    this.moduleHandler = moduleHandler;

    this.assetRouter = new AssetRouter(config, moduleHandler);
    this.apiRouter = new APIRouter(config, moduleHandler, this.apiModules);
    this.webRouter = new WebRouter(config, moduleHandler, this.webModules);

    this.routes = {
      api: {
        middleware: [],
        routes: [],
      },
      web: {
        middleware: [],
        routes: [],
      },
    };
  }

  get _staticRoutes(): string[] {
    const staticRoutes: string[] = [];
    this.routes.web.routes.forEach((route) => {
      if (route.ssg) {
        staticRoutes.push(`pages/${route.page}`);
      }
    });

    return staticRoutes;
  }

  async init(): Promise<void> {
    await this.prepareRouter();
  }

  async prepareRouter(): Promise<void> {
    const routePath = path.join(this.config.appRoot, "config/routes.ts");
    if (existsFileSync(routePath)) {
      const { default: routes } = await import("file://" + routePath);
      this.routes = routes;
    } else {
      throw new Error(
        "Could not find routes file. Should be found at config/routes.ts",
      );
    }
  }

  async build(): Promise<void> {
    await this.loadModules();
    this.apiRouter.setRoutes(this.routes.api);
    this.webRouter.setRoutes(this.routes.web);
    await this.assetRouter.setRoutes();

    this.serverRouters.push(this.apiRouter.router);
    this.serverRouters.push(this.webRouter.router);
    this.serverRouters.push(this.assetRouter.router);
  }

  async reloadModule(pathname: string) {
    const srcPath = pathname
      .replace(this.config.srcDir, "")
      .replace(reModuleExt, ".js");

    if (srcPath.includes("/controllers")) {
      for await (const route of this.routes.api.routes) {
        const { controller, path } = route;

        if (srcPath.includes(controller)) {
          delete this.apiModules[path];
        }
      }

      for await (const route of this.routes.web.routes) {
        const { controller, path } = route;

        if (controller && srcPath.includes(controller)) {
          delete this.webModules[path];
        }
      }
    }

    if (srcPath.includes("/pages")) {
      for await (const route of this.routes.web.routes) {
        const { page, path } = route;

        if (srcPath.includes(page)) {
          delete this.webModules[path];
        }
      }
    }
  }

  private async loadModules() {
    if (this.config.mode === "production") {
      await this.loadAPIModules();
      await this.loadWebModules();
    }
  }

  private async loadWebModules() {
    for await (const route of this.routes.web.routes) {
      await loadWebModule(route, this.moduleHandler, this.webModules);
    }
  }

  /**
   * Handles iterating over api routes & importing each module.
   * Used for starting the production server.
   */
  private async loadAPIModules() {
    for await (const route of this.routes.api.routes) {
      await loadAPIModule(route, this.moduleHandler, this.apiModules);
    }
  }
}
