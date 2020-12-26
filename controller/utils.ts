import { Router as OakRouter } from "../deps.ts";
import { Middleware } from "../types.ts";
import logger from "../middleware/logger.ts";
import timer from "../middleware/timer.ts";

export function setStaticMiddleware(router: OakRouter): void {
  router.use(logger);
  router.use(timer);
}

export function setMiddleware(
  middlewares: Middleware,
  router: OakRouter,
): void {
  middlewares.forEach((middleware) => router.use(middleware));
}
