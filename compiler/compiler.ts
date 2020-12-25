import { path, walk } from "../std.ts";
import { Modules } from "../types.ts";
import { ensureTextFile } from "../fs.ts";
import { reModuleExt } from "../core/utils.ts";
import { ModuleHandler } from "../core/module_handler.ts";
import { Configuration } from "../core/configuration.ts";
import { generateHTML } from "../utils/setHTMLRoutes.tsx";
import { ComponentType } from "../deps.ts";

export async function transpileApplication(
  moduleHandler: ModuleHandler,
  config: Configuration,
  staticRoutes: string[],
) {
  const modules: Record<string, any> = {};
  const decoder = new TextDecoder("utf-8");

  const walkOptions = {
    includeDirs: true,
    exts: [".js", ".ts", ".mjs", ".jsx", ".tsx"],
    skip: [/^\./, /\.d\.ts$/i, /\.(test|spec|e2e)\.m?(j|t)sx?$/i],
  };

  const root = path.join(config.appRoot, "src");
  const folders = Deno.readDirSync(root);
  const { mode, assetDir } = config;
  const pagesDir = config.assetPath("pages");

  const { default: App } = await import(
    path.join(pagesDir, "_app.tsx")
  );

  const { default: Document } = await import(
    path.join(pagesDir, "_document.tsx")
  );

  // TODO: Transpile conrollers for loading
  // const apiDir = assetPath("controllers");
  // for await (const { path } of walk(apiDir, walkOptions)) {
  //   console.log();
  // }

  /**
   * Callback invoked during compliation. Handles rendering ssg routes and returning
   * the html.
   *
   * @param path
   */
  const renderSSGModule = async (path: string): Promise<string | undefined> => {
    if (
      path.includes("_app") ||
      path.includes("_document") ||
      !path.includes("/pages")
    ) {
      return;
    }

    const hasStaticRoute = staticRoutes.filter((route) => path.includes(route));
    if (hasStaticRoute.length === 0) return;

    return await render(path, App, Document);
  };

  for await (const folder of folders) {
    if (folder.isDirectory) {
      const folderName = path.join(root, folder.name);

      for await (
        const { path: pathname } of walk(folderName, walkOptions)
      ) {
        const data = await Deno.readFile(pathname);

        modules[pathname] = decoder.decode(data);
      }
    }
  }

  const transpiledModules = await Deno.transpileOnly(modules);

  for (const moduleKey of Object.keys(transpiledModules)) {
    const key = moduleKey
      .replace(`${assetDir}`, "")
      .replace(/\.(jsx|mjs|tsx|js|ts?)/g, ".js");

    const html = await renderSSGModule(moduleKey);
    moduleHandler.modules[key] = {
      module: transpiledModules[moduleKey].source,
      html: html,
    };

    const sourceMap = transpiledModules[moduleKey].map;
    if (sourceMap) {
      moduleHandler.modules[`${key}.map`] = {
        module: sourceMap,
      };
    }
  }
}

export async function render(
  path: string,
  App: ComponentType<any>,
  Document: ComponentType<any>,
): Promise<string | undefined> {
  const { default: Component } = await import(path);

  return generateHTML(
    App,
    Document,
    Component,
  );
}
