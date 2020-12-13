import { existsDirSync } from "../fs.ts";
import log from "../logger/logger.ts";
import { ensureDir, path } from "../std.ts";
import { createHTMLDocument } from "../vendor/deno-dom/document.ts";
import { version } from "../version.ts";
import { Configuration } from "./configuration.ts";
import { RouteHandler } from "../controller/route_handler.ts";
import { Modules } from "../types.ts";
import {
  compileApp,
  compilePages,
  writeCompiledFiles,
  writeModule,
} from "../compiler/compiler.ts";

export class Application {
  readonly config: Configuration;
  readonly appRoot: string;
  private bootstrap?: string;
  private readonly modules: Modules;
  private readonly routeHandler: RouteHandler;
  private readonly mode: "test" | "development" | "production";
  private readonly reload: boolean;

  constructor(
    appDir: string,
    mode: "test" | "development" | "production",
    reload = false,
  ) {
    this.appRoot = path.resolve(appDir);
    this.mode = mode;
    this.reload = reload;
    this.modules = {};
    this.config = new Configuration(appDir, mode);
    this.routeHandler = new RouteHandler(this.config);
  }

  get isDev() {
    return this.mode === "development";
  }

  get srcDir() {
    return path.join(this.appRoot, this.config.srcDir);
  }

  get buildDir() {
    return path.join(
      this.appRoot,
      ".tails",
      this.mode + "." + this.config.buildTarget,
    );
  }

  get routers() {
    return this.routeHandler.serverRouters;
  }

  async ready() {
    const startTime = performance.now();
    await this.config.loadConfig();
    await this.init(this.reload);
    log.info(
      "Project loaded in " + Math.round(performance.now() - startTime) + "ms",
    );
  }

  private async init(reload: boolean) {
    // const walkOptions = {
    //   includeDirs: false,
    //   exts: [".js", ".ts", ".mjs"],
    //   skip: [/^\./, /\.d\.ts$/i, /\.(test|spec|e2e)\.m?(j|t)sx?$/i],
    // };
    // const apiDir = path.join(this.srcDir, "api");
    const pagesDir = path.join(this.srcDir, "pages");

    if (!(existsDirSync(pagesDir))) {
      log.fatal(`'pages' directory not found.`);
    }

    if (reload) {
      if (existsDirSync(this.buildDir)) {
        await Deno.remove(this.buildDir, { recursive: true });
      }

      await ensureDir(this.buildDir);
    }

    await this.routeHandler.init(
      await this.loadBootstrap(),
    );

    await this.compile(); // sets `this.modules`

    await this.routeHandler.generateJSRoutes(this.modules);

    if (this.isDev) {
      // this._watch();
    }
  }

  private async compile() {
    await compileApp(`${this.config.appRoot}/src/pages/_app.tsx`, this.modules);
    const routes = this.routeHandler.webRoutes;
    console.log("COMPILE ROUTES");
    console.log(routes);
    await compilePages(
      this.routeHandler.webRoutes,
      this.modules,
      this.appRoot,
    );
    await writeModule(this.modules);
    await writeCompiledFiles(this.modules, this.appRoot);
  }

  /**
   * Load boostrap file
   */
  private async loadBootstrap() {
    const decoder = new TextDecoder("utf-8");
    const data = await Deno.readFile(
      path.resolve("./") + "/browser/bootstrap.js",
    );
    return decoder.decode(data);
  }
}
