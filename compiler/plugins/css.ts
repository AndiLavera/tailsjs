import { CompilerPlugin } from "../../types.ts";

const defaultPlugin: CompilerPlugin = {
  name: "css-loader",
  test: /(\w+\b(?<!\module)).css/,
  acceptHMR: true,
  walkOptions: {
    exts: [".css"],
  },
};

export default defaultPlugin;
