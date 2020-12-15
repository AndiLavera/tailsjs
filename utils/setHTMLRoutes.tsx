import {
  ComponentType,
  Context,
  React,
  renderToString,
  Router,
} from "../deps.ts";
import { Route } from "../types.ts";

// TODO: Duplicate
async function importComponent(path: string) {
  return (await import(path)).default;
}

export async function setHTMLRoutes(
  App: ComponentType<any>,
  Document: ComponentType<any>,
  routes: Record<string, Route>,
  router: Router,
  assetPath: (asset: string) => string,
) {
  console.log("HTML ROUTES:\n");
  await Object.keys(routes).forEach(async (route) => {
    console.log(`Route: ${route}`);
    console.log(`Page: ${assetPath(`pages/${routes[route].page}`)}`);
    const Component = await importComponent(
      assetPath(`pages/${routes[route].page}`),
    );

    router.get(route, (context: Context) => {
      context.response.type = "text/html";
      context.response.body = generateHTML(App, Document, Component);
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
