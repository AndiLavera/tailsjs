import React from "https://esm.sh/react@17.0.1";
import { hydrate } from "https://esm.sh/react-dom@17.0.1";
import App from "./pages/app.tsx";

export async function bootstrap(routes) {
  const importedComponent = await import(routes[window.location.pathname]);

  hydrate(
    React.createElement(
      App,
      { Page: importedComponent.default, pageProps: {} },
    ),
    // deno-lint-ignore no-undef
    document.getElementById("app"),
  );
}
