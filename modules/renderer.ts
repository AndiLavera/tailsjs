// TODO: do something with this module
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
