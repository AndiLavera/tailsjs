import { cssTransform } from "../../deps.ts";
import { CompilerPlugin } from "../../types.ts";

const defaultPlugin: CompilerPlugin = {
  name: "css-module-loader",
  test: /.css/,
  acceptHMR: true,
  walkOptions: {
    exts: [".css"],
  },
  resolve: (url: string) => url.replace(/\.css/, ".css.js"),
  async transform(pathname: string, content: string) {
    const transformedContent = await cssTransform(content);

    return {
      transformedPath: pathname + ".js",
      transformedContent: `export const styles = ${
        JSON.stringify(transformedContent)
      }`,
    };
  },
};

export default defaultPlugin;
