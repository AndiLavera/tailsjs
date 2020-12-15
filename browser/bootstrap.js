import React from "https://esm.sh/react@17.0.1";
import { hydrate } from "https://esm.sh/react-dom@17.0.1";
import App from "./_app.tsx";
import Document from "./_document.tsx";

export async function bootstrap() {
  let path = window.location.pathname;
  if (path === "/") {
    path = "/index";
  }

  const importedComponent = await import(
    `${path}.tsx`
  );

  hydrate(
    React.createElement(
      Document,
      null,
      React.createElement(
        App,
        { Page: importedComponent.default, pageProps: {} },
      ),
    ),
    // deno-lint-ignore no-undef
    document.getElementById("app"),
  );
}
