import Controller from "./controller.ts";
import { Context } from "../deps.ts";
import { pathsFactory } from "./utils.ts";

interface Route {
  module: typeof Controller;
  method: string;
}

interface Paths {
  get: Record<string, Route>;
  post: Record<string, Route>;
  put: Record<string, Route>;
  patch: Record<string, Route>;
  delete: Record<string, Route>;
  head: Record<string, Route>;
  connect: Record<string, Route>;
  options: Record<string, Route>;
  trace: Record<string, Route>;
}

type Middleware = Array<
  (ctx: Context, next: () => Promise<void>) => Promise<void>
>;

interface Routes {
  [key: string]: {
    middleware: Middleware;
    paths: Paths;
  };
}

export abstract class Router {
  _routes: Routes;
  _paths: Paths;

  abstract drawRoutes(): void;

  constructor() {
    this._routes = {
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
  }

  pipeline(pipe: string, callback: () => Middleware): void {
    if (this._routes[pipe]) {
      this._routes[pipe].middleware.concat(callback());
    }

    this._routes[pipe] = { middleware: callback(), paths: pathsFactory() };
  }

  routes(pipeline: string, callback: () => void) {
    if (this._routes[pipeline]) {
      this._paths = this._routes[pipeline].paths;
      callback();
    } else {
      // TODO: Pipeline doesn't exist
      throw new Error();
    }
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

  get(
    path: string,
    module: typeof Controller,
    method: string,
  ): void {
    if (this._paths.get) {
      this._paths.get[path] = { module, method };
    } else {
      this._paths.get = {};
      this._paths.get[path] = { module, method };
    }
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
    module: typeof Controller,
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
