import { Context } from "./deps.ts";

type HTTPMethod =
  | "CONNECT"
  | "DELETE"
  | "GET"
  | "HEAD"
  | "OPTIONS"
  | "PATCH"
  | "POST"
  | "PUT"
  | "TRACE";

export type Middleware = Array<
  (ctx: Context, next: () => Promise<void>) => Promise<void>
>;

export interface WebRoute {
  page: string;
  ssg?: boolean;
  path: string;
  controller?: string;
  method?: string;
}

export interface WebRoutes {
  middleware: Middleware;
  routes: WebRoute[];
}

export interface APIRoute {
  method: string;
  controller: string;
  httpMethod: HTTPMethod;
  path: string;
}

export interface APIRoutes {
  middleware: Middleware;
  routes: APIRoute[];
}

export type Routes = {
  api: APIRoutes;
  web: WebRoutes;
};

// TODO: any
export interface Modules {
  [key: string]: {
    module: string;
    html?: string;
  };
}

/**
 * The options for **SSR**.
 */
export interface SSROptions {
  /** The fallback html **dynamic routes** (default is '**_fallback.html**'). */
  fallback?: string;
  /** A list of RegExp for paths to use **SSR**. */
  include?: RegExp[];
  /** A list of RegExp for paths to skip **SSR**. */
  exclude?: RegExp[];
  /** A list of paths for **dynamic routes** in **SSR**. */
  staticPaths?: string[];
}

/**
 * A plugin for **Tails.js** application.
 */
export interface Plugin {
  /** `name` gives the plugin a name. */
  name?: string;
  /** `test` matches the import url. */
  test: RegExp;
  /** `acceptHMR` accepts the HMR. */
  acceptHMR?: boolean;
  /** `resolve` resolves the import url, if the `external` returned the compilation will skip the import url. */
  resolve?(url: string): { url: string; external?: boolean };
  /** `transform` transforms the source content. */
  // transform?(
  //   content: Uint8Array,
  //   url: string,
  // ): Promise<{
  //   code: string;
  //   map?: string;
  //   loader?: "js" | "ts" | "css" | "markdown";
  // }>;

  /**
   * Handles transforming the pathname or source
   * before transpiling.
   */
  preTransform?(pathname: string, content: string): Promise<{
    transformedPath: string;
    transformedContent: string;
  }>;

  /**
   * Handles transforming the pathname or source
   * after transpiling.
   */
  postTransform?(pathname: string, module: Deno.TranspileOnlyResult): Promise<{
    transformedPath: string;
    transformedModule: Deno.TranspileOnlyResult;
  }>;
}
