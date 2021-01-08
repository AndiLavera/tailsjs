import { ComponentType } from "../deps.ts";
import { dynamicImport } from "../utils/dynamicImport.ts";
import * as compiler from "../compiler/compiler.ts";
import * as plugins from "../compiler/plugins.ts";
import { ensureTextFile } from "../fs.ts";
import { path } from "../std.ts";
import utils from "./utils.ts";
import { generateHTML } from "../utils/generateHTML.tsx";

interface Options {
  fullpath: string;
  appRoot: string;
  html?: string;
  source?: string;
  map?: string;
  content?: string;
  isStatic?: boolean;
  isPlugin?: boolean;
  writePath?: string;
}

export default class Module {
  /** The full path of the module */
  fullPath: string;

  /** The path of the module after `/src` */
  srcPath: string;

  /** The path the module will get written to. */
  appRoot: string;

  /** `true` if this module is a static route */
  isStatic: boolean;

  /**
   * `true` if this module is a plugin module
   * such as `.css` files.
   */
  isPlugin: boolean;

  /** The contents from reading the file */
  content?: string;

  /** Source results from transpiling */
  source?: string;

  /** Source map from transpiling */
  map?: string;

  html?: string;

  writePath?: string;

  /** The function after importing */
  // deno-lint-ignore no-explicit-any
  private importedModule?: any;

  constructor(
    {
      fullpath,
      html,
      source,
      map,
      content,
      isStatic,
      isPlugin,
      appRoot,
      writePath,
    }: Options,
  ) {
    this.fullPath = fullpath;
    this.html = html;
    this.source = source;
    this.map = map;
    this.content = content;
    this.appRoot = appRoot;
    this.writePath = writePath;
    this.isPlugin = isPlugin || false;
    this.isStatic = isStatic || false;
    this.srcPath = utils.cleanKey(fullpath, this.appRoot);
  }

  get isPage() {
    return this.srcPath.includes("/pages");
  }

  async module() {
    return this.importedModule || await this.import();
  }

  async import() {
    if (this.importedModule) {
      this.importedModule = await dynamicImport(
        "file://" + this.writePath as string,
      );
      return this.importedModule;
    }

    this.importedModule = await import("file://" + this.writePath as string);
    return this.importedModule;
  }

  render(
    // deno-lint-ignore no-explicit-any
    App: ComponentType<any>,
    // deno-lint-ignore no-explicit-any
    Document: ComponentType<any>,
    // deno-lint-ignore no-explicit-any
    props: Record<string, any> = {},
  ) {
    if (!this.isPage) return;

    if (!this.importedModule) {
      throw new Error("Must import module before rendering");
    }

    const html = generateHTML(
      App,
      Document,
      this.importedModule.default,
      props,
    );

    if (this.isStatic) {
      this.html = html;
    }

    return html;
  }

  fetchHTML(
    // deno-lint-ignore no-explicit-any
    App: ComponentType<any>,
    // deno-lint-ignore no-explicit-any
    Document: ComponentType<any>,
    // deno-lint-ignore no-explicit-any
    props: Record<string, any> = {},
  ) {
    return this.html || this.render(
      App,
      Document,
      props,
    );
  }

  async transpile(): Promise<string> {
    const content = this.content as string;
    const module: Record<string, string> = {};
    module[this.fullPath] = content;
    let result;

    if (this.isPlugin) {
      result = await plugins.transform(module);
    } else {
      const transformedModule = await plugins.transform(module);
      result = await compiler.transpile(transformedModule);
    }

    for (const key of Object.keys(result)) {
      const cleanedKey = utils.cleanKey(key, this.appRoot);
      this.writePath = path.join(this.appRoot, ".tails", cleanedKey);
      const module = result[key];

      if (typeof module === "string") {
        this.source = module;
      }

      if (typeof module === "object") {
        this.source = module.source;
        this.map = module.map;
      }
    }

    return utils.removeDir(
      this.writePath as string,
      path.join(this.appRoot, ".tails/src"),
    );
  }

  async retranspile() {
    await this.loadFile();
    console.log("retranspile");
    console.log(this);
    await this.transpile();
    console.log(this);
  }

  async write() {
    if (this.writePath) {
      await ensureTextFile(this.writePath, this.source as string);
      if (this.html) {
        await ensureTextFile(
          this.writePath.replace(".js", ".html"),
          this.html,
        );
      }
    } else {
      throw new Error(`Module ${this.srcPath} has no writePath`);
    }
  }

  private async loadFile(): Promise<string> {
    const decoder = new TextDecoder("utf-8");
    const data = await Deno.readFile(this.fullPath);
    this.content = decoder.decode(data);
    return this.content;
  }
}
