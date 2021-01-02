import React, { useState } from "https://esm.sh/react@17.0.1";
import Logo from "../components/logo.tsx";
import { styles } from "../style/index.css";
import main from "../wasm/42.wasm";

function Home() {
  const [count, setCount] = useState(0);
  const version = "0.1.0";

  return (
    <div className="page">
      <p className="logo">
        <Logo />
      </p>

      <h1>
        Welcome to use <strong style={styles.red}>Tails.js {main()}</strong>!
      </h1>

      <p className="links">
        <a
          href="https://alephjs.org"
          target="_blank"
        >
          Website
        </a>
        <span>&middot;</span>
        <a
          href="https://alephjs.org/docs/get-started"
          target="_blank"
        >
          Get Started
        </a>
        <span>&middot;</span>
        <a
          href="https://alephjs.org/docs"
          target="_blank"
        >
          Docs
        </a>
        <span>&middot;</span>
        <a
          href="https://github.com/alephjs/aleph.js"
          target="_blank"
        >
          Github
        </a>
      </p>

      <p className="counter">
        <span>Counter:</span>
        <strong>{count}</strong>
        <button
          onClick={() => setCount((n) => n - 1)}
        >
          -
        </button>
        <button
          onClick={() => setCount((n) => n + 1)}
        >
          +
        </button>
      </p>

      <p className="copyinfo">Built with Tails.js v{version}</p>
      <a href="/about">About</a>
    </div>
  );
}

export default Home;
