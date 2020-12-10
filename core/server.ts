import { Application } from "./application.ts";
import { Context, Router, Server } from "../deps.ts";
import logger from "../logger/logger.ts";
import { path, walk } from "../std.ts";
import { Modules } from "../types.ts";
import { generateHTMLRoutes } from "../utils/generate_html_routes.tsx";
import Controller from "../controller/controller.ts";
import {
  compileApp,
  compilePages,
  writeCompiledFiles,
  writeModule,
} from "../compiler/compiler.ts";

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
    ._pipelines
    .api
    .middleware
    .forEach((middleware) => server.use(middleware));
}

// TODO: Duplicate
type Middleware = Array<
  (ctx: Context, next: () => Promise<void>) => Promise<void>
>;

function setMiddleware(middlewares: Middleware, router: Router) {
  middlewares
    .forEach((middleware) => router.use(middleware));
}

// TODO: Duplicate
interface Route {
  module?: typeof Controller;
  method?: string;
  page?: string;
}

// TODO: Duplicate
interface Paths {
  [key: string]: Record<string, Route>;
  get: Record<string, Route>;
  post: Record<string, Route>;
  put: Record<string, Route>;
  patch: Record<string, Route>;
  delete: Record<string, Route>;
  head: Record<string, Route>;
  connect: Record<string, Route>;
  options: Record<string, Route>;
  trace: Record<string, Route>;
}

// TODO: Implement other http methods
function setRoute(
  routes: any,
  router: Router,
  httpMethod: string,
  pipeline: string,
  appRoot: string,
  AppComponent: any,
) {
  switch (httpMethod) {
    case "get":
      if (pipeline === "web") {
        generateHTMLRoutes(
          // TODO: Duplicate import APP
          AppComponent,
          routes,
          router,
          "/main.js",
          appRoot,
        );
      }

      break;
  }
}

function setRoutes(
  paths: Paths,
  router: Router,
  pipeline: string,
  appRoot: string,
  AppComponent: any,
) {
  Object.keys(paths)
    .forEach((httpMethod) => {
      const routes = paths[httpMethod];
      setRoute(routes, router, httpMethod, pipeline, appRoot, AppComponent);
    });
}

function loadUserRoutes(app: Application, AppComponent: any) {
  const routers: Router[] = [];
  const pipelines = app
    .config
    .router
    ._pipelines;

  Object.keys(pipelines)
    .forEach((key) => {
      const pipeline = pipelines[key];
      const router = new Router();

      setMiddleware(pipeline.middleware, router);
      setRoutes(pipeline.paths, router, key, app.appRoot, AppComponent);
      routers.push(router);
    });

  return routers;
}

/**
 * Load boostrap file
 */
async function loadBootstrap() {
  const decoder = new TextDecoder("utf-8");
  const data = await Deno.readFile(
    path.resolve("./") + "/browser/bootstrap.js",
  );
  return decoder.decode(data);
}

export async function start(
  appDir: string,
  port: number,
  mode: "test" | "development" | "production",
  reload = false,
) {
  // TODO: Move into application
  const App = await importComponent(`${path.resolve("./")}/browser/app.tsx`);
  const application = new Application(appDir, mode, reload);
  await application.ready();

  const server = new Server();

  await loadStaticMiddleware(server);
  loadUserMiddleware(application, server);
  const routers = loadUserRoutes(application, App);

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

  await compileApp("./browser/app.tsx", modules);

  /**
   * Main routes defined in user routes file
   */
  const routes = {
    "/": "/pages/index.tsx",
    "/about": "/pages/about.tsx",
  };
  await compilePages(routes, modules, application.appRoot);
  await writeModule(modules);

  await writeCompiledFiles(modules, application.appRoot);

  const jsRouter = generateJSRoutes(modules, application.appRoot);
  server.use(jsRouter.routes());
  server.use(jsRouter.allowedMethods());

  routers.forEach((router) => {
    server.use(router.routes());
    server.use(router.allowedMethods());
  });

  server.addEventListener("listen", ({ hostname, port, secure }) => {
    logger.info(
      `Server listening on: ${secure ? "https://" : "http://"}${hostname ??
        "localhost"}:${port}`,
    );
  });

  const bootstrapFile = await loadBootstrap();

  const router = new Router();

  server.use(router.routes());
  server.use(router.allowedMethods());
  router
    .get(mainJSPath, (context: Context) => {
      context.response.type = "application/javascript";
      context.response.body = mainJS;
    })
    .get("/bootstrap.ts", (context: Context) => {
      context.response.type = "application/javascript";
      context.response.body = bootstrapFile;
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

function generateJSRoutes(modules: Modules, appRoot: string) {
  const router = new Router();
  const filePath = "file://" + appRoot + "/src";
  console.log("filePath");
  console.log(filePath);

  console.log("pathWithoutJS");
  Object.keys(modules).forEach((route) => {
    Object.keys(modules[route]).forEach((file) => {
      const pathWithJS = file.replace(filePath, "");
      const pathWithoutJS = pathWithJS.replace(".js", "");
      console.log(pathWithoutJS);

      router.get(
        // TODO: Hacky - Need better file path handling
        pathWithoutJS.includes("app.tsx")
          ? ("/" + pathWithoutJS.split("/").slice(-1)[0])
          : pathWithoutJS,
        (context: Context) => {
          context.response.type = "application/javascript";
          context.response.body = modules[route][file];
        },
      );
    });
  });

  return router;
}
