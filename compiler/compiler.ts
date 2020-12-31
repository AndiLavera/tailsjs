import { path, walk } from "../std.ts";
import { ModuleHandler } from "../core/module_handler.ts";
import { Configuration } from "../core/configuration.ts";
import { generateHTML } from "../utils/generateHTML.tsx";
import { ComponentType } from "../deps.ts";
import { handlePlugins } from "./plugins.ts";

export async function transpileApplication(
  moduleHandler: ModuleHandler,
  config: Configuration,
  staticRoutes: string[],
) {
  // deno-lint-ignore no-explicit-any
  const modules: Record<string, any> = {};
  const { assetDir } = config;
  const pagesDir = config.assetPath("pages");

  const importMod = async (dir: string) => {
    return await import(
      path.join(pagesDir, dir)
    );
  };

  const { default: App } = await importMod("_app.tsx");
  const { default: Document } = await importMod("_document.tsx");

  /**
   * Callback invoked during compliation. Handles rendering ssg routes and returning
   * the html.
   *
   * @param path
   */
  const renderSSGModule = async (path: string): Promise<string | undefined> => {
    if (notRenderable(path)) return;

    if (!isStatic(staticRoutes, path)) return;

    return await render(path, App, Document);
  };

  await loadModules(config.srcDir, modules);
  const transpiledModules = await Deno.transpileOnly(modules);

  await setModules(
    transpiledModules,
    moduleHandler,
    assetDir,
    renderSSGModule,
  );
}

export async function render(
  path: string,
  // deno-lint-ignore no-explicit-any
  App: ComponentType<any>,
  // deno-lint-ignore no-explicit-any
  Document: ComponentType<any>,
): Promise<string | undefined> {
  const { default: Component } = await import(path);

  return generateHTML(
    App,
    Document,
    Component,
  );
}

function notRenderable(path: string) {
  return path.includes("_app") ||
    path.includes("_document") ||
    !path.includes("/pages");
}

function cleanKey(key: string, dir: string) {
  return key
    .replace(`${dir}`, "")
    .replace(/\.(jsx|mjs|tsx|js|ts?)/g, ".js");
}

function isStatic(staticRoutes: string[], path: string) {
  const hasStaticRoute = staticRoutes.filter((route) => path.includes(route));
  if (hasStaticRoute.length === 0) return false;

  return true;
}

async function loadModules(
  srcDir: string,
  modules: Record<string, any>,
) {
  const decoder = new TextDecoder("utf-8");
  const folders = Deno.readDirSync(srcDir);

  const callback = async (walkOptions: Record<string, any>) => {
    await walkSrc(folders, srcDir, walkOptions, decoder, modules);
  };

  await loadJsModules(callback);
  await loadCssModules(callback);
}

async function walkSrc(
  folders: Iterable<Deno.DirEntry>,
  srcDir: string,
  walkOptions: Record<string, any>,
  decoder: TextDecoder,
  modules: Record<string, any>,
) {
  for await (const folder of folders) {
    if (folder.isDirectory) {
      const folderName = path.join(srcDir, folder.name);

      for await (
        const { path: pathname } of walk(folderName, walkOptions)
      ) {
        const data = await Deno.readFile(pathname);
        const { transformedPath, transformedData } = await handlePlugins(
          pathname,
          decoder.decode(data),
        );

        modules[transformedPath] = transformedData;
      }
    }
  }
}

async function setModules(
  modules: Record<string, any>,
  moduleHandler: ModuleHandler,
  assetDir: string,
  renderSSGModule: (key: string) => Promise<string | undefined>,
) {
  for await (const moduleKey of Object.keys(modules)) {
    const key = cleanKey(moduleKey, assetDir);

    const html = await renderSSGModule(moduleKey);
    moduleHandler.modules[key] = {
      module: modules[moduleKey].source,
      html: html,
    };

    const sourceMap = modules[moduleKey].map;
    if (sourceMap) {
      moduleHandler.modules[`${key}.map`] = {
        module: sourceMap,
      };
    }
  }
}

async function loadJsModules(
  callback: (walkOptions: Record<string, any>) => Promise<void>,
) {
  const walkOptions = {
    includeDirs: true,
    exts: [".js", ".ts", ".mjs", ".jsx", ".tsx"],
    skip: [/^\./, /\.d\.ts$/i, /\.(test|spec|e2e)\.m?(j|t)sx?$/i],
  };

  await callback(walkOptions);
}

async function loadCssModules(
  callback: (walkOptions: Record<string, any>) => Promise<void>,
) {
  const walkOptions = {
    includeDirs: true,
    exts: [".css"],
  };

  await callback(walkOptions);
}
