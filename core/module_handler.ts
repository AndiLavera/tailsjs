import { compileApplication } from "../compiler/compiler.ts";
import { ComponentType } from "../deps.ts";
import { ensureTextFile } from "../fs.ts";
import { path } from "../std.ts";
import { Modules } from "../types.ts";
import { Configuration } from "./configuration.ts";
import { generateHTML } from "../utils/setHTMLRoutes.tsx";

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
      return;
    }
  }

  async build(staticRoutes: string[]) {
    await this.compile(staticRoutes);
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
      // const path = this.config.assetPath("pages/_app.tsx");
      const path = this.manifest["/pages/_app.tsx.js"].path;
      const { default: appComponent } = await import(path);

      return appComponent;
    } catch {
      throw new Error(`Cannot find pages/_app.tsx. Path tried: ${path}`);
    }
  }

  private async loadDocumentComponent(): Promise<ComponentType<any>> {
    try {
      // const path = this.config.assetPath("pages/_document.tsx");
      const path = this.manifest["/pages/_document.tsx.js"].path;
      const { default: documentComponent } = await import(path);

      return documentComponent;
    } catch {
      throw new Error(`Cannot find pages/_document.tsx. Path tried: ${path}`);
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
    await compileApplication(
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

  private setModules(): void {
    Object.keys(this.manifest)
      .forEach((key) => {
        const { module } = this.manifest[key];
        this.set(key, module);
      });
  }

  /**
   * Writes all files in `modules` to `${appRoot}/.tails/`
   */
  async writeAll(): Promise<void> {
    await this.writeModules();
    await this.writeManifest();

    if (this.config.mode === "production") {
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
}
