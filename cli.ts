import { existsDirSync } from "./fs.ts";
import log from "./logger/logger.ts";
import { path } from "./std.ts";
import { version } from "./version.ts";
import util from "./core/utils.ts";

const commands = {
  "init": "Create a new application",
  "dev": "Start the app in development mode",
  "start": "Start the app in production mode",
  "build": "Build the app to a static site (SSG)",
  "upgrade": "Upgrade Tails command",
};

const helpMessage = `Tails.js v${version}
The React Framework in deno.

Docs: https://tails.org/docs
Bugs: https://github.com/tailsjs/tails/issues

Usage:
    tails <command> [...options]

Commands:
    ${
  Object.entries(commands)
    .map(([name, desc]) => `${name.padEnd(15)}${desc}`)
    .join("\n    ")
}

Options:
    -h, --help     Prints help message
    -v, --version  Prints version number
`;

async function main() {
  const args: Array<string> = [];
  const argOptions: Record<string, string | boolean> = {};

  // parse deno args
  for (let i = 0; i < Deno.args.length; i++) {
    const arg = Deno.args[i];

    if (arg.startsWith("-")) {
      if (arg.includes("=")) {
        const [key, value] = arg.replace(/^-+/, "").split("=", 2);

        argOptions[key] = value;
      } else {
        const key = arg.replace(/^-+/, "");
        const nextArg = Deno.args[i + 1];

        if (nextArg && !nextArg.startsWith("-")) {
          argOptions[key] = nextArg;
          i++;
        } else {
          argOptions[key] = true;
        }
      }
    } else {
      args.push(arg);
    }
  }

  // get command, default is 'dev'
  const hasCommand = args.length > 0 && args[0] in commands;
  const command =
    (hasCommand ? String(args.shift()) : "dev") as keyof typeof commands;

  // prints version
  if (argOptions.v && command != "upgrade") {
    console.log(`tails.js v${version}`);
    Deno.exit(0);
  }

  // prints aleph.js and deno version
  if (argOptions.version && command != "upgrade") {
    const { deno, v8, typescript } = Deno.version;
    console.log(`tails.js ${version}`);
    console.log(`deno ${deno}`);
    console.log(`v8 ${v8}`);
    console.log(`typescript ${typescript}`);
    Deno.exit(0);
  }

  // // prints help message
  if (argOptions.h || argOptions.help) {
    if (hasCommand) {
      import(`./cli/${command}.ts`).then(({ helpMessage }) => {
        console.log(commands[command]);
        if (util.isNEString(helpMessage)) {
          console.log(helpMessage);
        }
        Deno.exit(0);
      });
      return;
    } else {
      console.log(helpMessage);
      Deno.exit(0);
    }
  }

  // sets log level
  const logLevel = argOptions.L || argOptions["log-level"];
  if (util.isNEString(logLevel)) {
    log.setLevel(logLevel);
  }

  const { default: cmd } = await import(`./cli/${command}.ts`);
  if (command === "upgrade") {
    await cmd(argOptions.v || argOptions.version || "latest");
  } else {
    const appDir = path.resolve(args[0] || ".");
    if (command !== "init" && !existsDirSync(appDir)) {
      log.fatal("No such directory:", appDir);
    }

    await cmd(appDir, argOptions);
  }
}

if (import.meta.main) {
  main();
}
