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
    const { remoteWritePath, appRoot } = opts;
    if (!remoteWritePath && !appRoot) {
      return content;
    }

    if (pathname.includes("/server/")) return content;

    return await recurseImports({ pathname, content }, opts);
  },
};

export default defaultPlugin;
