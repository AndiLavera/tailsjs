import React, { ComponentType } from "https://esm.sh/react?dev";

export default function App(
  { Page, pageProps }: { Page: ComponentType<any>; pageProps: any },
) {
  return <Page {...pageProps} />;
}
