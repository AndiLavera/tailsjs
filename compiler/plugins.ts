import { reImportPath } from "../core/utils.ts";
// import css from "../plugins/css.ts";
// import sass from "../plugins/sass.ts";
import rewriteImportPath from "../plugins/rewriteImportPaths.ts";

const plugins = [rewriteImportPath];

export async function handlePlugins(
  pathname: string,
  fileContent: string,
): Promise<
  Record<string, string>
> {
  const transformedPath = transformPath(pathname);
  const transformedData = await transfromImports(fileContent);

  return {
    transformedPath,
    transformedData,
  };
}

export async function transfromImports(fileContent: string): Promise<string> {
  let transformedContent = fileContent;
  const imports = fileContent.match(reImportPath) || [];

  for await (const imp of imports) {
    plugins.forEach((plugin) => {
      if (imp.match(plugin.test)) {
        if (plugin.name === "css-loader") {
          // TODO: Only handles imports that end with `";`
          const tmpImp = imp.replace('";', "");
          transformedContent = transformedContent.replace(
            imp,
            `${tmpImp}.js";`,
          );
        }

        if (plugin.name === "sass-loader") {
          console.log("TODO: Sass Loader");
        }

        if (plugin.name === "wasm-loader") {
          console.log("TODO: WASM Loader");
        }
      }
    });
  }

  return transformedContent;
}

export function transformPath(pathname: string): string {
  console.log(pathname);
  let transformedPath = pathname;
  plugins.forEach((plugin) => {
    if (pathname.match(plugin.test)) {
      if (plugin.name === "css-loader") {
        console.log("transformPath");
        console.log(pathname);
        transformedPath += ".js";
      }
    }
  });

  return transformedPath;
}

/**
 * Handles iterating through all modules passing the module & key
 * into plugin.preTransform.
 *
 * @param modules
 */
export async function preTransform(modules: Record<string, string>) {
  const transformedModules: Record<string, string> = {};

  for await (const moduleKey of Object.keys(modules)) {
    const content = modules[moduleKey];

    for await (const plugin of plugins) {
      if (plugin.preTransform) {
        const { transformedPath, transformedContent } = await plugin
          .preTransform(
            moduleKey,
            content,
          );
        transformedModules[transformedPath] = transformedContent;
        continue;
      }

      transformedModules[moduleKey] = content;
    }
  }

  return transformedModules;
}

/**
 * Handles iterating through all modules passing the module & key
 * into plugin.postTransform.
 *
 * @param modules
 */
export async function postTransform(
  modules: Record<string, Deno.TranspileOnlyResult>,
) {
  const transformedModules: Record<string, Deno.TranspileOnlyResult> = {};

  for await (const moduleKey of Object.keys(modules)) {
    const module = modules[moduleKey];

    for await (const plugin of plugins) {
      if (plugin.postTransform) {
        const { transformedPath, transformedModule } = await plugin
          .postTransform(
            moduleKey,
            module,
          );
        transformedModules[transformedPath] = transformedModule;
        continue;
      }

      transformedModules[moduleKey] = module;
    }
  }

  return transformedModules;
}
