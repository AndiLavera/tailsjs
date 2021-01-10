import { cssTransform } from "../../deps.ts";
import { CompilerPlugin } from "../../types.ts";

const defaultPlugin: CompilerPlugin = {
  name: "css-module-loader",
  test: /.module.css/,
  acceptHMR: true,
  walkOptions: {
    exts: [".module.css"],
  },
  resolve: (url: string) => url.replace(".css", ".css.js"),
  async transform({ content }) {
    const transformedContent = await cssTransform(content);

    return `export const styles = ${JSON.stringify(transformedContent)}`;
  },
};

export default defaultPlugin;
