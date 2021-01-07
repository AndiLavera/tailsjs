import { WalkOptions } from "../std.ts";
import { path, walk } from "../std.ts";

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
