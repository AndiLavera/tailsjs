import { existsFile } from "../fs.ts";
import log from "../logger/logger.ts";
import { colors, path, walk } from "../std.ts";

export async function logBuildEvents(buildPath: string) {
  const staticPath = path.join(buildPath, "static");
  const publicPath = path.join(buildPath, "public");
  const pagesPath = path.join(buildPath, "/app/pages");
  const pages: string[] = [];

  for await (const { path: pathname } of walk(pagesPath)) {
    if (pathname === pagesPath) continue;

    if (pathname.includes(".map")) continue;

    const filename = pathname
      .replace(pagesPath, "");

    const htmlPath = path.join(staticPath, filename.replace(".js", ".html"));

    let logString = "  ";
    if (await existsFile(htmlPath)) {
      logString = logString + "● ";
    } else {
      logString = logString + "λ ";
    }

    logString = logString + filename.replace(".js", "").replace("index", "");

    pages.push(logString);
  }

  log.info(colors.bold("Pages:"));

  pages.reverse().forEach((page) => log.info(page));
  console.log("\n");

  log.info(
    "λ  (SSR)  server-side renders at runtime (uses a controller but isn't marked static)",
  );
  // // log.info(
  // //   `○  (Static)  automatically rendered as static HTML (uses no initial props)`,
  // // );
  log.info(
    "●  (SSG)     automatically generated as static HTML + JSON (uses getStaticProps)",
  );
  // log.info(
  //   "!  (ISR)     incremental static regeneration (uses revalidate in getStaticProps)",
  // );
}
