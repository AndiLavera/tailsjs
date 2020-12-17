import Controller from "./controller.ts";
import { pathsFactory } from "./utils.ts";
import { Middleware, Paths, Routes } from "../types.ts";
import { path } from "../std.ts";
import { Route } from "https://deno.land/x/oak@v6.4.0/router.ts";

interface RouteData {
  path: string;
  module?: new () => Controller;
  page?: string;
  method?: string;
  ssg?: boolean;
}

export abstract class Router {
  _pipelines: Routes;
  _paths: Paths;
  _instantiatedControllers: Record<string, Controller>;

  abstract drawRoutes(): void;

  constructor() {
    this._pipelines = {
      web: {
        middleware: [],
        paths: pathsFactory(),
      },
      api: {
        middleware: [],
        paths: pathsFactory(),
      },
    };
    this._paths = pathsFactory();
    this._instantiatedControllers = {};
  }

  /**
   * Iterates over all routes in pipeline `web`. Returns an
   * Array of strings that contain the pages that are SSG.
   */
  get _allStaticRoutes(): string[] {
    const routes = [];
    const webRoutes = this._pipelines.web.paths.get;
    for (const [_, route] of Object.entries(webRoutes)) {
      if (route.ssg && route.page) {
        routes.push(path.join("pages", route.page));
      }
    }

    return routes;
  }

  pipeline(pipe: string, callback: () => Middleware): void {
    if (this._pipelines[pipe]) {
      this._pipelines[pipe].middleware.concat(callback());
    }

    this._pipelines[pipe] = { middleware: callback(), paths: pathsFactory() };
  }

  routes(pipeline: string, callback: () => void) {
    if (this._pipelines[pipeline]) {
      this._paths = this._pipelines[pipeline].paths;
      callback();
    } else {
      // TODO: Pipeline doesn't exist
      throw new Error();
    }
  }

  /**
   * Find or instaniate a controller. Used so multiple methods inside
   * a controller share the same execution context.
   *
   * @param module
   */
  _fetchController(module: new () => Controller) {
    if (this._instantiatedControllers[String(module)]) {
      return this._instantiatedControllers[String(module)];
    }

    const controller = new module();
    this._instantiatedControllers[String(module)] = controller;
    return controller;
  }

  connect({ path, module, page, method }: {
    path: string;
    module?: new () => Controller;
    page?: string;
    method?: string;
  }): void {
    if (module && method) {
      this._paths.connect[path] = { module, method };
      return;
    }

    if (page) {
      this._paths.connect[path] = { page };
      return;
    }

    throw new Error(`Must supply a module & method or page for route: ${path}`);
  }

  delete({ path, module, page, method }: {
    path: string;
    module?: new () => Controller;
    page?: string;
    method?: string;
  }): void {
    if (module && method) {
      this._paths.delete[path] = { module, method };
      return;
    }

    if (page) {
      this._paths.delete[path] = { page };
      return;
    }

    throw new Error(`Must supply a module & method or page for route: ${path}`);
  }

  get(route: RouteData): void {
    const { path, module, page, method } = route;

    if (isAPIRoute(route)) {
      this._paths.get[path] = { module, method, ssg: false };
      return;
    }

    if (isStaticWebRouteWithData(route)) {
      this._paths.get[path] = { module, method, page, ssg: true };
      return;
    }

    if (isWebRouteWithData(route)) {
      this._paths.get[path] = { module, method, page, ssg: false };
      return;
    }

    if (isStaticWebRoute(route)) {
      this._paths.get[path] = { page, ssg: true };
      return;
    }

    if (isWebRoute(route)) {
      this._paths.get[path] = { page, ssg: false };
      return;
    }

    throw new Error(`Must supply a module & method or page for route: ${path}`);
  }

  head({ path, module, page, method }: {
    path: string;
    module?: new () => Controller;
    page?: string;
    method?: string;
  }): void {
    if (module && method) {
      this._paths.head[path] = { module, method };
      return;
    }

    if (page) {
      this._paths.head[path] = { page };
      return;
    }

    throw new Error(`Must supply a module & method or page for route: ${path}`);
  }

  options({ path, module, page, method }: {
    path: string;
    module?: new () => Controller;
    page?: string;
    method?: string;
  }): void {
    if (module && method) {
      this._paths.options[path] = { module, method };
      return;
    }

    if (page) {
      this._paths.options[path] = { page };
      return;
    }

    throw new Error(`Must supply a module & method or page for route: ${path}`);
  }

  patch({ path, module, page, method }: {
    path: string;
    module?: new () => Controller;
    page?: string;
    method?: string;
  }): void {
    if (module && method) {
      this._paths.patch[path] = { module, method };
      return;
    }

    if (page) {
      this._paths.patch[path] = { page };
      return;
    }

    throw new Error(`Must supply a module & method or page for route: ${path}`);
  }

  post({ path, module, page, method }: {
    path: string;
    module?: new () => Controller;
    page?: string;
    method?: string;
  }): void {
    if (module && method) {
      this._paths.post[path] = { module, method };
      return;
    }

    if (page) {
      this._paths.post[path] = { page };
      return;
    }

    throw new Error(`Must supply a module & method or page for route: ${path}`);
  }

  put({ path, module, page, method }: {
    path: string;
    module?: new () => Controller;
    page?: string;
    method?: string;
  }): void {
    if (module && method) {
      this._paths.put[path] = { module, method };
      return;
    }

    if (page) {
      this._paths.put[path] = { page };
      return;
    }

    throw new Error(`Must supply a module & method or page for route: ${path}`);
  }

  trace({ path, module, page, method }: {
    path: string;
    module?: new () => Controller;
    page?: string;
    method?: string;
  }): void {
    if (module && method) {
      this._paths.trace[path] = { module, method };
      return;
    }

    if (page) {
      this._paths.trace[path] = { page };
      return;
    }

    throw new Error(`Must supply a module & method or page for route: ${path}`);
  }
}

function requiresController(route: RouteData) {
  return !!route.module && !!route.method;
}

/**
 * Returns `true` if module & method exist but no page
 *
 * @param route
 */
function isAPIRoute(route: RouteData): boolean {
  return requiresController(route) && !isWebRoute(route);
}

function isWebRoute(route: RouteData): boolean {
  return !!route.page;
}

function isStatic(route: RouteData): boolean {
  if (route.ssg || route.ssg === undefined) {
    return true;
  }

  return false;
}

function isStaticWebRoute(route: RouteData): boolean {
  return isWebRoute(route) && isStatic(route);
}

function isWebRouteWithData(route: RouteData): boolean {
  return isWebRoute(route) && requiresController(route);
}

function isStaticWebRouteWithData(route: RouteData): boolean {
  return isStaticWebRoute(route) && requiresController(route);
}
