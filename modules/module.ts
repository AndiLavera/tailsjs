import { ComponentType } from "../deps.ts";
import { dynamicImport } from "../utils/dynamicImport.ts";
import * as compiler from "../compiler/compiler.ts";
import * as plugins from "../compiler/plugins.ts";
import { ensureTextFile } from "../fs.ts";

interface Options {
  fullpath: string;
  writePath: string;
  html?: string;
  source?: string;
  map?: string;
  content?: string;
  isStatic?: boolean;
  isPlugin?: boolean;
}

export default class Module {
  /** The full path of the module */
  fullPath: string;

  /** The path of the module after `/src` */
  srcPath: string;

  /** The path the module will get written to. */
  writePath: string;

  /** Is a static route */
  isStatic: boolean;

  /** The contents from reading the file */
  content?: string;

  /** Source results from transpiling */
  source?: string;

  /** Source map from transpiling */
  map?: string;

  html?: string;

  isPlugin: boolean;

  /** The function after importing */
  private importedModule?: any; // () => any?

  constructor(
    { fullpath, html, source, map, content, isStatic, isPlugin, writePath }:
      Options,
  ) {
    this.fullPath = fullpath;
    this.html = html;
    this.source = source;
    this.map = map;
    this.content = content;
    this.writePath = writePath;
    this.isPlugin = isPlugin || false;
    this.isStatic = isStatic || false;
    this.srcPath = fullpath.split("/src")[1];
  }

  get isPage() {
    return this.srcPath.includes("/pages");
  }

  get module() {
    return this.importedModule || this.importModule;
  }

  // TODO: Any?
  set module(module: any) {
    this.importedModule = module;
  }

  // deno-lint-ignore no-explicit-any
  async importModule(): Promise<ComponentType<any>> {
    if (this.importedModule) {
      this.importedModule = await dynamicImport(this.fullPath);
      return this.importedModule;
    }

    this.importedModule = await import(this.fullPath);
    return this.importedModule;
  }

  async loadFile(): Promise<string> {
    const decoder = new TextDecoder("utf-8");
    const data = await Deno.readFile("hello.txt");
    this.content = decoder.decode(data);
    return this.content;
  }

  async render(
    // deno-lint-ignore no-explicit-any
    App: ComponentType<any>,
    // deno-lint-ignore no-explicit-any
    Document: ComponentType<any>,
  ) {
  }

  async retranspile() {
    if (this.isPlugin) {
      console.log("PLUGIN RETRANSPILE NOT DONE");
    } else {
      const decoder = new TextDecoder("utf-8");
      const module: Record<string, string> = {};
      const key = `${this.fullPath}`;

      const data = await Deno.readFile(this.fullPath);
      module[key] = decoder.decode(data);

      const transformedModule = await plugins.transform(module);
      const transpiledModule = await compiler.transpile(transformedModule);

      this.source = transpiledModule[key].source;
      this.map = transpiledModule[key].map;
    }
  }

  async write() {
    await ensureTextFile(this.writePath, this.source as string);
    if (this.html) await ensureTextFile(`${this.writePath}.html`, this.html);
  }
}
