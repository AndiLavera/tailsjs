import { ensureDir, walk } from "../std.ts";
import { Modules } from "../types.ts";
import { ensureTextFile } from "../fs.ts";

async function compile(path: string) {
  const [diagnostics, bundle] = await Deno.compile(path);

  if (diagnostics) {
    console.log(diagnostics);
    throw new Error(`Could not compile ${path}`);
  }

  return bundle;
}

export async function compileApplication(
  modules: Modules,
  assetPath: (asset: string) => string,
  assetDir: string,
  appRoot: string,
) {
  const walkOptions = {
    includeDirs: true,
    exts: [".js", ".ts", ".mjs", ".jsx", ".tsx"],
    skip: [/^\./, /\.d\.ts$/i, /\.(test|spec|e2e)\.m?(j|t)sx?$/i],
  };

  // TODO: Transpile conrollers for loading
  // const apiDir = assetPath("controllers");
  // for await (const { path } of walk(apiDir, walkOptions)) {
  //   console.log();
  // }

  const pagesDir = assetPath("pages");
  for await (const { path } of walk(pagesDir, walkOptions)) {
    const compiledModules = await compile(path);

    Object.keys(compiledModules)
      .forEach((key) => {
        modules[
          key.replace(`file://${assetDir}`, "")
        ] = compiledModules[key];
      });
  }

  await writeFiles(modules, appRoot);
}

/**
 * Writes all files in `modules` to `${appRoot}/.tails/`
 *
 * @param modules
 */
async function writeFiles(modules: Modules, appRoot: string) {
  await ensureDir(`${appRoot}/.tails`);
  ensureTextFile(
    `${appRoot}/.tails/modules.json`,
    JSON.stringify(modules),
  );

  for (const key in modules) {
    const file = modules[key];
    ensureTextFile(`${appRoot}/.tails/src/${key}`, file);
  }
}
