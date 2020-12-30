import {
  reExportDefault,
  reExportDefaultFunction,
  reImportPath,
} from "../core/utils.ts";

function removeImports(jsFile: string) {
  const imports = jsFile.match(reImportPath) || [];

  let jsContent = jsFile;
  imports.forEach((imp) => {
    jsContent = jsContent.replace(imp, "");
  });

  return { jsContent, imports };
}

function buildHMRPath(id: string) {
  // console.log(id.split("/").slice(1, -1));
  const splitID = id.split("/").slice(1, -1);

  let pathname = splitID.length === 0 ? "./" : "";
  splitID.forEach((dir) => {
    // if (dir !== "pages") {
    //   pathname += "../";
    // }
    pathname += "../";
  });

  pathname += "_hmr.ts";

  // console.log(id);
  // console.log(pathname);
  return pathname;
}

export function injectHMR(id: string, jsFile: string): string {
  let lines = [
    `import { createHotContext, RefreshRuntime, performReactRefresh } from "${
      buildHMRPath(id)
    }";`,
    `import.meta.hot = createHotContext(${JSON.stringify(id)});`,
  ];

  const { jsContent, imports } = removeImports(jsFile);

  lines = lines.concat(imports);

  const reactRefresh = id.endsWith(".js") ||
    id.endsWith(".md") ||
    id.endsWith(".mdx");

  if (reactRefresh) {
    lines.push("");
    lines.push(
      `const prevRefreshReg = window.$RefreshReg$;`,
      `const prevRefreshSig = window.$RefreshSig$;`,
      `Object.assign(window, {`,
      `    $RefreshReg$: (type, id) => {
        RefreshRuntime.register(type, ${JSON.stringify(id)} + " " + id)
      },`,
      `    $RefreshSig$: RefreshRuntime.createSignatureFunctionForTransform`,
      `});`,
    );
    lines.push("var _a;");
  }

  lines.push("");
  lines.push(jsContent);
  lines.push("");

  if (reactRefresh) {
    // TODO: I have no idea why the matched result will be:
    // [ "export default function Logo", "Logo" ]
    // And that should be figured out
    let matchedExport = jsContent.match(reExportDefaultFunction);
    matchedExport ||= jsContent.match(reExportDefault) as RegExpMatchArray;

    const matchedConst = matchedExport[matchedExport.length - 1];

    lines.push(`_a = ${matchedConst}`);
    lines.push(`$RefreshReg$(_a, "${matchedConst}")`);
    lines.push("");

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
