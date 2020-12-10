import React from "https://esm.sh/react";
export default function App({ Page, pageProps }) {
    return React.createElement(Page, Object.assign({}, pageProps));
}
