import { ComponentType, Router as ServerRouter } from "../deps.ts";
import { Configuration } from "../core/configuration.ts";
import { path } from "../std.ts";
import { APIRoute, Routes, WebRoute } from "../types.ts";
import { ModuleHandler } from "../core/module_handler.ts";
import APIRouter from "./api_router.ts";
import AssetRouter from "./asset_router.ts";
import Controller from "./controller.ts";
import { WebRouter } from "./web_router.ts";
import { dynamicImport } from "../utils/dynamicImport.ts";

interface WebModule {
  // deno-lint-ignore no-explicit-any
  page: ComponentType<any>;
  controller: new () => Controller;
}

export type APIModules = Record<string, new () => Controller>;
export type WebModules = Record<string, WebModule>;

export class RouteHandler {
  routes: Routes;

  readonly apiModules: APIModules;
  readonly webModules: WebModules;
  readonly serverRouters: ServerRouter[];
  readonly routesPath: string;
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
    this.routesPath = path.join(config.appRoot, "config/routes.ts");

    this.config = config;
    this.moduleHandler = moduleHandler;

    this.assetRouter = new AssetRouter(config, moduleHandler);
    this.apiRouter = new APIRouter(config, moduleHandler);
    this.webRouter = new WebRouter(config, moduleHandler);

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
    try {
      const { routes } = await import(this.routesPath);
      this.routes = routes;
    } catch (error) {
      throw new Error("Could not find routes file.");
    }
  }

  async build(): Promise<void> {
    await this.loadModules();
    this.apiRouter.setRoutes(this.routes.api, this.apiModules);
    this.webRouter.setRoutes(this.routes.web, this.webModules);
    await this.assetRouter.setRoutes();

    this.serverRouters.push(this.apiRouter.router);
    this.serverRouters.push(this.webRouter.router);
    this.serverRouters.push(this.assetRouter.router);
  }

  async loadAPIModule(route: APIRoute) {
    const importPath = path.join(
      this.controllersDir,
      `${route.controller}.js`,
    );

    try {
      const controller = (await dynamicImport(importPath)).default;
      this.apiModules[route.path] = controller;
    } catch {
      throw new Error(
        `Could not load api route module: ${route.controller}. Path: ${importPath}`,
      );
    }
  }

  async loadWebModule(route: WebRoute) {
    const { controller: controllerName, method, page } = route;

    const pagePath = path.join(
      this.pagesDir,
      `${page}.js`,
    );

    let controllerPath;
    if (controllerName && method) {
      controllerPath = path.join(
        this.controllersDir,
        `${controllerName}.js`,
      );
    }

    let controller;
    try {
      const page = (await dynamicImport(pagePath)).default;
      if (controllerPath) {
        controller = (await dynamicImport(controllerPath)).default;
      }

      this.webModules[route.path] = {
        page,
        controller,
      };
    } catch {
      throw new Error(
        `Could not load api route module: ${route.controller}. Path: ${pagePath}`,
      );
    }
  }

  async reloadModule(pathname: string) {
    const filePath = pathname.replace(this.config.srcDir, "");
    const importedModules: Record<string, any> = {};

    if (filePath.includes("/controllers")) {
      for await (const route of this.routes.api.routes) {
        if (
          filePath.includes(route.controller) && !importedModules[route.path]
        ) {
          await this.loadAPIModule(route);
          importedModules[route.controller] = this.apiModules[route.path];
        } else if (importedModules[route.path]) {
          this.apiModules[route.path] = importedModules[route.controller];
        }
      }

      for await (const route of this.routes.web.routes) {
        const { controller } = route;

        if (
          controller &&
          filePath.includes(controller) &&
          !importedModules[controller]
        ) {
          console.log(importedModules);
          console.log("importing web module");
          await this.loadWebModule(route);
        } else if (importedModules[`${controller}`]) {
          this.webModules[route.path].controller =
            importedModules[`${controller}`];
        }
      }
    }

    if (filePath.includes("/pages")) {
      for await (const route of this.routes.web.routes) {
        const { controller } = route;
        if (controller && filePath.includes(controller)) {
          this.loadWebModule(route);
        }
      }
    }
  }

  private async loadModules() {
    await this.loadAPIModules();
    await this.loadWebModules();
  }

  private async loadWebModules() {
    for await (const route of this.routes.web.routes) {
      await this.loadWebModule(route);
    }
  }

  private async loadAPIModules() {
    for await (const route of this.routes.api.routes) {
      await this.loadAPIModule(route);
    }
  }
}
