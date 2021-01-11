import { ComponentType } from "../deps.ts";
import { ensureTextFile, existsFile } from "../fs.ts";
import { Configuration } from "../core/configuration.ts";
import log from "../logger/logger.ts";
import { RouteHandler } from "../router/route_handler.ts";
import { EventEmitter } from "../hmr/events.ts";
import Module from "./module.ts";
import * as compiler from "../compiler/compiler.ts";
import utils from "./utils.ts";
import { Manifest, ManifestModule } from "../types.ts";
import { loadWebModule } from "../router/web_router.ts";
import { path, walk } from "../std.ts";
import { logBuildEvents } from "../logger/utils.ts";
import { fetchReactAssets } from "../utils/fetchReactAssets.ts";

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
    this.eventListeners = [];
    this.manifest = {
      modules: {},
      reactLocalPaths: {
        reactPath: "",
        reactDomPath: "",
        reactDomServerPath: "",
      },
    };
  }

  get appRoot(): string {
    return this.config.rootDir;
  }

  async init(
    staticRoutes: string[],
    options: Record<string, boolean> = { building: false },
  ): Promise<void> {
    // TODO: Make use of config.isBuilding
    if (this.config.mode === "production" && !options.building) {
      this.manifest = await utils.loadManifest(
        path.join(this.config.buildDir, "/manifest.json"),
      );
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
    this.setReactPaths(
      await fetchReactAssets(this.config),
    );

    await compiler.compileApplication(
      staticRoutes,
      this.modules,
      this.config,
    );
  }

  /**
   * Writes all files in `this.modules`, the manifest
   * & in the public dir
   */
  async writeAll(): Promise<void> {
    await this.writeModules();
    await this.writeManifest();
    await this.writePublic();
  }

  /**
   * Iterate over `this.manifest` and set `this.modules`.
   */
  private async setManifestModules() {
    const decoder = new TextDecoder();

    for await (const key of Object.keys(this.manifest.modules)) {
      const { modulePath, htmlPath } = this.manifest.modules[key];

      const moduleData = await Deno.readFile(modulePath);
      let htmlData;
      if (htmlPath) {
        htmlData = await Deno.readFile(htmlPath);
      }

      // TODO: Manifest should include react url
      const module = new Module({
        fullpath: modulePath,
        content: decoder.decode(moduleData),
        html: htmlPath ? decoder.decode(htmlData) : undefined,
        isStatic: !!htmlPath,
        isPlugin: false,
        writePath: modulePath,
        source: decoder.decode(moduleData),
        config: this.config,
      });

      // await module.import();
      this.set(key, module);
    }

    this.config.reactWritePath = this.manifest.reactLocalPaths.reactPath;
    this.config.reactDOMWritePath = this.manifest.reactLocalPaths.reactDomPath;
    this.config.reactServerWritePath =
      this.manifest.reactLocalPaths.reactDomServerPath;
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
        path.join(this.config.buildDir, "public", filename),
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

    this.manifest.modules[key] = manifestModule;
  }

  // TODO: Rename renderStatic
  private async renderAll(routeHandler: RouteHandler) {
    // TODO: loadApiModule?
    // for await (const route of routeHandler.routes.web.routes) {
    //   // TODO: continue if static
    //   const webModule = await loadWebModule(
    //     route,
    //     this,
    //     routeHandler.webModules,
    //   );

    //   let props;
    //   if (webModule.controller.imp && route.method) {
    //     props = new webModule.controller.imp()[route.method]();
    //   }

    //   await webModule.page.module.render(
    //     // deno-lint-ignore no-explicit-any
    //     this.appComponent as ComponentType<any>,
    //     // deno-lint-ignore no-explicit-any
    //     this.documentComponent as ComponentType<any>,
    //     props,
    //   );
    // }
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
      for await (const path of event.paths) {
        const startTime = performance.now();
        const fileName = path.split("/").slice(-1)[0];
        // TODO: Remove file from modules if deleted?
        // Check if file was deleted
        if (!existsFile(path)) continue;

        log.debug(`Processing ${fileName}`);

        // TODO: Possibly make this 2 event listeners
        const transformedPath = await this.recompile(path);
        await routeHandler.reloadModule(path);

        this.eventListeners.forEach((eventListener) => {
          eventListener.emit(
            `${event.kind}-${transformedPath}`,
            transformedPath,
          );
        });

        log.debug(
          `Processing completed in ${
            Math.round(performance.now() - startTime)
          }ms`,
        );
      }

      setTimeout(() => (reloading = false), 100);
    }
  }

  private async recompile(filePath: string) {
    const key = utils.cleanKey(filePath, this.config.rootDir);

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
    return transformedPath || key;
  }

  private setReactPaths({
    reactDOMWritePath,
    reactWritePath,
    reactServerWritePath,
    reactHmrWritePath,
  }: {
    reactDOMWritePath: string;
    reactWritePath: string;
    reactServerWritePath: string;
    reactHmrWritePath: string | undefined;
  }) {
    this.config.reactWritePath = reactWritePath;
    this.config.reactDOMWritePath = reactDOMWritePath;
    this.config.reactServerWritePath = reactServerWritePath;
    this.config.reactHmrWritePath = reactHmrWritePath;
    this.manifest.reactLocalPaths.reactPath = reactWritePath;
    this.manifest.reactLocalPaths.reactDomPath = reactDOMWritePath;
    this.manifest.reactLocalPaths.reactDomServerPath = reactServerWritePath;
  }
}
