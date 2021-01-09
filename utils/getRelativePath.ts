import { path } from "../std.ts";

export function getRelativePath(from: string, to: string): string {
  let relativePath = path.relative(from, to).split("\\").join("/");
  if (!relativePath.startsWith(".") && !relativePath.startsWith("/")) {
    relativePath = "./" + relativePath;
  }
  return relativePath;
}
