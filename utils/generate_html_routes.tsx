import { Context, React, renderToString, Router } from "../deps.ts";
import { Paths, Route } from "../types.ts";

// TODO: Duplicate
async function importComponent(path: string) {
  return (await import(path)).default;
}

export async function generateHTMLRoutes(
  App: any,
  routes: Record<string, Route>,
  router: Router,
  mainJSPath: string,
  appRoot: string,
) {
  console.log("generateHTMLRoutes");
  await Object.keys(routes).forEach(async (route) => {
    console.log(`route: ${route}`);
    console.log(`html page: ${appRoot}/src/pages/${routes[route].page}`);
    const Component = await importComponent(
      `${appRoot}/src/pages/${routes[route].page}`,
    );

    router.get(route, (context: Context) => {
      context.response.type = "text/html";
      context.response.body = `<html>
      <head>
        <link rel="stylesheet" href="https://unpkg.com/purecss@2.0.3/build/pure-min.css">
      </head>
      <body>
        <main id="app">${
        renderToString(<App Page={Component} pageProps={{}} />)
      }</main>
        <script type="module" src="${mainJSPath}"></script>
      </body>
    </html>`;
    });
  });

  return router;
}
