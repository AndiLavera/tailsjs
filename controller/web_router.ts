import { Configuration } from "../core/configuration.ts";
import { ModuleHandler } from "../core/module_handler.ts";
import { Router as ServerRouter } from "../deps.ts";
import { walk } from "../std.ts";
import { Middleware, Paths, Route } from "../types.ts";
import { setHTMLRoutes } from "../utils/setHTMLRoutes.tsx";
import { Router } from "./router.ts";

export class WebRouter {
  private readonly config: Configuration;
  private readonly moduleHandler: ModuleHandler;
  router?: Router;

  constructor(config: Configuration, moduleHandler: ModuleHandler) {
    this.config = config;
    this.moduleHandler = moduleHandler;
  }

  async setRoutes(
    router: Router,
    serverRouters: ServerRouter[],
  ): Promise<void> {
    this.router = router;

    const pipelines = router._pipelines;

    for await (const key of Object.keys(pipelines)) {
      const pipeline = pipelines[key];
      const router = new ServerRouter();

      this.setMiddleware(pipeline.middleware, router);
      await this.setStaticMiddleware(router);

      this._setRoutes(pipeline.paths, router, key);
      serverRouters.push(router);
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
            this.moduleHandler,
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

  private _setRoutes(
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

  // TODO: Duplicate of DevelopmentWebRouter#fetchController
  fetchController(route: Route) {
    if (route.module) {
      // const controller = new route.module();
      const controller = (this.router as Router)._fetchController(route.module);
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
}
