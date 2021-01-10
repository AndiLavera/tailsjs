import React, { useState } from "https://esm.sh/react@17.0.1";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "https://esm.sh/react-query@3.5.11";

const About = ({ version }: { version: string }) => {
  const [count, setCount] = useState(0);

  const garden = {
    backgroundColor: "green",
    height: "auto",
    fontSize: "30px",
    maxWidth: "900px",
    padding: "20px 5px",
    width: "100%",
  };

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

export default About;
