import { ensureDir } from "../std.ts";
import { Modules } from "../types.ts";

/**
 * Writes all files in `modules` to `./.tails/`
 *
 * @param modules
 */
export async function writeCompiledFiles(modules: Modules, appRoot: string) {
  const encoder = new TextEncoder();
  await ensureDir(`${appRoot}/.tails`);

  for (const route in modules) {
    const compiledFiles = modules[route];

    console.log("compiledFilePath");
    for await (const file of Object.keys(compiledFiles)) {
      console.log("compiledFiles before transfrom");
      console.log(file + "\n");
      const compiledFilePath = file.replace(
        `file://${appRoot}`,
        `${appRoot}/.tails`,
      );

      console.log("compiledFiles after transfrom");
      console.log(compiledFilePath + "\n");
      // Remove the file from the path and ensure the dir exists
      await ensureDir(compiledFilePath.split("/").slice(0, -1).join("/"));
      await Deno.writeFile(
        compiledFilePath,
        encoder.encode(compiledFiles[file]),
      );
    }

    console.log("\n\n");
  }
}

/**
 *  Compile all pages found in routes and inject the
 *  output into modules
 *
 * @param routes
 * @param modules
 */
export async function compilePages(
  routes: Record<string, string>,
  modules: Modules,
  appRoot: string,
) {
  console.log("compilePages");
  for await (const path of Object.keys(routes)) {
    console.log(`${appRoot}/src/pages/${routes[path]}`);
    const [diagnostics, bundle] = await Deno.compile(
      `${appRoot}/src/pages/${routes[path]}`,
      undefined,
      {
        lib: ["dom", "dom.iterable", "esnext"],
      },
    );

    if (diagnostics) {
      console.log(diagnostics);
      throw new Error();
    }

    console.log("bundle");
    console.log(bundle);

    modules[path] = bundle;
  }

  console.log("\n\n");
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
