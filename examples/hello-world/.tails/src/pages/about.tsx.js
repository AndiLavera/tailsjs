import React from "https://esm.sh/react";
import { garden } from "../components/garden.ts";
const Home = () => {
    const [count, setCount] = React.useState(0);
    return (React.createElement("div", { className: "pure-g pure-u" },
        React.createElement("h2", null, "My DenoReact App"),
        React.createElement("button", { className: "pure-button", onClick: () => setCount(count + 1) }, "Add a \uD83E\uDD95 in your garden!"),
        React.createElement("p", { style: garden }, Array(count).fill(React.createElement("span", null, "\uD83E\uDD95"))),
        React.createElement("a", { href: "/" }, "Home")));
};
export default Home;
//# sourceMappingURL=about.js.map