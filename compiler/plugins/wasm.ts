import { CompilerPlugin } from "../../types.ts";

const defaultPlugin: CompilerPlugin = {
  name: "wasm-loader",
  test: /.wasm/,
  acceptHMR: true,
  walkOptions: {
    exts: [".wasm"],
  },
  resolve: (url: string) => url.replace(/\.wasm/, ".wasm.js"),
  async transform({ pathname }) {
    const data = await Deno.readFile(pathname);

    return `
    const wasmCode = new Uint8Array([${data.join(",")}])
    const wasmModule = new WebAssembly.Module(wasmCode);
    const wasmInstance = new WebAssembly.Instance(wasmModule);
    const main = wasmInstance.exports.main;
    export default main;
  `;
  },
};

export default defaultPlugin;
