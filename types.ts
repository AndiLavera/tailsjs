import { Context } from "./deps.ts";
import Controller from "./controller/controller.ts";
import { ProductionAssetRouter } from "./controller/production_asset_router.ts";
import { DevelopmentAssetRouter } from "./controller/development_asset_router.ts";

export type AssetRouter = ProductionAssetRouter | DevelopmentAssetRouter;

export interface Route {
  module?: new () => Controller;
  method?: string;
  page?: string;
  ssg?: boolean;
}

export interface Paths {
  [key: string]: Record<string, Route>;
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

export type Middleware = Array<
  (ctx: Context, next: () => Promise<void>) => Promise<void>
>;

export interface Routes {
  [key: string]: {
    middleware: Middleware;
    paths: Paths;
  };
}

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
 * A plugin for **Aleph.js** application.
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
