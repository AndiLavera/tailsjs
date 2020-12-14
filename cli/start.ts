import log from "../logger/logger.ts";

export const helpMessage = `
Usage:
    aleph start <dir> [...options]

<dir> represents the directory of Aleph.js app,
if the <dir> is empty, the current directory will be used.

Options:
    -p, --port       A port number to start the Aleph.js app, default is 3000
    -L, --log-level  Set log level [possible values: debug, info]
    -r, --reload     Reload source code cache
    -h, --help       Prints help message
`;

function ensureValidPort(port: number) {
  if (isNaN(port) || port <= 0 || !Number.isInteger(port)) {
    log.error(`invalid port '${port}'`);
    Deno.exit(1);
  }
}

export default async function (
  appDir: string,
  options: Record<string, string | boolean>,
) {
  const { start } = await import("../core/server.ts");

  const port = parseInt(String(options.p || options.port || "3000"));
  ensureValidPort(port);

  start(appDir, port, "production", Boolean(options.r || options.reload));
}
