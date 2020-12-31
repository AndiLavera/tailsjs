import { reDoubleQuotes, reHttp, reImportPath } from "../core/utils.ts";
import { Plugin } from "../types.ts";

const defaultPlugin: Plugin = {
  name: "rewrite-imports",
  test: /.js/,
  acceptHMR: true,
  async preTransform(pathname: string, content: string) {
    return await {
      transformedPath: pathname,
      transformedContent: content,
    };
  },
  async postTransform(pathname: string, module: Deno.TranspileOnlyResult) {
    return await {
      transformedPath: pathname,
      transformedModule: rewriteImports(module),
    };
  },
};

function rewriteImports(module: Deno.TranspileOnlyResult) {
  const matched = module.source.match(reImportPath) || [];

  matched.forEach((path) => {
    let transformedPath;
    // TODO: Match remaining string types
    // || path.match(reSingleQuotes) || path.match(reBackTicks)
    const importURL = path.match(reDoubleQuotes);
    if (!importURL || !importURL[0]) return;

    if (!importURL[0].match(reHttp)) {
      transformedPath = path.replace(/\.(jsx|mjs|tsx?)/g, ".js");
    }

    if (transformedPath) {
      module.source = module.source.replace(path, transformedPath);
    }
  });

  return module;
}

export default defaultPlugin;
