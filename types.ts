import { WalkOptions } from "https://deno.land/std@0.78.0/fs/walk.ts";
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
 * A compiler plugin for **Tails.js** application. The transform
 * methods are invoked just before transpile & just after transpiling.
 */
export interface CompilerPlugin {
  /** `name` gives the plugin a name. */
  name?: string;
  /** `test` matches the import url. */
  test: RegExp;
  /** `acceptHMR` accepts the HMR. */
  acceptHMR?: boolean;
  /**
   * Merged with default `walkOptions` when transpiling. Used
   * to include files such as css when walking the user's
   * application is being transpiled.
   * Note: Make sure to transfrom the source content
   * before transpiling occurs (preTransform).
   */
  walkOptions?: WalkOptions;
  /**
   * `resolve` resolves the import url. This is invoked
   * before transpiling to ensure unsupported imports,
   * such as css imports, are not transpiled.
   */
  resolve?(url: string): string;
  /**
   * Handles transforming the pathname or source
   * before transpiling.
   */
  transform?(pathname: string, content: string): Promise<{
    transformedPath: string;
    transformedContent: string;
  }>;
}

export interface TranspiledModules {
  modules: Record<string, Deno.TranspileOnlyResult>;
  plugins: Record<string, string>;
}

export interface Manifest {
  [key: string]: {
    path: string;
    module: string;
    html?: string;
  };
}

/**
 * TODO: Remove?
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
  transform?(
    content: Uint8Array,
    url: string,
  ): Promise<{
    code: string;
    map?: string;
    loader?: "js" | "ts" | "css" | "markdown";
  }>;
}
