import React, { useState } from "https://esm.sh/react";
import Logo from "../components/logo.tsx";
export default function Home() {
    const [count, setCount] = useState(0);
    const version = "0.1.0";
    return (React.createElement("div", { className: "page" },
        React.createElement("p", { className: "logo" },
            React.createElement(Logo, null)),
        React.createElement("h1", null,
            "Welcome to use ",
            React.createElement("strong", null, "Aleph.js"),
            "!"),
        React.createElement("p", { className: "links" },
            React.createElement("a", { href: "https://alephjs.org", target: "_blank" }, "Website"),
            React.createElement("span", null, "\u00B7"),
            React.createElement("a", { href: "https://alephjs.org/docs/get-started", target: "_blank" }, "Get Started"),
            React.createElement("span", null, "\u00B7"),
            React.createElement("a", { href: "https://alephjs.org/docs", target: "_blank" }, "Docs"),
            React.createElement("span", null, "\u00B7"),
            React.createElement("a", { href: "https://github.com/alephjs/aleph.js", target: "_blank" }, "Github")),
        React.createElement("p", { className: "counter" },
            React.createElement("span", null, "Counter:"),
            React.createElement("strong", null, count),
            React.createElement("button", { onClick: () => setCount((n) => n - 1) }, "-"),
            React.createElement("button", { onClick: () => setCount((n) => n + 1) }, "+")),
        React.createElement("p", { className: "copyinfo" },
            "Built by Aleph.js in Deno v",
            version),
        React.createElement("a", { href: "/about" }, "About")));
}
//# sourceMappingURL=index.js.map