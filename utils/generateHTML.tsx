// import { renderToString } from "../deps.ts";

export async function generateHTML(
  App: any,
  Document: any,
  Component: any,
  props: Record<string, any> = {},
): Promise<string> {
  const React = (await import(
    "/home/andrew/workspace/js/tails/examples/hello-world/.tails/_tails/-/esm.sh/react@17.0.1.js"
  )).default;

  const { renderToString } = await import(
    "/home/andrew/workspace/js/tails/examples/hello-world/.tails/_tails/-/cdn.esm.sh/v14/react-dom@17.0.1/esnext/server.js"
  );

  return renderToString(
    <Document initialData={props}>
      <App Page={Component} pageProps={props} />
    </Document>,
  );
}
