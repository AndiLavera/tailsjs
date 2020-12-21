import FakeRouter from "../controller/fake_router.ts";
import { Router } from "../controller/router.ts";
import { ComponentType, Context, Router as ServerRouter } from "../deps.ts";
import { Configuration } from "../core/configuration.ts";
import { path, walk } from "../std.ts";
import { Middleware, Modules, Paths, Route } from "../types.ts";
import { setHTMLRoutes } from "../utils/setHTMLRoutes.tsx";
import { ModuleHandler } from "../core/module_handler.ts";
import { ProductionAssetRouter } from "./production_asset_router.ts";
import { DevelopmentAssetRouter } from "./development_asset_router.ts";

type AssetRouter = ProductionAssetRouter | DevelopmentAssetRouter;

// TODO: For dev mode, fetch modules on each route hit for ModuleHandler#watch
// Prod mode should load everything into routes like current set up
export class RouteHandler {
  router: Router;

  readonly serverRouters: ServerRouter[];

  private readonly config: Configuration;
  private readonly assetRouter: AssetRouter;
  #moduleHandler: ModuleHandler;

  constructor(
    config: Configuration,
    moduleHandler: ModuleHandler,
    assetRouter: AssetRouter = new DevelopmentAssetRouter(),
  ) {
    this.config = config;
    this.serverRouters = [];
    this.assetRouter = assetRouter;
    this.router = new FakeRouter();
    this.#moduleHandler = moduleHandler;
  }

  get _allStaticRoutes(): string[] {
    return this.router._allStaticRoutes;
  }

  async init(): Promise<void> {
    await this.prepareRouter();
  }

  async prepareRouter(): Promise<void> {
    const routesPath = path.join(this.config.appRoot, "config/routes.ts");
    const { default: routes } = await import("file://" + routesPath);

    const router = new routes();
    router.drawRoutes();
    this.router = router;
  }

  async build(): Promise<void> {
    await this.setUserRoutes();
    await this.assetRouter.setRoutes(
      this.#moduleHandler,
      this.config,
    );

    this.serverRouters.push(this.assetRouter.serverRouter);
  }

  private async setUserRoutes(): Promise<void> {
    const pipelines = this.router._pipelines;

    for await (const key of Object.keys(pipelines)) {
      const pipeline = pipelines[key];
      const router = new ServerRouter();

      this.setMiddleware(pipeline.middleware, router);
      await this.setStaticMiddleware(router);

      this.setRoutes(pipeline.paths, router, key);
      this.serverRouters.push(router);
    }
  }

  private setMiddleware(middlewares: Middleware, router: ServerRouter): void {
    middlewares
      .forEach((middleware) => router.use(middleware));
  }

  async setStaticMiddleware(router: ServerRouter): Promise<void> {
    for await (
      const { path } of walk("middleware", { exts: [".ts", ".js"] })
    ) {
      const module = await import("../" + path);
      if (module.default) {
        router.use(module.default);
      }
    }
  }

  // TODO: Implement other http methods
  // TODO: Too many arguments
  private setRoute(
    routes: Record<string, Route>,
    router: ServerRouter,
    httpMethod: string,
    pipeline: string,
  ): void {
    switch (httpMethod) {
      case "get":
        if (pipeline === "web") {
          setHTMLRoutes(
            this,
            this.#moduleHandler,
            routes,
            router,
            this.config.assetPath.bind(this.config),
          );
        }

        if (pipeline === "api") {
          this.setAPIRoutes(
            routes,
            router,
          );
        }

        break;
    }
  }

  private setRoutes(
    paths: Paths,
    router: ServerRouter,
    pipeline: string,
  ): void {
    Object.keys(paths)
      .forEach((httpMethod) => {
        const routes = paths[httpMethod];
        this.setRoute(routes, router, httpMethod, pipeline);
      });
  }

  private setAPIRoutes(
    routes: Record<string, Route>,
    router: ServerRouter,
  ): void {
    Object.keys(routes)
      .forEach((path) => {
        this.setAPIRoute(path, routes[path], router);
      });
  }

  private setAPIRoute(path: string, route: Route, router: ServerRouter) {
    const { controller, method } = this.fetchController(route);
    router.get(`/api${path}`, controller[method]);
  }

  fetchController(route: Route) {
    if (route.module) {
      const controller = this.router._fetchController(route.module);
      const method = route.method || "";

      if (!controller[method]) {
        throw new Error(
          `No method ${method} found for controller ${controller}`,
        );
      }

      return { controller, method };
    }

    throw new Error(
      `Route module could not be found. ${route}`,
    );
  }

  private fetchAssetRouter(mode: "test" | "development" | "production") {
    if (mode === "production") {
      return new ProductionAssetRouter();
    }

    return new DevelopmentAssetRouter();
  }
}
