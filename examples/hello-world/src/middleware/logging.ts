import { Context } from "https://denopkg.com/andrewc910/tailsjs/mod.ts";

export default async (ctx: Context, next: () => Promise<void>) => {
  console.log("HIT USER LOGGER");
  await next();
};
