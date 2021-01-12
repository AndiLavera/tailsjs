import type { APIGatewayProxyEventV2, LambdaContext } from "./deps.ts";
import { Server } from "./deps.ts";
import { handler as lamdaHandler } from "./core/serverless_oak.ts";
import { Application } from "./core/application.ts";
import { path } from "./std.ts";

const application = new Application(
  path.join(Deno.cwd(), "examples/hello-world"),
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
  const r = await lamdaHandler(event, context, server);
  console.log("RESPONSSE");
  console.log(r);
  return r;
};
