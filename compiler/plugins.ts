import { CompilerPlugin } from "../types.ts";
import nonjsImports from "./plugins/nonjsImports.ts";
import cssModule from "./plugins/cssModule.ts";
import wasm from "./plugins/wasm.ts";
import css from "./plugins/css.ts";
import { reImportPath } from "../core/utils.ts";

const plugins = [nonjsImports, cssModule, wasm, css];

export function forEach(callback: (plugin: CompilerPlugin) => void) {
  return plugins.forEach((plugin) => callback(plugin));
}

/**
 * Handles iterating through all modules passing the module & key
 * into plugin.preTransform. All modules are passed into `resolve`
 * in case they have unsupported imports.
 *
 * @param modules
 */
export async function transform(modules: Record<string, string>) {
  const transformedModules: Record<string, string> = {};

  for await (const key of Object.keys(modules)) {
    const module: { key: string; content: string } = {
      key,
      content: modules[key],
    };
    let transformed = false;

    for await (const plugin of plugins) {
      if (module.key.match(plugin.test) && plugin.transform) {
        const transformedContent = await plugin.transform({
          pathname: module.key,
          content: module.content,
        });

        let transformedPath;
        if (plugin.resolve) {
          transformedPath = plugin.resolve(module.key);
        }

        if (transformedPath) {
          module.key = transformedPath;
        }
        module.content = await resolve(
          transformedContent,
        );

        transformed = true;
      }
    }

    if (!transformed) {
      module.content = await resolve(module.content);
    }

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
async function resolve(content: string) {
  const matchedImports = content.match(reImportPath) || [];
  let transformedContent = content;

  for await (const imp of matchedImports) {
    for await (const plugin of plugins) {
      let transformedImp = imp;
      if (imp.match(plugin.test) && plugin.resolve) {
        transformedImp = plugin.resolve(imp);
      }

      transformedContent = transformedContent.replace(imp, transformedImp);
    }
  }

  return transformedContent;
}

export function transformedPath(pathname: string) {
  let transformedPath = pathname;

  for (const plugin of plugins) {
    if (pathname.match(plugin.test) && plugin.resolve) {
      transformedPath = plugin.resolve(pathname);
    }
  }

  return transformedPath;
}
