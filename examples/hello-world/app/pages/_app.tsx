import React, { ComponentType } from "https://esm.sh/react@17.0.1";

export default function App(
  { Page, pageProps }: { Page: ComponentType<any>; pageProps: any },
) {
  return <Page {...pageProps} />;
}
