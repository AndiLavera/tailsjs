import { path } from "../std.ts";

/**
 * Returns a relative path between two modules.
 * Ensure `from` is a directory while `to` can
 * be either a directory or file.
 *
 * @param from
 * @param to
 */
export function getRelativePath(from: string, to: string): string {
  let relativePath = path.relative(from, to).split("\\").join("/");
  if (!relativePath.startsWith(".") && !relativePath.startsWith("/")) {
    relativePath = "./" + relativePath;
  }
  return relativePath;
}
