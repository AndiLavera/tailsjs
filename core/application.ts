import { existsDirSync } from "../fs.ts";
import log from "../logger/logger.ts";
import { ensureDir, path } from "../std.ts";
import { createHTMLDocument } from "../vendor/deno-dom/document.ts";
import { version } from "../version.ts";
import { Configuration } from "./configuration.ts";

export class Application {
  readonly config: Configuration;
  readonly appRoot: string;
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
    this.config = new Configuration(appDir, mode);
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

  async ready() {
    const startTime = performance.now();
    await this.config.loadConfig();
    await this.init(this.reload);
    log.info(
      "Project loaded in " + Math.round(performance.now() - startTime) + "ms",
    );
  }

  private async init(reload: boolean) {
    const walkOptions = {
      includeDirs: false,
      exts: [".js", ".ts", ".mjs"],
      skip: [/^\./, /\.d\.ts$/i, /\.(test|spec|e2e)\.m?(j|t)sx?$/i],
    };
    const apiDir = path.join(this.srcDir, "api");
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

    // import postcss plugins
    // await Promise.all(this.config.postcss.plugins.map(async (p) => {
    //   let name: string;
    //   if (typeof p === "string") {
    //     name = p;
    //   } else {
    //     name = p.name;
    //   }
    //   const { default: Plugin } = await import(
    //     `https://esm.sh/${name}?external=postcss@8.1.4&no-check`
    //   );
    //   this.#postcssPlugins[name] = Plugin;
    // }));

    // inject virtual browser gloabl objects
    Object.assign(globalThis, {
      __createHTMLDocument: () => createHTMLDocument(),
      document: createHTMLDocument(),
      navigator: {
        connection: {
          downlink: 1.5,
          effectiveType: "3g",
          onchange: null,
          rtt: 300,
          saveData: false,
        },
        cookieEnabled: false,
        deviceMemory: 0,
        hardwareConcurrency: 0,
        language: "en",
        maxTouchPoints: 0,
        onLine: true,
        userAgent: `Deno/${Deno.version.deno}`,
        vendor: "Deno Land",
      },
      location: {
        protocol: "http:",
        host: "localhost",
        hostname: "localhost",
        port: "",
        href: "https://localhost/",
        origin: "https://localhost",
        pathname: "/",
        search: "",
        hash: "",
        reload() {},
        replace() {},
        toString() {
          return this.href;
        },
      },
      innerWidth: 1920,
      innerHeight: 1080,
      devicePixelRatio: 1,
      $RefreshReg$: () => {},
      $RefreshSig$: () => (type: any) => type,
    });

    // inject env variables
    // Object.entries({
    //   ...this.config.env,
    //   __version: version,
    //   __buildMode: this.mode,
    //   __buildTarget: this.config.buildTarget,
    // }).forEach(([key, value]) => Deno.env.set(key, value));

    // change current work dir to appDoot
    // Deno.chdir(this.appRoot);

    // for await (
    //   const { path: p } of walk(
    //     this.srcDir,
    //     {
    //       ...walkOptions,
    //       maxDepth: 1,
    //       exts: [...walkOptions.exts, ".jsx", ".tsx"],
    //     },
    //   )
    // ) {
    //   const name = path.basename(p);
    //   switch (name.replace(reModuleExt, "")) {
    //     case "app":
    //     case "404":
    //     case "loading":
    //       await this._compile("/" + name);
    //       break;
    //   }
    // }

    // if (existsDirSync(apiDir)) {
    //   for await (const { path: p } of walk(apiDir, walkOptions)) {
    //     const mod = await this._compile(
    //       "/api" + util.trimPrefix(p, apiDir).split("\\").join("/"),
    //     );
    //     this.#apiRouting.update(this._getRouteModule(mod));
    //   }
    // }

    // for await (
    //   const { path: p } of walk(
    //     pagesDir,
    //     { ...walkOptions, exts: [...walkOptions.exts, ".jsx", ".tsx", ".md"] },
    //   )
    // ) {
    //   const rp = util.trimPrefix(p, pagesDir).split("\\").join("/");
    //   const mod = await this._compile("/pages" + rp);
    //   this.#routing.update(this._getRouteModule(mod));
    // }

    // const precompileUrls = [
    //   "https://deno.land/x/aleph/bootstrap.ts",
    //   "https://deno.land/x/aleph/nomodule.ts",
    //   "https://deno.land/x/aleph/tsc/tslib.js",
    // ];
    // if (this.isDev) {
    //   precompileUrls.push("https://deno.land/x/aleph/hmr.ts");
    // }
    // for (const url of precompileUrls) {
    //   await this._compile(url);
    // }
    // await this._compile(
    //   "https://deno.land/x/aleph/renderer.ts",
    //   { forceTarget: "es2020" },
    // );
    // await this._createMainModule();

    // const { renderPage } = await import(
    //   "file://" + this.#modules.get("//deno.land/x/aleph/renderer.js")!.jsFile
    // );
    // this.#renderer = { renderPage };

    // log.info(colors.bold(`Aleph.js v${version}`));
    // if (this.config.__file) {
    //   log.info(colors.bold("- Config"));
    //   log.info("  ▲", this.config.__file);
    // }
    // log.info(colors.bold("- Global"));
    // if (this.#modules.has("/app.js")) {
    //   log.info("  ✓", "Custom App");
    // }
    // if (this.#modules.has("/404.js")) {
    //   log.info("  ✓", "Custom 404 Page");
    // }
    // if (this.#modules.has("/loading.js")) {
    //   log.info("  ✓", "Custom Loading Page");
    // }

    // if (this.isDev) {
    //   if (this.#apiRouting.paths.length > 0) {
    //     log.info(colors.bold("- APIs"));
    //   }
    //   for (const path of this.#apiRouting.paths) {
    //     log.info("  λ", path);
    //   }
    //   log.info(colors.bold("- Pages"));
    //   for (const path of this.#routing.paths) {
    //     const isIndex = path == "/";
    //     log.info("  ○", path, isIndex ? colors.dim("(index)") : "");
    //   }
    // }

    if (this.isDev) {
      // this._watch();
    }
  }
}
