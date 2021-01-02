import { WalkOptions } from "https://deno.land/std@0.78.0/fs/walk.ts";
import { path, walk } from "../std.ts";
import * as plugins from "./plugins.ts";

interface TranspiledModules {
  modules: Record<string, Deno.TranspileOnlyResult>;
  plugins: Record<string, string>;
}

/**
 * Handles merging all plugin walkOptions and then pasing the result
 * over to `transpileDir`
 *
 * @param pathname
 * @param walkOptions
 */
export async function transpileDirWithPlugins(
  pathname: string,
  walkOptions: WalkOptions,
): Promise<TranspiledModules> {
  const modules = await walkDir(pathname, walkOptions);
  const transformedModules = await plugins.transform(modules);
  const transpiledModules = await transpile(transformedModules);

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

  const pluginModules = await walkDir(pathname, {
    includeDirs,
    exts,
    skip,
  });

  const transformedPluginModules = await plugins.transform(
    pluginModules,
  );

  return {
    modules: transpiledModules,
    plugins: transformedPluginModules,
  };
}

export async function walkDir(
  pathname: string,
  walkOptions?: WalkOptions,
) {
  const modules: Record<string, string> = {};
  const folders = Deno.readDirSync(pathname);
  const decoder = new TextDecoder();

  for await (const folder of folders) {
    if (folder.isDirectory) {
      const folderName = path.join(pathname, folder.name);

      for await (
        const { path: pathname } of walk(folderName, walkOptions)
      ) {
        const data = await Deno.readFile(pathname);
        modules[pathname] = decoder.decode(data);
      }
    }
  }

  return modules;
}

export async function transpile(modules: Record<string, string>) {
  return await Deno.transpileOnly(modules);
}
