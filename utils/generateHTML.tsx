import { ComponentType } from "../deps.ts";

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
