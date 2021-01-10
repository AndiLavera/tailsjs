export default {
  cleanKey(key: string, dir: string) {
    return this.removeDir(key, dir)
      .replace(/\.(jsx|mjs|tsx|js|ts?)/g, ".js");
  },

  removeDir(key: string, dir: string) {
    return key
      .replace(`${dir}`, "");
  },

  async loadManifest(path: string) {
    const decoder = new TextDecoder("utf-8");

    try {
      const data = await Deno.readFile(path);
      return JSON.parse(decoder.decode(data));
    } catch {
      throw new Error(`Cannot load manifest. Path tried: ${path}`);
    }
  },
};
