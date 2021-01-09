import { doubleQuotesRegex, reHttp } from "../../core/utils.ts";
import { CompilerPlugin } from "../../types.ts";

/**
 * Handles converting non `.js` local import paths
 * to `.js`.
 */
const defaultPlugin: CompilerPlugin = {
  name: "rewrite-imports",
  test: /\.(jsx|mjs|tsx|ts?)/g,
  acceptHMR: true,
  resolve: (url: string) => {
    let transformedUrl;
    // TODO: Match remaining string types
    // || path.match(reSingleQuotes) || path.match(reBackTicks)
    const importURL = url.match(doubleQuotesRegex);
    if (!importURL || !importURL[0]) return url;

    if (!importURL[0].match(reHttp)) {
      transformedUrl = url.replace(/\.(jsx|mjs|tsx|ts?)/g, ".js");
    }

    return transformedUrl || url;
  },
};

export default defaultPlugin;
