import React from "https://esm.sh/react@17.0.1";
import { hydrate } from "https://esm.sh/react-dom@17.0.1";
import App from "./_app.js";

export async function bootstrap() {
  /**
   * Converts something like `{&quot;version&quot;:&quot;0.1.0&quot;}`
   * to `"{\"version\":\"0.1.0\"}"`
   *
   * @param input
   */
  function htmlDecode(input) {
    // deno-lint-ignore no-undef
    var doc = new DOMParser().parseFromString(input, "text/html");
    return doc.documentElement.textContent;
  }

  let path = window.location.pathname;
  if (path === "/") {
    path = "/index";
  }

  const importedComponent = await import(
    `${path}.js`
  );

  const initialData = htmlDecode(
    // deno-lint-ignore no-undef
    document.getElementById("blah").innerHTML,
  );

  hydrate(
    React.createElement(
      App,
      { Page: importedComponent.default, pageProps: JSON.parse(initialData) },
    ),
    // deno-lint-ignore no-undef
    document.getElementById("app"),
  );
}
