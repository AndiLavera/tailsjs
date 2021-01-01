import { WalkOptions } from "https://deno.land/std@0.78.0/fs/walk.ts";
import { path, walk } from "../std.ts";
import * as plugins from "./plugins.ts";

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
) {
  const modules = await transpileDir(pathname, walkOptions);

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

  let transformedModules =
    (await plugins.preTranspileTransform(pluginModules) as unknown as Record<
      string,
      Deno.TranspileOnlyResult
    >);
  transformedModules = await plugins.postTranspileTransform(transformedModules);
  console.log(pluginModules);

  return modules;
}

export async function transpileDir(
  pathname: string,
  walkOptions?: WalkOptions,
  callback?: () => void,
) {
  const modules = await walkDir(pathname, walkOptions);
  return transpile(modules);
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
  const transformedModules = await plugins.preTranspileTransform(modules);
  const transpiledModules = await Deno.transpileOnly(transformedModules);
  return await plugins.postTranspileTransform(transpiledModules);
}
