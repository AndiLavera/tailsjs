import Controller from "./controller.ts";
import { pathsFactory } from "./utils.ts";
import { Middleware, Paths, Routes } from "../types.ts";

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

  get({ path, module, page, method }: {
    path: string;
    module?: new () => Controller;
    page?: string;
    method?: string;
  }): void {
    if (module && method) {
      this._paths.get[path] = { module, method };
      return;
    }

    if (page) {
      this._paths.get[path] = { page };
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
