import { ComponentType } from "../deps.ts";
import { dynamicImport } from "../utils/dynamicImport.ts";
import { transpile as transpileModule } from "../compiler/compiler2.ts";
import { ensureTextFile } from "../fs.ts";

interface Options {
  fullpath: string;
  html?: string;
  source?: string;
  map?: string;
  content?: string;
  isStatic?: boolean;
}

export default class Module {
  /** The full path of the module */
  fullPath: string;

  /** The path of the module after `/src` */
  srcPath: string;

  /** Is a static route */
  isStatic: boolean;

  /** The contents from reading the file */
  content?: string;

  /** Source results from transpiling */
  source?: string;

  /** Source map from transpiling */
  map?: string;

  html?: string;
  writePath?: string;

  /** The function after importing */
  private importedModule?: any; // () => any?

  constructor({ fullpath, html, source, map, content, isStatic }: Options) {
    this.fullPath = fullpath;
    this.html = html;
    this.source = source;
    this.map = map;
    this.content = content;
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
    const decoder = new TextDecoder("utf-8");
    const data = await Deno.readFile(this.fullPath);
    const module: Record<string, string> = {};
    module[`${this.fullPath}`] = decoder.decode(data);

    const transpiledContent = await transpileModule(module);
    this.source = transpiledContent[`${this.fullPath}`].source;
    this.map = transpiledContent[`${this.fullPath}`].map;
  }

  async write(writePath: string) {
    this.writePath = writePath;

    await ensureTextFile(writePath, this.source as string);
    if (this.html) await ensureTextFile(`${writePath}.html`, this.html);
  }
}
