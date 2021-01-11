import type { APIGatewayProxyEventV2, LambdaContext } from "../deps.ts";
import { Server } from "../deps.ts";
import { handler as lamdaHandler } from "./serverless_oak.ts";
import { Application } from "./application.ts";
import { path } from "../std.ts";

const application = new Application(
  path.join(Deno.cwd()),
  "production",
  false,
);
await application.start();

const server = new Server();

application.routers.forEach((router) => {
  server.use(router.routes());
  server.use(router.allowedMethods());
});

export const handler = async (
  event: APIGatewayProxyEventV2,
  context: LambdaContext,
) => {
  return await lamdaHandler(event, context, server);
};
