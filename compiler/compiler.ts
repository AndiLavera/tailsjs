import { CompilerOptions, CompilerPlugin } from "../types.ts";
import rewriteImports from "./plugins/rewriteImports.ts";
import cssModule from "./plugins/cssModule.ts";
import wasm from "./plugins/wasm.ts";
import css from "./plugins/css.ts";
import fetchRemote from "./plugins/fetchRemote.ts";
import { reImportPath } from "../core/utils.ts";
import { path, walk, WalkOptions } from "../std.ts";
import utils from "../modules/utils.ts";
import Module from "../modules/module.ts";
import { Configuration } from "../core/configuration.ts";
import * as renderer from "../modules/renderer.ts";

const plugins = [rewriteImports, cssModule, wasm, css, fetchRemote];

/**
 * Handles iterating through all modules passing the module & key
 * into plugin.preTransform. All modules are passed into `resolve`
 * in case they have unsupported imports.
 *
 * @param modules
 */
export async function transform(
  modules: Record<string, string>,
  opts: CompilerOptions = {},
) {
  const transformedModules: Record<string, string> = {};

  for await (const key of Object.keys(modules)) {
    const module: { key: string; content: string } = {
      key,
      content: modules[key],
    };

    for await (const plugin of plugins) {
      if (module.key.match(plugin.test) && plugin.transform) {
        module.content = await plugin.transform({
          pathname: module.key,
          content: module.content,
        }, opts);

        let transformedPath;
        if (plugin.resolve) {
          transformedPath = await plugin.resolve(module.key, opts);
        }

        if (transformedPath) {
          module.key = transformedPath;
        }
      }
    }

    module.content = await resolve(module.content, opts);
    transformedModules[module.key] = module.content;
  }

  return transformedModules;
}

/**
 * Handles iterating over the imports of a module and
 * passing the import path into a plugin.
 *
 * @param content
 */
async function resolve(content: string, opts: CompilerOptions) {
  const matchedImports = content.match(reImportPath) || [];
  let transformedContent = content;

  for await (const imp of matchedImports) {
    for await (const plugin of plugins) {
      let transformedImp = imp;
      if (imp.match(plugin.test) && plugin.resolve) {
        transformedImp = await plugin.resolve(imp, opts);
      }

      transformedContent = transformedContent.replace(imp, transformedImp);
    }
  }

  return transformedContent;
}

export async function transformedPath(pathname: string) {
  let transformedPath = pathname;

  for await (const plugin of plugins) {
    if (pathname.match(plugin.test) && plugin.resolve) {
      transformedPath = await plugin.resolve(pathname, {});
    }
  }

  return transformedPath;
}

export async function walkDir(
  pathname: string,
  callback: (pathname: string) => Promise<void>,
  walkOptions?: WalkOptions,
) {
  const folders = Deno.readDirSync(pathname);

  for await (const folder of folders) {
    if (folder.isDirectory) {
      const folderName = path.join(pathname, folder.name);

      for await (
        const { path: pathname } of walk(folderName, walkOptions)
      ) {
        await callback(pathname);
      }
    }
  }
}

export async function transpile(modules: Record<string, string>) {
  return await Deno.transpileOnly(modules);
}

export async function compileApplication(
  staticRoutes: string[],
  modules: Map<string, Module>,
  config: Configuration,
) {
  const decoder = new TextDecoder();
  const walkOptions = {
    includeDirs: true,
    exts: [".js", ".ts", ".mjs", ".jsx", ".tsx"],
    skip: [/^\./, /\.d\.ts$/i, /\.(test|spec|e2e)\.m?(j|t)sx?$/i],
  };

  /**
     * Handles fetching the file, creating a new modules, transpiling it
     * & setting it into `this.modules`.
     *
     * @param pathname
     */
  const loadModule = async (pathname: string) => {
    const data = await Deno.readFile(pathname);
    let cleanedKey = utils.cleanKey(pathname, config.appDir);
    cleanedKey = utils.cleanKey(pathname, config.serverDir);

    const module = new Module({
      fullpath: pathname,
      content: decoder.decode(data),
      isStatic: renderer.isStatic(staticRoutes, cleanedKey),
      isPlugin: false,
      config,
    });

    const key = await module.transpile();
    modules.set(key, module);
  };

  await walkDir(
    config.appDir,
    loadModule,
    walkOptions,
  );

  await walkDir(
    config.serverDir,
    loadModule,
    walkOptions,
  );

  let exts: string[] = [];
  let skip: RegExp[] = [];
  const includeDirs = true;

  plugins.forEach(({ walkOptions }) => {
    if (walkOptions) {
      if (walkOptions.exts) {
        exts = exts.concat(walkOptions.exts);
      }

      if (walkOptions.skip) {
        skip = skip.concat(walkOptions.skip);
      }
    }
  });

  /**
     * Handles fetching the file, creating a new modules, transpiling it
     * & setting it into `this.modules`.
     *
     * @param pathname
     */
  const loadPlugin = async (pathname: string) => {
    const data = await Deno.readFile(pathname);
    const cleanedKey = utils.cleanKey(pathname, config.appDir);

    const module = new Module({
      fullpath: pathname,
      content: decoder.decode(data),
      isStatic: renderer.isStatic(staticRoutes, cleanedKey),
      isPlugin: true,
      config: config,
    });

    const key = await module.transpile();
    modules.set(key, module);
  };

  const pluginWalkOptions = {
    includeDirs,
    exts,
    skip,
  };

  await walkDir(
    config.appDir,
    loadPlugin,
    pluginWalkOptions,
  );
}
