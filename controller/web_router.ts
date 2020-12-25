import { Context } from "https://deno.land/x/oak@v6.4.1/context.ts";
import { Configuration } from "../core/configuration.ts";
import { ModuleHandler } from "../core/module_handler.ts";
import { Router as ServerRouter } from "../deps.ts";
import { path, walk } from "../std.ts";
import { Middleware, Paths, Route } from "../types.ts";
import { setHTMLRoutes } from "../utils/setHTMLRoutes.tsx";
import { Router } from "./router.ts";
import log from "../logger/logger.ts";

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

      await this._setRoutes(pipeline.paths, router, key);
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
  private async setRoute(
    routes: Record<string, Route>,
    router: ServerRouter,
    httpMethod: string,
    pipeline: string,
  ): Promise<void> {
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
          await this.setAPIRoutes(
            routes,
            router,
          );
        }

        break;
    }
  }

  private async _setRoutes(
    paths: Paths,
    router: ServerRouter,
    pipeline: string,
  ): Promise<void> {
    for await (const httpMethod of Object.keys(paths)) {
      const routes = paths[httpMethod];
      await this.setRoute(routes, router, httpMethod, pipeline);
    }
  }

  private async setAPIRoutes(
    routes: Record<string, Route>,
    router: ServerRouter,
  ): Promise<void> {
    const routeKeys = Object.keys(routes);

    router.use(async (ctx, next) => {
      const { pathname } = ctx.request.url;
      const path = pathname.replace("/api", "");

      if (!routeKeys.includes(path)) {
        await next();
        return;
      }

      const { controller, method } = await this.fetchController(
        routes[path],
      );

      ctx.response.type = "application/json";
      ctx.response.body = controller[method]();
    });

    log.debug("API Routes:");
    for await (const path of Object.keys(routes)) {
      // await this.setAPIRoute(path, routes[path], router);
      console.debug(`  /api${path}`);
      router.get(`/api${path}`);
    }
  }

  // TODO: Duplicate of DevelopmentWebRouter#fetchController
  async fetchController(route: Route) {
    if (route.module) {
      // TODO: Transpile controllers & load js file from .tails
      const controllerPath = path.join(
        this.config.appRoot,
        "src/controllers",
        `${route.module}.ts`,
      );

      const { default: klass } = await import(controllerPath);
      const controller = new klass();
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
