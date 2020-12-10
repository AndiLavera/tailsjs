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

    // TODO: Load user assets

    if (this.isDev) {
      // this._watch();
    }
  }
}
