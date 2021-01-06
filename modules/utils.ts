export default {
  cleanKey(key: string, dir: string) {
    return this.removeDir(key, dir)
      .replace(/\.(jsx|mjs|tsx|js|ts?)/g, ".js");
  },

  removeDir(key: string, dir: string) {
    return key
      .replace(`${dir}`, "");
  },
};
