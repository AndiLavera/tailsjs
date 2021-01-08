import { CompilerPlugin } from "../../types.ts";

const defaultPlugin: CompilerPlugin = {
  name: "css-loader",
  test: /.css/,
  acceptHMR: true,
  walkOptions: {
    exts: [".css"],
  },
};

export default defaultPlugin;
