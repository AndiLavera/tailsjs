import React from "https://esm.sh/react@17.0.1";

export default function Logo({ width = 75 }: { width?: number }) {
  return (
    <img src="/logo.svg" width={width} title="Aleph.js" />
  );
}
