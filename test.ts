import { walk } from "./std.ts";

for await (
  const { path } of walk("middleware", { exts: [".ts"] })
) {
  const module = await import("./" + path);
  if (module.default) {
    console.log(module.default);
  }
}
