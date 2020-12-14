import { ensureDir, walk } from "../std.ts";
import { Modules } from "../types.ts";

async function compile(path: string) {
  const [diagnostics, bundle] = await Deno.compile(path);

  if (diagnostics) {
    console.log(diagnostics);
    throw new Error(`Could not compile ${path}`);
  }

  return bundle;
}

export async function compileApp(
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
 * Writes all files in `modules` to `./.tails/`
 *
 * @param modules
 */
export async function writeFiles(modules: Modules, appRoot: string) {
  const writeManifest = async (
    encoder: TextEncoder,
    modules: Modules,
    appRoot: string,
  ): Promise<void> => {
    const data = encoder.encode(JSON.stringify(modules));
    await Deno.writeFile(`${appRoot}/.tails/modules.json`, data);
  };

  const encoder = new TextEncoder();
  await ensureDir(`${appRoot}/.tails`);
  await writeManifest(encoder, modules, appRoot);

  for (const key in modules) {
    const file = modules[key];
    const dirs = key.split("/").slice(1, -1);

    for await (const dir of dirs) {
      await ensureDir(`${appRoot}/.tails/src/${dir}`);
    }
    await Deno.writeFile(
      `${appRoot}/.tails/src/${key}`,
      encoder.encode(file),
    );
  }
}
