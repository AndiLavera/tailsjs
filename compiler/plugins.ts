import { reImportPath } from "../core/utils.ts";
import css from "../plugins/css.ts";
import sass from "../plugins/sass.ts";

const plugins = [css, sass];

export async function handlePlugins(
  pathname: string,
  fileContent: string,
): Promise<
  Record<string, string>
> {
  const transformedPath = transformPath(pathname);
  const transformedData = await transfromImports(fileContent);

  return {
    transformedPath,
    transformedData,
  };
}

async function transfromImports(fileContent: string): Promise<string> {
  let transformedContent = fileContent;
  const imports = fileContent.match(reImportPath) || [];

  for await (const imp of imports) {
    plugins.forEach((plugin) => {
      if (imp.match(plugin.test)) {
        if (plugin.name === "css-loader") {
          // TODO: Only handles imports that end with `";`
          const tmpImp = imp.replace('";', "");
          transformedContent = transformedContent.replace(
            imp,
            `${tmpImp}.js";`,
          );
        }

        if (plugin.name === "sass-loader") {
          console.log("TODO: Sass Loader");
        }

        if (plugin.name === "wasm-loader") {
          console.log("TODO: WASM Loader");
        }
      }
    });
  }

  return transformedContent;
}

function transformPath(pathname: string): string {
  console.log(pathname);
  let transformedPath = pathname;
  plugins.forEach((plugin) => {
    if (pathname.match(plugin.test)) {
      if (plugin.name === "css-loader") {
        console.log("transformPath");
        console.log(pathname);
        transformedPath += ".js";
      }
    }
  });

  return transformedPath;
}
