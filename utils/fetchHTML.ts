import { Modules } from "../types.ts";

// TODO: Should not be undefined
export function fetchHtml(page: string | undefined, modules: Modules) {
  const cleanedPage = (page as string).replace(
    /\.(jsx|mjs|tsx|ts|js?)/g,
    "",
  );

  return modules[
    `/pages/${cleanedPage}.js`
  ].html;
}
