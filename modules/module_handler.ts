import { ComponentType } from "../deps.ts";
import { ensureTextFile, existsFile } from "../fs.ts";
import { Configuration } from "../core/configuration.ts";
import log from "../logger/logger.ts";
import { RouteHandler } from "../router/route_handler.ts";
import { EventEmitter } from "../hmr/events.ts";
import Module from "../modules/module.ts";
import * as compiler from "../compiler/compiler.ts";
import utils from "../modules/utils.ts";
import * as renderer from "../modules/renderer.ts";
import { Manifest, ManifestModule, WebModules } from "../types.ts";
import { loadWebModule } from "../router/web_router.ts";
import { path, walk } from "../std.ts";
import { logBuildEvents } from "../utils/logBuildEvents.ts";

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
    staticRoutes: string[],
    options: Record<string, boolean> = { building: false },
  ): Promise<void> {
    // TODO: Make use of config.isBuilding
    if (this.config.mode === "production" && !options.building) {
      await this.loadManifest();
      await this.setManifestModules();
      await this.setDefaultComponents();
      return;
    }

    await this.compile(staticRoutes);
    await this.writeAll();
    await this.setDefaultComponents();
  }

  async build(routeHandler: RouteHandler) {
    await this.renderAll(routeHandler);
    await this.writeAll();
    await logBuildEvents(path.join(this.appRoot, ".tails"));
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

  private async compile(staticRoutes: string[]) {
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
      let cleanedKey = utils.cleanKey(pathname, this.config.appDir);
      cleanedKey = utils.cleanKey(pathname, this.config.serverDir);

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
      this.config.appDir,
      loadModule,
      walkOptions,
    );

    await compiler.walkDir(
      this.config.serverDir,
      loadModule,
      walkOptions,
    );

    let exts: string[] = [];
    let skip: RegExp[] = [];
    const includeDirs = true;

    compiler.forEach(({ walkOptions }) => {
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
      const cleanedKey = utils.cleanKey(pathname, this.config.appDir);

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
      this.config.appDir,
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
  private async setManifestModules() {
    const decoder = new TextDecoder();

    for await (const key of Object.keys(this.manifest)) {
      const { modulePath, htmlPath } = this.manifest[key];

      const moduleData = await Deno.readFile(modulePath);
      let htmlData;
      if (htmlPath) {
        htmlData = await Deno.readFile(htmlPath);
      }

      const module = new Module({
        fullpath: modulePath,
        content: decoder.decode(moduleData),
        html: htmlPath ? decoder.decode(htmlData) : undefined,
        isStatic: !!htmlPath,
        isPlugin: false,
        appRoot: this.appRoot,
        writePath: modulePath,
        source: decoder.decode(moduleData),
      });

      // await module.import();
      this.set(key, module);
    }
  }

  /**
   * Writes all files in `modules` to `${appRoot}/.tails/`
   */
  async writeAll(): Promise<void> {
    await this.writeModules();
    await this.writeManifest();

    if (this.config.isBuilding) {
      await this.writePublic();
    }
  }

  private async writePublic() {
    const publicDir = path.join(this.appRoot, "public");
    const decoder = new TextDecoder();

    for await (const { path: staticFilePath } of walk(publicDir)) {
      if (publicDir === staticFilePath) continue;

      const dir = path.dirname(staticFilePath);
      const filename = staticFilePath.replace(dir, "");
      const data = await Deno.readFile(staticFilePath);

      await ensureTextFile(
        path.join(this.appRoot, ".tails/public", filename),
        decoder.decode(data),
      );
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
    await module.write();

    const writePath = module.writePath as string;
    const manifestModule: ManifestModule = {
      modulePath: writePath,
    };

    if (module.isStatic) {
      manifestModule.htmlPath = module.htmlPath;
    }

    this.manifest[key] = manifestModule;
  }

  // TODO: Rename renderStatic
  private async renderAll(routeHandler: RouteHandler) {
    // TODO: loadApiModule?
    for await (const route of routeHandler.routes.web.routes) {
      // TODO: continue if static
      const webModule = await loadWebModule(
        route,
        this,
        routeHandler.webModules,
      );

      let props;
      if (webModule.controller.imp && route.method) {
        props = new webModule.controller.imp()[route.method]();
      }

      await webModule.page.module.render(
        // deno-lint-ignore no-explicit-any
        this.appComponent as ComponentType<any>,
        // deno-lint-ignore no-explicit-any
        this.documentComponent as ComponentType<any>,
        props,
      );
    }
  }

  /**
   * Loads App, Document & bootstrap.js. This MUST be called AFTER
   * `writeAll` as loadXComponent expects the manifest to be built.
   */
  private async setDefaultComponents(): Promise<void> {
    this.appComponent = await this.loadComponent("/app/pages/_app.js");
    this.documentComponent = await this.loadComponent(
      "/app/pages/_document.js",
    );
  }

  // deno-lint-ignore no-explicit-any
  private async loadComponent(key: string): Promise<ComponentType<any>> {
    const module = this.get(key);
    if (!module) {
      throw new Error(`Could not find ${key}`);
    }

    try {
      const { default: component } = await module.module();
      return component;
    } catch (err) {
      console.log(err);
      throw new Error(`Failed to import ${key}. Path: ${module.writePath}`);
    }
  }

  async watch(routeHandler: RouteHandler) {
    log.info("Start watching code changes...");

    // TODO: Watch controllers
    const watch = Deno.watchFs(this.config.appDir, { recursive: true });
    let reloading = false;

    for await (const event of watch) {
      if (event.kind === "access" || reloading) continue;

      log.debug(`Event kind: ${event.kind}`);
      if (event.kind !== "modify") continue;

      reloading = true;
      for (const path of event.paths) {
        const startTime = performance.now();
        const fileName = path.split("/").slice(-1)[0];
        // TODO: Remove file from modules if deleted?
        // Check if file was deleted
        if (!existsFile(path)) continue;

        log.debug(`Processing ${fileName}`);

        // TODO: Possibly make this 2 event listeners
        const transformedPath = await this.recompile(path);
        await routeHandler.reloadModule(path);

        // TODO: utils.cleanKey?
        const cleanPath = (transformedPath || path)
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

  private async recompile(filePath: string) {
    let key = utils.cleanKey(filePath, this.config.appDir);
    key = utils.cleanKey(filePath, this.config.serverDir);

    let module = this.modules.get(key);
    let transformedPath;

    if (!module) {
      transformedPath = await compiler.transformedPath(key);
      module = this.modules.get(transformedPath);
    }

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
    return transformedPath;
  }
}
