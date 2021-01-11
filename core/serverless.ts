import type { APIGatewayProxyEvent, LambdaContext } from "../deps.ts";
import { Server } from "../deps.ts";
import { handler } from "../deps.ts";
import { Application } from "./application.ts";

const application = new Application(Deno.cwd(), "production", false);
await application.start();

const server = new Server();

application.routers.forEach((router) => {
  server.use(router.routes());
  server.use(router.allowedMethods());
});

export const Echo = async (
  event: APIGatewayProxyEvent,
  context: LambdaContext,
) => {
  return await handler(event, context, server);
};

export default {
  Echo,
};
