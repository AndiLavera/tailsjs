import { Configuration } from "../core/configuration.ts";
import { ModuleHandler } from "../core/module_handler.ts";
import { Context, Router as OakRouter } from "../deps.ts";
import { Middleware, WebRoute, WebRoutes } from "../types.ts";
import { fetchHtml, generateHTML } from "../utils/setHTMLRoutes.tsx";
import { WebModules } from "./route_handler.ts";
import { setMiddleware, setStaticMiddleware } from "./utils.ts";

export class WebRouter {
  readonly router: OakRouter;
  private readonly config: Configuration;
  private readonly moduleHandler: ModuleHandler;

  constructor(config: Configuration, moduleHandler: ModuleHandler) {
    this.config = config;
    this.moduleHandler = moduleHandler;
    this.router = new OakRouter();
  }

  setRoutes(webRoutes: WebRoutes, webModules: WebModules) {
    setStaticMiddleware(this.router);
    setMiddleware(webRoutes.middleware, this.router);

    const App = this.moduleHandler.appComponent;
    const Document = this.moduleHandler.documentComponent;

    if (!App || !Document) {
      throw new Error("_app or _document could not be loaded");
    }

    webRoutes.routes.forEach((route) => {
      const { method } = route;

      this.router.get(route.path, (context: Context) => {
        const webModule = webModules[route.path];
        let props: any;

        if (webModule.controller && method) {
          props = new webModule.controller()[method]();
        }

        const body = route.ssg
          ? () => fetchHtml(route.page, this.moduleHandler.modules)
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

    // apiRoutes.routes.forEach((route) => {
    //   const { controller, method, httpMethod, path } = route;

    //   switch (httpMethod) {
    //     case "GET":
    //       // TODO: Set params and other important info
    //       this.router.get(path, (context: Context) => {
    //         const module = apiModules[path];
    //         const controller = new module();

    //         context.response.type = "application/json";
    //         context.response.body = controller[method]();
    //       });
    //       break;
    //     case "POST":
    //       break;
    //   }
    // });
  }
}
