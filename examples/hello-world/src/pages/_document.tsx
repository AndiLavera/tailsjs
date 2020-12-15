import React from "https://esm.sh/react";

export default function Document({ children }: { children: JSX.Element }) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/purecss@2.0.3/build/pure-min.css"
        />
      </head>
      <body>
        <main id="app">
          {children}
        </main>
        <script type="module" src="/main.js" />
      </body>
    </html>
  );
}
