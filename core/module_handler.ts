import { compileApplication } from "../compiler/compiler.ts";
import { ComponentType } from "../deps.ts";
import { ensureTextFile } from "../fs.ts";
import { path } from "../std.ts";
import { Modules } from "../types.ts";
import { AssetHandler } from "./asset_handler.ts";
import { Configuration } from "./configuration.ts";

interface ManifestModule {
  path: string;
  module: string;
}

interface Manifest {
  [key: string]: ManifestModule;
}

export class ModuleHandler {
  readonly modules: Modules;
  private manifest: Manifest;
  private readonly assetHandler: AssetHandler;
  private readonly mode: "test" | "development" | "production";

  constructor(
    assetHandler: AssetHandler,
    mode: "test" | "development" | "production",
  ) {
    this.assetHandler = assetHandler;
    this.mode = mode;
    this.modules = {};
    this.manifest = {};
  }

  get appRoot(): string {
    return this.assetHandler.appRoot;
  }

  async init(options: Record<string, boolean> = { building: false }) {
    if (this.mode === "production" && !options.building) {
      console.log("loading manifest");
      await this.loadManifest();
      this.setModules();
      console.log(this.modules);
      return;
    }

    console.log("compiling");
    await this.compile();
  }

  get(key: string): string {
    return this.modules[key];
  }

  set(key: string, value: string): string {
    return this.modules[key] = value;
  }

  keys(): Array<string> {
    return Object.keys(this.modules);
  }

  /**
   * Writes all files in `modules` to `${appRoot}/.tails/`
   */
  async writeAll(): Promise<void> {
    for (const key of this.keys()) {
      const module = this.get(key);
      const path = `${this.appRoot}/.tails/src/${key}`;

      this.manifest[key] = { path, module };
      await ensureTextFile(path, module);
    }

    await ensureTextFile(
      `${this.appRoot}/.tails/manifest.json`,
      JSON.stringify(this.manifest),
    );

    if (this.mode === "production") {
      // Copy files to /dist
    }

    console.log("MANIFEST");
    console.log(this.manifest);
  }

  async loadAppComponent(): Promise<ComponentType<any>> {
    try {
      const path = this.manifest["/pages/_app.tsx.js"].path;
      const { default: appComponent } = await import(path);

      return appComponent;
    } catch {
      throw new Error("Cannot find pages/_app.tsx");
    }
  }

  /**
   * Load boostrap file
   */
  async loadBootstrap(): Promise<string> {
    const decoder = new TextDecoder("utf-8");
    const data = await Deno.readFile(
      path.resolve("./") + "/browser/bootstrap.js",
    );

    return decoder.decode(data);
  }

  private async compile() {
    const options = {
      mode: this.mode,
    };

    await compileApplication(
      this,
      this.assetHandler.assetPath.bind(this.assetHandler),
      this.assetHandler.assetDir,
      this.assetHandler.appRoot,
      options,
    );

    console.log("COMPILED MODULES:\n");
    console.log(this.modules);
    console.log("\n");
  }

  private async loadManifest(): Promise<void> {
    const path = `${this.appRoot}/.tails/manifest.json`;
    const decoder = new TextDecoder("utf-8");
    const data = await Deno.readFile(path);

    this.manifest = JSON.parse(decoder.decode(data));
  }

  private setModules(): void {
    Object.keys(this.manifest)
      .forEach((key) => {
        this.modules[key] = this.manifest[key].module;
      });
  }
}
