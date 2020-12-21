import { Application } from "./application.ts";
import { Server } from "../deps.ts";
import logger from "../logger/logger.ts";

export async function start(
  appDir: string,
  port: number,
  mode: "test" | "development" | "production",
  reload = false,
): Promise<void> {
  const application = new Application(appDir, mode, reload);
  if (mode === "development") {
    await application.ready();
  } else {
    await application.start();
  }

  const server = new Server();

  application.routers.forEach((router) => {
    server.use(router.routes());
    server.use(router.allowedMethods());
  });

  server.addEventListener("listen", ({ hostname, port, secure }) => {
    logger.info(
      `Server listening on: ${secure ? "https://" : "http://"}${hostname ??
        "localhost"}:${port}`,
    );
  });

  await server.listen({ port });
  // TODO: Serverless
  // await listenAndServe({ port }, async (request) => {
  //   const response = await app.handle(request);
  //   if (response) {
  //     request.respond(response);
  //   }
  // });
}
