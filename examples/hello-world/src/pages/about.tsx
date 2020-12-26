import React from "https://esm.sh/react";
import { garden } from "../components/garden.ts";

const Home = ({ version }: { version: string }) => {
  const [count, setCount] = React.useState(0);

  return (
    <div className="pure-g pure-u">
      <h2>My DenoReact App - Version: {version}</h2>
      <button className="pure-button" onClick={() => setCount(count + 1)}>
        Add a 🦕 in your garden!
      </button>
      <p style={garden}>
        {Array(count).fill(<span>🦕</span>)}
      </p>
      <a href="/">Home</a>
    </div>
  );
};

export default Home;
