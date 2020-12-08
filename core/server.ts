import { Application } from "./application.ts";
import { Server } from "../deps.ts";
import logger from "../logger/logger.ts";
import { walk } from "../std.ts";

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

export async function start(
  appDir: string,
  port: number,
  mode: "test" | "development" | "production",
  reload = false,
) {
  const server = new Server();

  await loadStaticMiddleware(server);

  const application = new Application(appDir, mode, reload);
  await application.ready();

  loadUserMiddleware(application, server);

  server.use((ctx) => {
    ctx.response.body = "Hello World!";
  });

  server.addEventListener("listen", ({ hostname, port, secure }) => {
    logger.info(
      `Server listening on: ${secure ? "https://" : "http://"}${hostname ??
        "localhost"}:${port}`,
    );
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
