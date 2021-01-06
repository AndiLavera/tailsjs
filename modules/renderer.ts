import { ComponentType } from "../deps.ts";
import { generateHTML } from "../utils/generateHTML.tsx";

export function renderable(path: string) {
  return !path.includes("_app") &&
    !path.includes("_document") &&
    path.includes("/pages");
}

export function isStatic(staticRoutes: string[], path: string) {
  const hasStaticRoute = staticRoutes.filter((route) => path.includes(route));
  if (hasStaticRoute.length === 0) return false;

  return true;
}

export async function render(
  path: string,
  // deno-lint-ignore no-explicit-any
  App: ComponentType<any>,
  // deno-lint-ignore no-explicit-any
  Document: ComponentType<any>,
): Promise<string | undefined> {
  const { default: Component } = await import(path);

  return generateHTML(
    App,
    Document,
    Component,
  );
}

/**
 * Callback invoked during compliation. Handles rendering ssg routes and returning
 * the html.
 *
 * @param path
 */
export async function renderSSGModule(
  pathname: string,
  staticRoutes: string[],
  App: ComponentType<any>,
  Document: ComponentType<any>,
): Promise<string | undefined> {
  if (!renderable(pathname)) return;

  if (!isStatic(staticRoutes, pathname)) return;

  return await render(pathname, App, Document);
}
