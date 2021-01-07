import { Configuration } from "../core/configuration.ts";
import { ModuleHandler } from "../core/module_handler.ts";
import { Context, Router as OakRouter } from "../deps.ts";
import { WebModules, WebRoute, WebRoutes } from "../types.ts";
import { generateHTML } from "../utils/generateHTML.tsx";
import { fetchHtml } from "../utils/fetchHTML.ts";
import { setMiddleware, setStaticMiddleware } from "./utils.ts";

export class WebRouter {
  readonly router: OakRouter;
  private readonly config: Configuration;
  private readonly moduleHandler: ModuleHandler;
  private readonly webModules: WebModules;

  constructor(
    config: Configuration,
    moduleHandler: ModuleHandler,
    webModules: WebModules,
  ) {
    this.config = config;
    this.moduleHandler = moduleHandler;
    this.webModules = webModules;
    this.router = new OakRouter();
  }

  setRoutes(webRoutes: WebRoutes) {
    setStaticMiddleware(this.router);
    setMiddleware(webRoutes.middleware, this.router);

    const App = this.moduleHandler.appComponent;
    const Document = this.moduleHandler.documentComponent;

    if (!App || !Document) {
      throw new Error("_app or _document could not be loaded");
    }

    const moduleHandler = this.moduleHandler;
    const webModules = this.webModules;

    webRoutes.routes.forEach((route) => {
      const { method } = route;

      this.router.get(route.path, async (context: Context) => {
        let webModule = webModules[route.path];
        if (!webModule) {
          webModule = await loadWebModule(route, moduleHandler, webModules);
        }

        // deno-lint-ignore no-explicit-any
        let props: any;

        if (webModule.controller && method) {
          props = new webModule.controller()[method]();
        }

        const body = route.ssg
          ? () => fetchHtml(route.page as string, this.moduleHandler.modules)
          : () => generateHTML(App, Document, webModule.page, props);

        let html;
        try {
          html = body();
        } catch (error) {
          console.log(error);
        }

        context.response.type = "text/html";
        context.response.body = html;
      });
    });
  }
}

export async function loadWebModule(
  route: WebRoute,
  moduleHandler: ModuleHandler,
  webModules: WebModules,
) {
  const { controller: controllerName, method } = route;

  let controllerModule;
  if (controllerName && method) {
    controllerModule = moduleHandler.modules.get(
      `/controllers/${controllerName}.js`,
    );
  }

  let controller;
  try {
    const pageModule = moduleHandler.modules.get(`/pages/${route.page}.js`);
    const page = (await pageModule?.import()).default;
    if (controllerModule) {
      controller = (await controllerModule?.import()).default;
    }

    webModules[route.path] = {
      page,
      controller,
    };
    return {
      page,
      controller,
    };
  } catch (error) {
    console.log(error);
    // TODO: Possible for this to be a controller, not a page. Leaving
    // the console.log for debugging reasonse for now.
    throw new Error(
      `Could not load page: ${route.page}`,
    );
  }
}
