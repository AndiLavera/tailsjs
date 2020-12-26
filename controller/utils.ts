import { walk } from "../std.ts";
import { Router as OakRouter } from "../deps.ts";
import { Middleware } from "../types.ts";

export async function setStaticMiddleware(router: OakRouter): Promise<void> {
  for await (
    const { path } of walk("middleware", { exts: [".ts", ".js"] })
  ) {
    const module = await import("../" + path);
    if (module.default) {
      router.use(module.default);
    }
  }
}

export function setMiddleware(
  middlewares: Middleware,
  router: OakRouter,
): void {
  middlewares.forEach((middleware) => router.use(middleware));
}
