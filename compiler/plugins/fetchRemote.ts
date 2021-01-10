import { CompilerOptions, CompilerPlugin } from "../../types.ts";
import { recurseImports } from "../../utils/recurseImports.ts";

/**
 * TODO:
 */
const defaultPlugin: CompilerPlugin = {
  name: "fetch-remote",
  test: /\.(jsx|mjs|tsx|ts|js?)/g,
  acceptHMR: true,
  transform: async ({ pathname, content }, opts: CompilerOptions) => {
    const { rootDir, buildDir, reactLocalPath, reactDOMLocalPath } = opts;
    if (!buildDir && !rootDir && !reactLocalPath && !reactDOMLocalPath) {
      return content;
    }

    if (pathname.includes("/server/")) return content;

    return await recurseImports({ pathname, content }, opts);
  },
};

export default defaultPlugin;
