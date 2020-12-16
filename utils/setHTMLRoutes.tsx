import { ModuleHandler } from "../core/module_handler.ts";
import {
  ComponentType,
  Context,
  React,
  renderToString,
  Router,
} from "../deps.ts";
import { Modules, Route } from "../types.ts";

// TODO: Duplicate
async function importComponent(path: string) {
  return (await import(path)).default;
}

export async function setHTMLRoutes(
  moduleHandler: ModuleHandler,
  routes: Record<string, Route>,
  router: Router,
  assetPath: (asset: string) => string,
) {
  const App = moduleHandler.appComponent;
  const Document = moduleHandler.documentComponent;

  if (!App || !Document) {
    throw new Error("_app or _document could not be loaded");
  }

  console.log("HTML ROUTES:\n");
  await Object.keys(routes).forEach(async (route) => {
    console.log(`Route: ${route}`);
    console.log(`Page: ${assetPath(`pages/${routes[route].page}`)}`);
    const Component = await importComponent(
      assetPath(`pages/${routes[route].page}`),
    );

    const body = routes[route].ssg
      ? () => fetchHtml(routes[route].page, moduleHandler.modules)
      : () => generateHTML(App, Document, Component);

    router.get(route, (context: Context) => {
      context.response.type = "text/html";
      context.response.body = body();
    });
  });

  console.log("\n");

  return router;
}

export function generateHTML(
  App: ComponentType<any>,
  Document: ComponentType<any>,
  Component: ComponentType<any>,
): string {
  return renderToString(
    <Document>
      <App Page={Component} pageProps={{}} />
    </Document>,
  );
}

// TODO: Should not be undefined
function fetchHtml(page: string | undefined, modules: Modules) {
  return modules[`/pages/${page}.js`].html;
}
