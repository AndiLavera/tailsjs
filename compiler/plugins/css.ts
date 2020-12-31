import css from "https://esm.sh/css@3.0.0";
import { CompilerPlugin } from "../../types.ts";

const defaultPlugin: CompilerPlugin = {
  name: "css-loader",
  test: /.css/,
  acceptHMR: true,
  walkOptions: {
    exts: [".module.css"],
  },
  async preTransform(pathname: string, content: string) {
    console.log("css");
    console.log(pathname);

    var ast = css.parse(content, { source: pathname });
    var result = css.stringify(ast, { sourcemap: true });

    return {
      transformedPath: pathname + ".js",
      transformedContent: await css.parse(content),
    };
  },
};

export default defaultPlugin;
