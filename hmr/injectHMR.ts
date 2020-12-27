import { reImportPath } from "../core/utils.ts";

function removeImports(jsFile: string) {
  const imports = jsFile.match(reImportPath) || [];

  let jsContent = jsFile;
  imports.forEach((imp) => {
    jsContent = jsContent.replace(imp, "");
  });

  return { jsContent, imports };
}

export function injectHMR(id: string, jsFile: string): string {
  const lines = [
    `import { createHotContext, RefreshRuntime, performReactRefresh } from "./_hmr.ts";`,
    `import.meta.hot = createHotContext(${JSON.stringify(id)});`,
  ];

  const { jsContent, imports } = removeImports(jsFile);
  lines.concat(imports);

  const reactRefresh = id.endsWith(".js") ||
    id.endsWith(".md") ||
    id.endsWith(".mdx");

  if (reactRefresh) {
    lines.push("");
    lines.push(
      `const prevRefreshReg = window.$RefreshReg$;`,
      `const prevRefreshSig = window.$RefreshSig$;`,
      `Object.assign(window, {`,
      `    $RefreshReg$: (type, id) => RefreshRuntime.register(type, ${
        JSON.stringify(id)
      } + " " + id),`,
      `    $RefreshSig$: RefreshRuntime.createSignatureFunctionForTransform`,
      `});`,
    );
  }

  lines.push("");
  lines.push(jsContent);
  lines.push("");

  if (reactRefresh) {
    lines.push(
      "window.$RefreshReg$ = prevRefreshReg;",
      "window.$RefreshSig$ = prevRefreshSig;",
      "import.meta.hot.accept(performReactRefresh);",
    );
  } else {
    lines.push("import.meta.hot.accept();");
  }

  return lines.join("\n");
}
