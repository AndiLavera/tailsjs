import type { APIGatewayProxyEvent, LambdaContext } from "./deps.ts";
import { Server } from "./deps.ts";
import { handler as lamdaHandler } from "./core/serverless_oak.ts";
import { Application } from "./core/application.ts";
import { path, walk } from "./std.ts";

console.log("CURRENT DIR:", Deno.cwd());
for await (const entry of walk(".")) {
  if (entry.path.includes(".git") || entry.path.includes(".deno_dir")) continue;

  console.log(entry.path);
}

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
  event: APIGatewayProxyEvent,
  context: LambdaContext,
) => {
  return await lamdaHandler(event, context, server);
};
