import FakeRouter from "../controller/fake_router.ts";
import { Router } from "./router.ts";
import { Context, Router as ServerRouter } from "../deps.ts";
import { Configuration } from "../core/configuration.ts";
import { path, walk } from "../std.ts";
import { Middleware, Modules, Paths } from "../types.ts";
import { generateHTMLRoutes } from "../utils/generate_html_routes.tsx";

export class AssetHandler {
  router: Router;
  serverRouters: ServerRouter[];
  // TODO: any
  appComponent?: any;
  #config: Configuration;
  #bootstrap: string;

  constructor(config: Configuration) {
    this.#config = config;
    this.serverRouters = [];
    this.#bootstrap = "";
    this.router = new FakeRouter();
  }

  /**
   * Main bundle all pages should fetch
   * Should pass routes to bootstrap but hard coded for now
   */
  get mainJS() {
    // TODO: Just move bootstrap code here
    return `
      import { bootstrap } from "./bootstrap.ts";
      bootstrap()
      `;
  }

  get webRoutes() {
    const routes: Record<string, string> = {};
    const webPipeline = this.router._pipelines.web.paths;

    Object.keys(webPipeline)
      .forEach((httpMethod) => {
        Object.keys(webPipeline[httpMethod])
          .forEach((path) => {
            const page = webPipeline[httpMethod][path].page;
            if (page) {
              routes[path] = page;
            }
          });
      });

    return routes;
  }

  async init() {
    this.#bootstrap = await this.loadBootstrap();
    await this.loadAppComponent();
    await this.loadUserRoutes();
  }

  async prepareRouter() {
    const routesPath = path.join(this.#config.appRoot, "config/routes.ts");
    const { default: routes } = await import("file://" + routesPath);

    const router = new routes();
    router.drawRoutes();
    this.router = router;
  }

  generateJSRoutes(modules: Modules) {
    console.log(modules);
    const router = new ServerRouter();
    const filePath = `file://${this.#config.appRoot}/src`;

    console.log("generateJSRoutes - path:");
    Object.keys(modules).forEach((route) => {
      Object.keys(modules[route]).forEach((file) => {
        const path = file
          .replace(filePath, "")
          .replace(".js", "")
          .replace("/pages", "");
        console.log(path);

        router.get(
          path,
          (context: Context) => {
            context.response.type = "application/javascript";
            context.response.body = modules[route][file];
          },
        );
      });
    });

    router
      .get(this.#config.mainJSPath, (context: Context) => {
        context.response.type = "application/javascript";
        context.response.body = this.mainJS;
      })
      .get("/bootstrap.ts", (context: Context) => {
        context.response.type = "application/javascript";
        context.response.body = this.#bootstrap;
      });

    this.serverRouters.push(router);
  }

  private async loadUserRoutes() {
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

  private setMiddleware(middlewares: Middleware, router: ServerRouter) {
    middlewares
      .forEach((middleware) => router.use(middleware));
  }

  async setStaticMiddleware(router: ServerRouter) {
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
  private setRoute(
    routes: any,
    router: ServerRouter,
    httpMethod: string,
    pipeline: string,
  ) {
    switch (httpMethod) {
      case "get":
        if (pipeline === "web") {
          generateHTMLRoutes(
            this.appComponent,
            routes,
            router,
            "/main.js",
            this.#config.appRoot,
          );
        }

        break;
    }
  }

  private setRoutes(
    paths: Paths,
    router: ServerRouter,
    pipeline: string,
  ) {
    Object.keys(paths)
      .forEach((httpMethod) => {
        const routes = paths[httpMethod];
        this.setRoute(routes, router, httpMethod, pipeline);
      });
  }

  private async loadAppComponent() {
    const { default: appComponent } = await import(
      `${this.#config.appRoot}/src/pages/_app.tsx`
    );
    this.appComponent = appComponent;
  }

  /**
   * Load boostrap file
   */
  private async loadBootstrap() {
    const decoder = new TextDecoder("utf-8");
    const data = await Deno.readFile(
      path.resolve("./") + "/browser/bootstrap.js",
    );
    return decoder.decode(data);
  }
}
