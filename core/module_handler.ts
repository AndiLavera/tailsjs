import { render } from "../compiler/compiler.old.ts";
import { ComponentType } from "../deps.ts";
import { ensureTextFile, existsFile } from "../fs.ts";
import { path } from "../std.ts";
import { Configuration } from "./configuration.ts";
import log from "../logger/logger.ts";
import { RouteHandler } from "../controller/route_handler.ts";
import { EventEmitter } from "../hmr/events.ts";
import Module from "../modules/module.ts";
import * as compiler from "../compiler/compiler.ts";
import * as plugins from "../compiler/plugins.ts";
import utils from "../modules/utils.ts";
import * as renderer from "../modules/renderer.ts";
import { Manifest } from "../types.ts";

export class ModuleHandler {
  // deno-lint-ignore no-explicit-any
  appComponent?: ComponentType<any>;
  // deno-lint-ignore no-explicit-any
  documentComponent?: ComponentType<any>;

  readonly modules: Map<string, Module>;
  private manifest: Manifest;
  private readonly config: Configuration;
  private readonly eventListeners: EventEmitter[];

  constructor(config: Configuration) {
    this.config = config;
    this.modules = new Map();
    this.manifest = {};
    this.eventListeners = [];
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
      this.setManifestModules();
      await this.setDefaultComponents();
      return;
    }
  }

  async build(staticRoutes: string[]) {
    // const compiledResults = await this.compile();
    // await this.setModules(compiledResults, staticRoutes);
    await this.loadModules(staticRoutes);
    await this.writeAll();
    await this.setDefaultComponents();

    if (this.config.mode === "production") {
      // TODO: Move files to dist folder
    }
  }

  get(key: string): Module | undefined {
    return this.modules.get(key);
  }

  set(key: string, module: Module): void {
    this.modules.set(key, module);
  }

  keys(): IterableIterator<string> {
    return this.modules.keys();
  }

  addEventListener() {
    const e = new EventEmitter();
    this.eventListeners.push(e);
    return e;
  }

  removeEventListener(e: EventEmitter) {
    e.removeAllListeners();
    const index = this.eventListeners.indexOf(e);
    if (index > -1) {
      this.eventListeners.splice(index, 1);
    }
  }

  // TODO: Rename to compile
  private async loadModules(staticRoutes: string[]) {
    const decoder = new TextDecoder();
    const walkOptions = {
      includeDirs: true,
      exts: [".js", ".ts", ".mjs", ".jsx", ".tsx"],
      skip: [/^\./, /\.d\.ts$/i, /\.(test|spec|e2e)\.m?(j|t)sx?$/i],
    };

    /**
     * Handles fetching the file, creating a new modules, transpiling it
     * & setting it into `this.modules`.
     *
     * @param pathname
     */
    const loadModule = async (pathname: string) => {
      const data = await Deno.readFile(pathname);
      const cleanedKey = utils.cleanKey(pathname, this.config.srcDir);

      const module = new Module({
        fullpath: pathname,
        content: decoder.decode(data),
        isStatic: renderer.isStatic(staticRoutes, cleanedKey),
        isPlugin: false,
        appRoot: this.appRoot,
      });

      const key = await module.transpile();
      this.modules.set(key, module);
    };

    await compiler.walkDir(
      this.config.srcDir,
      loadModule,
      walkOptions,
    );

    let exts: string[] = [];
    let skip: RegExp[] = [];
    const includeDirs = true;

    plugins.forEach(({ walkOptions }) => {
      if (walkOptions) {
        if (walkOptions.exts) {
          exts = exts.concat(walkOptions.exts);
        }

        if (walkOptions.skip) {
          skip = skip.concat(walkOptions.skip);
        }
      }
    });

    /**
     * Handles fetching the file, creating a new modules, transpiling it
     * & setting it into `this.modules`.
     *
     * @param pathname
     */
    const loadPlugin = async (pathname: string) => {
      const data = await Deno.readFile(pathname);
      const cleanedKey = utils.cleanKey(pathname, this.config.srcDir);

      const module = new Module({
        fullpath: pathname,
        content: decoder.decode(data),
        isStatic: renderer.isStatic(staticRoutes, cleanedKey),
        isPlugin: true,
        appRoot: this.appRoot,
      });

      const key = await module.transpile();
      this.modules.set(key, module);
    };

    const pluginWalkOptions = {
      includeDirs,
      exts,
      skip,
    };

    await compiler.walkDir(
      this.config.srcDir,
      loadPlugin,
      pluginWalkOptions,
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
  private setManifestModules(): void {
    Object.keys(this.manifest)
      .forEach((key) => {
        const { module, html } = this.manifest[key];
        // TODO
        // this.set(key, module, html);
      });
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
    for await (const key of this.keys()) {
      await this.writeModule(key);
    }
  }

  private async writeModule(key: string) {
    const module = (this.get(key) as Module);
    const writePath = `${this.appRoot}/.tails/src${key}`;

    this.manifest[key] = {
      path: writePath,
      module: module.source as string,
      html: module.html,
    };

    await module.write();
  }

  // TODO: Move into compiler?
  private async recompile(filePath: string, staticRoutes: string[]) {
    const key = utils.cleanKey(filePath, this.config.srcDir);
    const module = this.modules.get(key);

    if (!module) {
      throw new Error(
        `WatchError: Module could not be reloaded.
        Path: ${filePath}
        Key: ${key}
        `,
      );
    }

    await module.retranspile();
    await module.write();

    Deno.exit(5);

    // const modules: Record<string, string> = {};
    // const decoder = new TextDecoder("utf-8");
    // const data = await Deno.readFile(filePath);

    // modules[key] = decoder.decode(data);

    // const transpiled = await Deno.transpileOnly(modules);

    // // let html;
    // // if (filePath.includes("/pages")) {
    // //   html = await this.renderHTML(filePath, staticRoutes);
    // // }

    // const JSKey = key.replace(/\.(jsx|mjs|tsx|ts|js?)/g, ".js");
    // const sourceMap = transpiled[key].map;

    // this.set(
    //   JSKey,
    //   transpiled[key].source,
    //   html,
    // );
    // if (sourceMap) {
    //   this.set(
    //     `${JSKey}.map`,
    //     sourceMap,
    //   );
    // }

    // this.rewriteImportPath(JSKey);
    // this.rewriteImportPath(`${JSKey}.map`);
    // await this.writeModule(JSKey);
    // await this.writeModule(`${JSKey}.map`);
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

  /**
   * Loads App, Document & bootstrap.js. This MUST be called AFTER
   * `writeAll` as loadXComponent expects the manifest to be built.
   */
  private async setDefaultComponents(): Promise<void> {
    this.appComponent = await this.loadComponent("/pages/_app.js");
    this.documentComponent = await this.loadComponent("/pages/_document.js");
  }

  // deno-lint-ignore no-explicit-any
  private async loadComponent(key: string): Promise<ComponentType<any>> {
    const module = this.get(key);
    if (!module) {
      throw new Error(`Could not find ${key}`);
    }

    try {
      const { default: component } = await module.module;
      return component;
    } catch (err) {
      console.log(err);
      throw new Error(`Failed to import ${key}. Path: ${module.writePath}`);
    }
  }

  async watch(routeHandler: RouteHandler, staticRoutes: string[]) {
    log.info("Start watching code changes...");

    const watch = Deno.watchFs(this.config.srcDir, { recursive: true });
    let reloading = false;

    for await (const event of watch) {
      if (event.kind === "access" || reloading) continue;

      log.debug(`Event kind: ${event.kind}`);

      if (event.kind !== "modify") continue;

      reloading = true;
      for (const path of event.paths) {
        const startTime = performance.now();
        const fileName = path.split("/").slice(-1)[0];

        log.debug(`Processing ${fileName}`);
        // Check if file was deleted
        if (!existsFile(path)) continue;

        // TODO: Possibly make this 2 event listeners
        await this.recompile(path, staticRoutes);
        await routeHandler.reloadModule(path);

        const cleanPath = path
          .replace(`${this.config.assetDir}`, "")
          .replace(/\.(jsx|mjs|tsx|ts?)/g, ".js");

        this.eventListeners.forEach((eventListener) => {
          eventListener.emit(
            `${event.kind}-${cleanPath}`,
            cleanPath,
          );
        });

        log.debug(
          `Processing completed in ${
            Math.round(performance.now() - startTime)
          }ms`,
        );
      }

      setTimeout(() => (reloading = false), 500);
    }
  }
}
