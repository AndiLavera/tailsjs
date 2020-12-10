import { Application } from "./application.ts";
import {
  ComponentType,
  Context,
  React,
  ReactElement,
  renderToString,
  Router,
  Server,
} from "../deps.ts";
import logger from "../logger/logger.ts";
import { path, walk } from "../std.ts";
import { Modules, Routes } from "../types.ts";
import {
  compileApp,
  compilePages,
  writeCompiledFiles,
  writeModule,
} from "../compiler/index.ts";

async function loadStaticMiddleware(server: Server) {
  for await (
    const { path } of walk("middleware", { exts: [".ts"] })
  ) {
    const module = await import("../" + path);
    if (module.default) {
      server.use(module.default);
    }
  }
}

function loadUserMiddleware(app: Application, server: Server) {
  app
    .config
    .router
    ._routes
    .api
    .middleware
    .forEach((middleware) => server.use(middleware));
}

/**
 * Load boostrap file
 */
function loadBootstrap() {
  const decoder = new TextDecoder("utf-8");
  const data = await Deno.readFile("./bootstrap.js");
  return decoder.decode(data);
}

export async function start(
  appDir: string,
  port: number,
  mode: "test" | "development" | "production",
  reload = false,
) {
  const application = new Application(appDir, mode, reload);
  await application.ready();

  const server = new Server();

  await loadStaticMiddleware(server);
  loadUserMiddleware(application, server);

  Deno.chdir(application.appRoot);

  /**
   * Main routes defined in user routes file
   */
  const routes: Routes = {
    "/": "/pages/index.tsx",
    "/about": "/pages/about.tsx",
  };

  /**
 * Main bundle all pages should fetch
 * Should pass routes to bootstrap but hard coded for now
 */
  const mainJS = `
import { bootstrap } from "./bootstrap.ts";
bootstrap({
  "/": "/pages/index.tsx",
  "/about": "/pages/about.tsx",
})
`;
  const mainJSPath = "/main.js";

  const modules: Modules = {};

  await compileApp("./pages/app.tsx", modules);
  await compilePages(routes, modules);
  await writeModule(modules);

  await writeCompiledFiles(modules);

  const jsRouter = generateJSRoutes(modules);
  const htmlRouter = await generateHTMLRoutes(routes, mainJSPath);

  const router = new Router();

  server.use(router.routes());
  server.use(router.allowedMethods());

  server.use(jsRouter.routes());
  server.use(jsRouter.allowedMethods());

  server.use(htmlRouter.routes());
  server.use(htmlRouter.allowedMethods());

  server.addEventListener("listen", ({ hostname, port, secure }) => {
    logger.info(
      `Server listening on: ${secure ? "https://" : "http://"}${hostname ??
        "localhost"}:${port}`,
    );
  });

  router
    .get(mainJSPath, (context: Context) => {
      context.response.type = "application/javascript";
      context.response.body = mainJS;
    })
    .get("/bootstrap.ts", (context: Context) => {
      context.response.type = "application/javascript";
      context.response.body = loadBootstrap();
    });

  // if app.target = serverless then server.handle
  await server.listen({ port });
  // await listenAndServe({ port }, async (request) => {
  //   const response = await app.handle(request);
  //   if (response) {
  //     request.respond(response);
  //   }
  // });
}

async function importComponent(path: string) {
  return (await import(path)).default;
}

function generateJSRoutes(modules: Modules) {
  const router = new Router();
  const filePath = "file://" + path.resolve("./");

  Object.keys(modules).forEach((route) => {
    Object.keys(modules[route]).forEach((file) => {
      const pathWithJS = file.replace(filePath, "");
      const pathWithoutJS = pathWithJS.replace(".js", "");

      router.get(
        pathWithoutJS,
        (context: Context) => {
          context.response.type = "application/javascript";
          context.response.body = modules[route][file];
        },
      );
    });
  });

  return router;
}

async function generateHTMLRoutes(
  routes: Routes,
  mainJSPath: string,
) {
  const App = await importComponent("./app.tsx");
  const router = new Router();
  await Object.keys(routes).forEach(async (route) => {
    const Component = await importComponent("." + routes[route]);

    const html = `<html>
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

    router.get(route, (context: Context) => {
      context.response.type = "text/html";
      context.response.body = html;
    });
  });

  return router;
}
