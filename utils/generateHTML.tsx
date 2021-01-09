// import { renderToString } from "../deps.ts";

import { ComponentType } from "../deps.ts";

// {
//   app: App,
//   document: Document,
//   component: this.importedModule.default,
//   props,
//   reactURL: this.reactURL,
//   reactServerURL: this.reactServerURL,
// }
export async function generateHTML(renderData: {
  App: ComponentType<any>;
  Document: any;
  Component: any;
  props: Record<string, any>;
  reactWritePath: string;
  reactServerWritePath: string;
}): Promise<string> {
  const React = (await import(renderData.reactWritePath)).default;
  const ReactDOMServer = await import(renderData.reactServerWritePath);
  const { App, Document, Component, props } = renderData;

  return (ReactDOMServer as any).renderToString(
    <Document initialData={props}>
      <App Page={Component} pageProps={props} />
    </Document>,
  );
}
