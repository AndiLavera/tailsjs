import { Configuration } from "../core/configuration.ts";
import { ModuleHandler } from "../core/module_handler.ts";
import { APIRoutes } from "../types.ts";
import { APIModules } from "./route_handler.ts";
import { Router as OakRouter } from "../deps.ts";
import { setMiddleware, setStaticMiddleware } from "./utils.ts";
import { Context } from "../deps.ts";

export default class APIRouter {
  readonly router: OakRouter;
  private readonly config: Configuration;
  private readonly moduleHandler: ModuleHandler;

  constructor(config: Configuration, moduleHandler: ModuleHandler) {
    this.config = config;
    this.moduleHandler = moduleHandler;
    this.router = new OakRouter();
  }

  setRoutes(apiRoutes: APIRoutes, apiModules: APIModules) {
    setStaticMiddleware(this.router);
    setMiddleware(apiRoutes.middleware, this.router);

    apiRoutes.routes.forEach((route) => {
      const { method, httpMethod, path } = route;

      switch (httpMethod) {
        case "GET":
          // TODO: Set params and other important info
          this.router.get(path, (context: Context) => {
            const module = apiModules[path];
            const controller = new module();

            context.response.type = "application/json";
            context.response.body = controller[method]();
          });
          break;
        case "POST":
          break;
      }
    });
  }
}
