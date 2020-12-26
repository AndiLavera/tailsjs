import { WebRouter } from "../controller/web_router.ts";
import { ModuleHandler } from "../core/module_handler.ts";
import {
  ComponentType,
  Context,
  React,
  renderToString,
  Router as ServerRouter,
} from "../deps.ts";
import { Modules, WebRoute } from "../types.ts";
import log from "../logger/logger.ts";

export function generateHTML(
  App: ComponentType<any>,
  Document: ComponentType<any>,
  Component: ComponentType<any>,
  props: Record<string, any> = {},
): string {
  return renderToString(
    <Document initialData={props}>
      <App Page={Component} pageProps={props} />
    </Document>,
  );
}

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
