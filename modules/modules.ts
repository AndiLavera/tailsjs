import { ComponentType } from "../deps.ts";
import { dynamicImport } from "../utils/dynamicImport.ts";
import { transpile as transpileModule } from "../compiler/compiler2.ts";

export default class Module {
  /* The full path of the module */
  fullPath: string;

  /* The path of the module after `/src` */
  srcPath: string;

  /* The contents from reading the file */
  content?: string;

  transpiledContent?: Record<string, Deno.TranspileOnlyResult>;

  /* The function after importing */
  importedModule?: any; // () => any?

  constructor(fullpath: string) {
    this.fullPath = fullpath;
    this.srcPath = fullpath.split("/src")[1];
  }

  get isPage() {
    return this.srcPath.includes("/pages");
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

  async transpile() {
    const decoder = new TextDecoder("utf-8");
    const data = await Deno.readFile(this.fullPath);
    const module: Record<string, string> = {};
    module[`${this.fullPath}`] = decoder.decode(data);

    this.transpiledContent = await transpileModule(module);
  }
}
