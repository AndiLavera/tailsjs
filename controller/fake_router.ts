import { Router } from "./router.ts";

/**
 * `Configuration` uses this in it's constructor to prevent
 * `router` from being nullable. Overwritten once `Configuration#init`
 * is invoked.
 */
export default class extends Router {
  drawRoutes() {}
}
