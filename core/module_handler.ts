import { render, transpileApplication } from "../compiler/compiler.ts";
import { ComponentType } from "../deps.ts";
import { ensureTextFile, existsFile } from "../fs.ts";
import { path } from "../std.ts";
import { Modules } from "../types.ts";
import { Configuration } from "./configuration.ts";
import { reDoubleQuotes, reHttp, reImportPath, reModuleExt } from "./utils.ts";
import log from "../logger/logger.ts";
import { RouteHandler } from "../controller/route_handler.ts";

interface ManifestModule {
  path: string;
  module: string;
  html?: string;
}

interface Manifest {
  [key: string]: ManifestModule;
}

export class ModuleHandler {
  bootstrap: string;
  appComponent?: ComponentType<any>;
  documentComponent?: ComponentType<any>;

  readonly modules: Modules;
  private manifest: Manifest;
  private readonly config: Configuration;

  constructor(config: Configuration) {
    this.config = config;
    this.modules = {};
    this.manifest = {};
    this.bootstrap = 'throw new Error("No Bootstrap Content")';
  }

  get appRoot(): string {
    return this.config.appRoot;
  }

  async init(
    options: Record<string, boolean> = { building: false },
  ): Promise<void> {
    // TODO: Make use of config.isBuilding
    if (this.config.mode === "production" && !options.building) {
      await this.loadManifest();
      this.setModules();
      await this.setDefaultComponents();
      return;
    }
  }

  async build(staticRoutes: string[]) {
    await this.compile(staticRoutes);
    this.rewriteImportPaths();
    await this.writeAll();

    await this.setDefaultComponents();

    if (this.config.mode === "production") {
      // TODO: Move files to dist folder
    }
  }

  get(key: string): { module: string; html?: string | undefined } {
    return this.modules[key];
  }

  set(key: string, module: string, html?: string): void {
    this.modules[key] = { module, html };
  }

  keys(): Array<string> {
    return Object.keys(this.modules);
  }

  async watch(routeHandler: RouteHandler, staticRoutes: string[]) {
    const watch = Deno.watchFs(this.config.srcDir, { recursive: true });
    log.info("Start watching code changes...");

    // TODO: Fix iterating twice per save
    for await (const event of watch) {
      if (event.kind === "access") continue;

      log.info(`Event kind: ${event.kind}`);
      for (const path of event.paths) {
        const startTime = performance.now();
        const fileName = path.split("/").slice(-1)[0];
        log.info(
          `Processing ${fileName}`,
        );
        // Check if file was deleted
        if (!existsFile(path)) continue;

        await this.recompile(path, staticRoutes);
        await this.reloadModule(routeHandler, path);

        log.info(
          `Processing completed in ${
            Math.round(performance.now() - startTime)
          }ms`,
        );
      }
    }
  }

  /**
   * Loads App, Document & bootstrap.js. This MUST be called AFTER
   * `writeAll` as loadXComponent expects the manifest to be built.
   */
  private async setDefaultComponents(): Promise<void> {
    this.appComponent = await this.loadAppComponent();
    this.documentComponent = await this.loadDocumentComponent();
    this.bootstrap = await this.loadBootstrap();
  }

  private async loadAppComponent(): Promise<ComponentType<any>> {
    try {
      const { path } = this.manifest["/pages/_app.js"];
      const { default: appComponent } = await import(path);

      return appComponent;
    } catch {
      // TODO: path is undefined due to block level scoping
      throw new Error(`Cannot find pages/_app.js. Path tried: ${path}`);
    }
  }

  private async loadDocumentComponent(): Promise<ComponentType<any>> {
    try {
      const { path } = this.manifest["/pages/_document.js"];
      const { default: documentComponent } = await import(path);

      return documentComponent;
    } catch {
      throw new Error(`Cannot find pages/_document.js. Path tried: ${path}`);
    }
  }

  /**
   * Load boostrap file
   */
  private async loadBootstrap(): Promise<string> {
    const decoder = new TextDecoder("utf-8");
    const data = await Deno.readFile(
      path.resolve("./") + "/browser/bootstrap.js",
    );

    return decoder.decode(data);
  }

  private async compile(staticRoutes: string[]): Promise<void> {
    await transpileApplication(
      this,
      this.config,
      staticRoutes,
    );
  }

  private async loadManifest(): Promise<void> {
    const path = `${this.appRoot}/.tails/manifest.json`;
    const decoder = new TextDecoder("utf-8");

    try {
      const data = await Deno.readFile(path);
      this.manifest = JSON.parse(decoder.decode(data));
    } catch {
      throw new Error(`Cannot load manifest. Path tried: ${path}`);
    }
  }

  /**
   * Iterate over `this.manifest` and set `this.modules`.
   */
  private setModules(): void {
    Object.keys(this.manifest)
      .forEach((key) => {
        const { module, html } = this.manifest[key];
        this.set(key, module, html);
      });
  }

  /**
   * Mutate & iterate over modules that are not `.map`
   * replacing all local import paths with `.ts`, `.tsx`
   * or `.jsx` with `.js`.
   */
  private rewriteImportPaths(): void {
    Object.keys(this.modules)
      .filter((key) => !key.includes(".map"))
      .forEach((key) => this.rewriteImportPath(key));
  }

  private rewriteImportPath(key: string): void {
    let { module } = this.modules[key];
    const matched = module.match(reImportPath) || [];

    matched.forEach((path) => {
      const importURL = path.match(reDoubleQuotes);

      if (importURL && importURL[0] && !importURL[0].match(reHttp)) {
        console.log(importURL[0]);
        const alteredPath = path.replace(/\.(jsx|mjs|tsx?)/g, ".js");
        module = module.replace(path, alteredPath);
      }
    });

    this.modules[key].module = module;
  }

  /**
   * Writes all files in `modules` to `${appRoot}/.tails/`
   */
  async writeAll(): Promise<void> {
    await this.writeModules();
    await this.writeManifest();

    if (this.config.mode === "production") {
      // TODO:
      // await this.writeHTML();
      // Copy files to /dist
    }
  }

  private async writeManifest() {
    await ensureTextFile(
      `${this.appRoot}/.tails/manifest.json`,
      JSON.stringify(this.manifest),
    );
  }

  private async writeModules() {
    for (const key of this.keys()) {
      await this.writeModule(key);
    }
  }

  private async writeModule(key: string) {
    const { module, html } = this.get(key);
    const path = `${this.appRoot}/.tails/src${key}`;

    this.manifest[key] = { path, module, html };
    await ensureTextFile(path, module);
    if (html) await ensureTextFile(`${path}.html`, html);
  }

  // TODO: Move into compiler?
  private async recompile(filePath: string, staticRoutes: string[]) {
    const modules: Record<string, any> = {};
    const decoder = new TextDecoder("utf-8");
    const data = await Deno.readFile(filePath);

    const key = filePath
      .replace(`${this.config.assetDir}`, "");

    modules[key] = decoder.decode(data);

    const transpiled = await Deno.transpileOnly(modules);

    let html;
    if (filePath.includes("/pages")) {
      html = await this.renderHTML(filePath, staticRoutes);
    }

    const JSKey = key.replace(/\.(jsx|mjs|tsx|ts|js?)/g, ".js");
    const sourceMap = transpiled[key].map;

    this.set(
      JSKey,
      transpiled[key].source,
      html,
    );
    if (sourceMap) {
      this.set(
        `${JSKey}.map`,
        sourceMap,
      );
    }

    this.rewriteImportPath(JSKey);
    this.rewriteImportPath(`${JSKey}.map`);
    await this.writeModule(JSKey);
    await this.writeModule(`${JSKey}.map`);
  }

  private async renderHTML(filePath: string, staticRoutes: string[]) {
    if (
      filePath.includes("_app") || filePath.includes("_document")
    ) {
      return;
    }

    const hasStaticRoute = staticRoutes.filter((route) =>
      filePath.includes(route)
    );
    if (hasStaticRoute.length === 0) return;

    const pagesDir = this.config.assetPath("pages");
    const { default: App } = await import(
      path.join(pagesDir, "_app.tsx")
    );

    const { default: Document } = await import(
      path.join(pagesDir, "_document.tsx")
    );

    // The `Math.random()` is to get around Deno's caching system
    // See: https://github.com/denoland/deno/issues/6946
    return await render(
      `${filePath}?version=${Math.random() + Math.random()}`,
      App,
      Document,
    );
  }

  private async reloadModule(routeHandler: RouteHandler, pathname: string) {
    const filePath = pathname.replace(this.config.srcDir, "");
    console.log(filePath);

    if (filePath.includes("/controllers")) {
      for await (const route of routeHandler.routes.api.routes) {
        if (filePath.includes(route.controller)) {
          routeHandler.loadAPIModule(route);
        }
      }

      for await (const route of routeHandler.routes.web.routes) {
        const { controller } = route;
        if (controller && filePath.includes(controller)) {
          routeHandler.loadWebModule(route);
        }
      }
    }

    if (filePath.includes("/pages")) {
      for await (const route of routeHandler.routes.web.routes) {
        const { controller } = route;
        if (controller && filePath.includes(controller)) {
          routeHandler.loadWebModule(route);
        }
      }
    }
  }
}
