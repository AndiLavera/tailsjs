import { Configuration } from "../core/configuration.ts";
import { ModuleHandler } from "../modules/module_handler.ts";
import { APIModules, APIRoute, APIRoutes } from "../types.ts";
import { Router as OakRouter } from "../deps.ts";
import { setMiddleware, setStaticMiddleware } from "./utils.ts";
import { Context } from "../deps.ts";

export default class APIRouter {
  readonly router: OakRouter;
  private readonly config: Configuration;
  private readonly moduleHandler: ModuleHandler;
  private readonly apiModules: APIModules;

  constructor(
    config: Configuration,
    moduleHandler: ModuleHandler,
    apiModules: APIModules,
  ) {
    this.config = config;
    this.apiModules = apiModules;
    this.moduleHandler = moduleHandler;
    this.router = new OakRouter();
  }

  setRoutes(apiRoutes: APIRoutes) {
    const apiModules = this.apiModules;
    const moduleHandler = this.moduleHandler;

    setStaticMiddleware(this.router);
    setMiddleware(apiRoutes.middleware, this.router);

    apiRoutes.routes.forEach((route) => {
      const { method, httpMethod, path } = route;

      // TODO: Other http methods
      switch (httpMethod) {
        case "GET":
          // TODO: Set params and other important info
          this.router.get(path, async (context: Context) => {
            try {
              let module = apiModules[path];
              if (!module) {
                module = await loadAPIModule(route, moduleHandler, apiModules);
              }

              const controller = new module();

              context.response.type = "application/json";
              context.response.body = controller[method]();
            } catch (err) {
              console.log(err);
            }
          });
          break;
        case "POST":
          break;
      }
    });
  }
}

export async function loadAPIModule(
  route: APIRoute,
  moduleHandler: ModuleHandler,
  apiModules: APIModules,
) {
  try {
    const module = moduleHandler.modules.get(
      `/controllers/${route.controller}.js`,
    );
    const controller = (await module?.import()).default;
    apiModules[route.path] = controller;
    return controller;
  } catch (error) {
    console.log(error);
    throw new Error(
      `Could not load api route module: ${route.controller}.`,
    );
  }
}
