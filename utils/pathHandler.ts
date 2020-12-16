import { walk } from "../std.ts";

export async function walkDir(
  dir: string,
  options: Record<string, any>,
  callback: (path: string) => Promise<void>,
) {
  for await (const { path } of walk(dir, options)) {
    await callback(path);
  }
}
