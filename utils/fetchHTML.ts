import Module from "../modules/module.ts";

export function fetchHtml(
  page: string,
  modules: Map<string, Module>,
) {
  const cleanedPage = page.replace(
    /\.(jsx|mjs|tsx|ts|js?)/g,
    "",
  );

  return (modules.get(`/pages/${cleanedPage}.js`) as Module).html;
}
