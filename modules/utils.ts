export default {
  cleanKey(key: string, dir: string) {
    return key
      .replace(`${dir}`, "")
      .replace(/\.(jsx|mjs|tsx|js|ts?)/g, ".js");
  },
};
