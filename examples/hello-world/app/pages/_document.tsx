import React from "https://esm.sh/react@17.0.1";

export default function Document(
  { children, initialData = {} }: {
    children: JSX.Element;
    initialData: any;
  },
) {
  return (
    <html lang="en">
      <head>
        <link rel="modulepreload" href="/_hmr.ts"></link>
        <link rel="modulepreload" href="/main.js"></link>
        <link rel="modulepreload" href="/bootstrap.ts"></link>
        <link rel="modulepreload" href="/_app.js"></link>
        <link rel="stylesheet" href="style/index.css"></link>
      </head>
      <body>
        <main id="app">
          {children}
        </main>
        <script id="ssr-data" type="application/json">
          {JSON.stringify(initialData).replace(
            /</g,
            "\\u003c",
          )}
        </script>
        <script type="module" src="/main.js" />
      </body>
    </html>
  );
}
