import { WalkOptions } from "https://deno.land/std@0.78.0/fs/walk.ts";
import { path, walk } from "../std.ts";
import plugins from "./plugins.ts";

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
        // TODO: Possible callback
        // const { transformedPath, transformedData } = await handlePlugins(
        //   pathname,
        //   decoder.decode(data),
        // );

        modules[pathname] = decoder.decode(data);
      }
    }
  }

  return modules;
}

export async function transpile(modules: Record<string, string>) {
  await plugins.preTransform(modules);
  const transpiledModules = await Deno.transpileOnly(modules);
  await plugins.postTransform(transpiledModules);
  return transpiledModules;
}
