import css from "https://esm.sh/css@3.0.0";

const defaultPlugin = {
  name: "css-loader",
  test: /.css/,
  acceptHMR: true,
  transform: (content: Uint8Array) => {
    const decoder = new TextDecoder();
    const raw = decoder.decode(content);
    return css.parse(raw);
  },
};

export default defaultPlugin;
