import Controller from "../controller/controller.ts";
import { RouteHandler } from "../controller/route_handler.ts";
import { ModuleHandler } from "../core/module_handler.ts";
import {
  ComponentType,
  Context,
  React,
  renderToString,
  Router as ServerRouter,
} from "../deps.ts";
import { Modules, Route } from "../types.ts";

// TODO: Duplicate
async function importComponent(path: string) {
  return (await import(path)).default;
}

export async function setHTMLRoutes(
  routeHandler: RouteHandler,
  moduleHandler: ModuleHandler,
  routes: Record<string, Route>,
  router: ServerRouter,
  assetPath: (asset: string) => string,
) {
  const App = moduleHandler.appComponent;
  const Document = moduleHandler.documentComponent;

  if (!App || !Document) {
    throw new Error("_app or _document could not be loaded");
  }

  console.log("HTML ROUTES:\n");

  for await (const path of Object.keys(routes)) {
    const route = routes[path];

    console.log(`Route: ${path}`);
    console.log(`Page: ${assetPath(`pages/${route.page}`)}`);
    const Component = await importComponent(
      assetPath(`pages/${route.page}`),
    );

    let props: Record<string, any> = {};

    if (route.module) {
      let { controller, method } = routeHandler.fetchController(route);
      props = controller[method]();
    }

    const body = route.ssg
      ? () => fetchHtml(route.page, moduleHandler.modules)
      : () => generateHTML(App, Document, Component, props);

    router.get(path, (context: Context) => {
      context.response.type = "text/html";
      context.response.body = body();
    });
  }

  console.log("\n");

  return router;
}

export function generateHTML(
  App: ComponentType<any>,
  Document: ComponentType<any>,
  Component: ComponentType<any>,
  props: Record<string, any> = {},
): string {
  return renderToString(
    <Document initialData={props}>
      <App Page={Component} pageProps={props} />
    </Document>,
  );
}

// TODO: Should not be undefined
function fetchHtml(page: string | undefined, modules: Modules) {
  const cleanedPage = (page as any).replace(/\.(jsx|mjs|tsx?)/g, "");
  return modules[
    `/pages/${cleanedPage}.js`
  ].html;
}
