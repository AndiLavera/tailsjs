import { Configuration } from "../core/configuration.ts";
import { ModuleHandler } from "../modules/module_handler.ts";
import { Context, Router as OakRouter } from "../deps.ts";
import { WebModule, WebModules, WebRoute, WebRoutes } from "../types.ts";
import { setMiddleware, setStaticMiddleware } from "./utils.ts";
import Module from "../modules/module.ts";
import { path } from "../std.ts";
import { generateHTML } from "../utils/generateHTML.tsx";

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
            webModule = await loadWebModule(
              route,
              webModules,
              this.config.buildDir,
            );
          }

          // deno-lint-ignore no-explicit-any
          let props: any;

          if (webModule.controller && method) {
            props = new webModule.controller()[method]();
          }

          const html = await generateHTML({
            App: App,
            Document: Document,
            Component: webModule.page,
            props,
            reactWritePath: this.config.reactWritePath as string,
            reactServerWritePath: this.config.reactServerWritePath as string,
          });
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
  webModules: WebModules,
  buildDir: string,
): Promise<WebModule> {
  const { controller: controllerName, method } = route;

  let controllerModule;
  if (controllerName && method) {
    controllerModule = path.join(
      buildDir,
      `/server/controllers/${controllerName}.js`,
    );
  }

  let controller;
  try {
    const pageModule = path.join(buildDir, `/app/pages/${route.page}.js`);
    const page = (await import(pageModule)).default;
    if (controllerModule) {
      controller = (await import(controllerModule)).default;
    }

    const webModule = {
      page,
      controller,
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
