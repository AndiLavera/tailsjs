import { path } from "../std.ts";
import { Modules, Routes } from "../types.ts";

/**
 * Writes all files in `modules` to `./.tails/`
 *
 * @param modules
 */
export async function writeCompiledFiles(modules: Modules) {
  const encoder = new TextEncoder();

  for (const route in modules) {
    const compiledFiles = modules[route];

    for await (const file of Object.keys(compiledFiles)) {
      const compiledFilePath = file.replace(
        "file://" + path.resolve("./"),
        "./.tails",
      );
      await Deno.writeFile(
        compiledFilePath,
        encoder.encode(compiledFiles[file]),
      );
    }
  }
}

/**
 * Compile app.tsx
 */
export async function compileApp(path: string, modules: Modules) {
  const [diagnostics, bundle] = await Deno.compile(
    path,
    undefined,
    {
      lib: ["dom", "dom.iterable", "esnext"],
    },
  );

  if (diagnostics) {
    console.log(diagnostics);
    throw new Error();
  }

  modules["/app.tsx"] = bundle;
}

/**
 *  Compile all pages found in routes
 *
 * @param routes
 * @param modules
 */
export async function compilePages(
  routes: Routes,
  modules: Modules,
) {
  for await (const path of Object.keys(routes)) {
    const [diagnostics, bundle] = await Deno.compile(
      "." + routes[path],
      undefined,
      {
        lib: ["dom", "dom.iterable", "esnext"],
      },
    );

    if (diagnostics) {
      console.log(diagnostics);
      throw new Error();
    }

    modules[path] = bundle;
  }
}

/**
 * Write out modules to modules.json for easy viewing
 *
 * @param modules
 */
export async function writeModule(modules: Modules) {
  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(modules));
  await Deno.writeFile("./modules.json", data);
}
