import FakeRouter from "../controller/fake_router.ts";
import { Router } from "../controller/router.ts";
import { ComponentType, Context, Router as ServerRouter } from "../deps.ts";
import { Configuration } from "../core/configuration.ts";
import { path, walk } from "../std.ts";
import { Middleware, Modules, Paths, Route } from "../types.ts";
import { setHTMLRoutes } from "../utils/setHTMLRoutes.tsx";
import { ModuleHandler } from "../core/module_handler.ts";

export class RouteHandler {
  router: Router;
  // deno-lint-ignore no-explicit-any
  appComponent?: ComponentType<any>;
  documentComponent?: ComponentType<any>;
  #bootstrap: string;

  readonly serverRouters: ServerRouter[];

  private readonly config: Configuration;

  constructor(config: Configuration) {
    this.config = config;
    this.serverRouters = [];
    this.#bootstrap = "";
    this.router = new FakeRouter();
  }

  async init(moduleHandler: ModuleHandler): Promise<void> {
    this.#bootstrap = moduleHandler.bootstrap;
    this.appComponent = moduleHandler.appComponent;
    this.documentComponent = moduleHandler.documentComponent;
    await this.setUserRoutes();
    this.setJSRoutes(moduleHandler.modules);
  }

  async prepareRouter(): Promise<void> {
    const routesPath = path.join(this.config.appRoot, "config/routes.ts");
    const { default: routes } = await import("file://" + routesPath);

    const router = new routes();
    router.drawRoutes();
    this.router = router;
  }

  setJSRoutes(modules: Modules): void {
    const router = new ServerRouter();

    console.log("JS ASSET ROUTES:\n");
    Object.keys(modules).forEach((key) => {
      const file = modules[key];
      const path = key
        .replace(".js", "")
        .replace("/pages", "");

      console.log(path);

      router.get(
        path,
        (context: Context) => {
          context.response.type = "application/javascript";
          context.response.body = file;
        },
      );
    });

    console.log("\n");

    router
      .get(this.config.mainJSPath, (context: Context) => {
        context.response.type = "application/javascript";
        context.response.body = this.config.mainJS;
      })
      .get("/bootstrap.ts", (context: Context) => {
        context.response.type = "application/javascript";
        context.response.body = this.#bootstrap;
      });

    this.serverRouters.push(router);
  }

  private async setUserRoutes(): Promise<void> {
    await this.prepareRouter();
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
      const { path } of walk("middleware", { exts: [".ts"] })
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
    // deno-lint-ignore no-explicit-any
    App: ComponentType<any>,
    // deno-lint-ignore no-explicit-any
    Document: ComponentType<any>,
  ): void {
    switch (httpMethod) {
      case "get":
        if (pipeline === "web") {
          setHTMLRoutes(
            App,
            Document,
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
    const App = this.appComponent;
    const Document = this.documentComponent;
    if (!App || !Document) {
      // TODO: App should be defined
      throw new Error();
    }

    Object.keys(paths)
      .forEach((httpMethod) => {
        const routes = paths[httpMethod];
        this.setRoute(routes, router, httpMethod, pipeline, App, Document);
      });
  }

  private setAPIRoutes(
    routes: Record<string, Route>,
    router: ServerRouter,
  ): void {
    Object.keys(routes)
      .forEach((path) => {
        const route = routes[path];
        if (route.module) {
          const controller = this.router._fetchController(route.module);
          const method = route.method || "";
          router.get(`/api${path}`, controller[method]);
        }
      });
  }
}
