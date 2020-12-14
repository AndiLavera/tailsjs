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

  // connect(
  //   path: string,
  //   module: typeof Controller,
  //   method: string,
  // ): void {
  //   this.paths[path] = {
  //     module,
  //     method,
  //     httpMethod: "CONNECT",
  //   };
  // }

  // delete(
  //   path: string,
  //   module: typeof Controller,
  //   method: string,
  // ): void {
  //   this.paths[path] = {
  //     module,
  //     method,
  //     httpMethod: "DELETE",
  //   };
  // }

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
    }

    throw new Error("Must supply a module & method or page");
  }

  // head(
  //   path: string,
  //   module: typeof Controller,
  //   method: string,
  // ): void {
  //   this.paths[path] = {
  //     module,
  //     method,
  //     httpMethod: "HEAD",
  //   };
  // }

  // options(
  //   path: string,
  //   module: typeof Controller,
  //   method: string,
  // ): void {
  //   this.paths[path] = {
  //     module,
  //     method,
  //     httpMethod: "OPTIONS",
  //   };
  // }

  // patch(
  //   path: string,
  //   module: typeof Controller,
  //   method: string,
  // ): void {
  //   this.paths[path] = {
  //     module,
  //     method,
  //     httpMethod: "PATCH",
  //   };
  // }

  post(
    path: string,
    module: new () => Controller,
    method: string,
  ): void {
    if (this._paths.post) {
      this._paths.post[path] = { module, method };
    } else {
      this._paths.post = {};
      this._paths.post[path] = { module, method };
    }
  }

  // put(
  //   path: string,
  //   module: typeof Controller,
  //   method: string,
  // ): void {
  //   this.paths[path] = {
  //     module,
  //     method,
  //     httpMethod: "PUT",
  //   };
  // }

  // trace(
  //   path: string,
  //   module: typeof Controller,
  //   method: string,
  // ): void {
  //   this.paths[path] = {
  //     module,
  //     method,
  //     httpMethod: "TRACE",
  //   };
  // }
}
