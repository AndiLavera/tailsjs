import { Configuration } from "../core/configuration.ts";
import { ModuleHandler } from "../modules/module_handler.ts";
import { Context, Router as OakRouter } from "../deps.ts";
import { WebModule, WebModules, WebRoute, WebRoutes } from "../types.ts";
import { generateHTML } from "../utils/generateHTML.tsx";
import { fetchHtml } from "../utils/fetchHTML.ts";
import { setMiddleware, setStaticMiddleware } from "./utils.ts";
import Module from "../modules/module.ts";

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
        try {
          let webModule = webModules[route.path];
          if (!webModule) {
            webModule = await loadWebModule(route, moduleHandler, webModules);
          }

          // deno-lint-ignore no-explicit-any
          let props: any;

          if (webModule.controller.imp && method) {
            props = new webModule.controller.imp()[method]();
          }

          webModule.page.module.render(App, Document, props);

          const body = route.ssg
            ? () => fetchHtml(route.page as string, this.moduleHandler.modules)
            : () => generateHTML(App, Document, webModule.page.imp, props);

          const html = body();
          context.response.type = "text/html";
          context.response.body = html;
        } catch (error) {
          console.log(error);
        }
      });
    });
  }
}

export async function loadWebModule(
  route: WebRoute,
  moduleHandler: ModuleHandler,
  webModules: WebModules,
): Promise<WebModule> {
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

    const webModule = {
      page: {
        imp: page,
        module: pageModule as Module,
      },
      controller: {
        imp: controller,
        module: controllerModule,
      },
    };

    webModules[route.path] = webModule;
    return webModule;
  } catch (error) {
    console.log(error);
    // TODO: Possible for this to be a controller, not a page. Leaving
    // the console.log for debugging reasonse for now.
    throw new Error(
      `Could not load page: ${route.page}`,
    );
  }
}
