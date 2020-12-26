import { ComponentType, React, renderToString } from "../deps.ts";

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
