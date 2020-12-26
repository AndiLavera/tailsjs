// The `Math.random()` is to get around Deno's caching system
// See: https://github.com/denoland/deno/issues/6946
export const dynamicImport = async (pathname: string) => {
  return await import(`${pathname}?version=${Math.random() + Math.random()}`);
};
