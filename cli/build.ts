export const helpMessage = `
Usage:
    aleph build <dir> [...options]

<dir> represents the directory of Aleph.js app,
if the <dir> is empty, the current directory will be used.

Options:
    -L, --log-level  Set log level [possible values: debug, info]
    -r, --reload     Reload source code cache
    -h, --help       Prints help message
`;

export default async function (
  appDir: string,
  options: Record<string, string | boolean>,
) {
  const { Application } = await import("../core/application.ts");
  const app = new Application(
    appDir,
    "production",
    Boolean(options.r || options.reload),
  );
  await app.build();
  Deno.exit(0);
}
