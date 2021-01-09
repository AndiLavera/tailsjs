import { Context } from "https://deno.land/x/tails@v0.1.2/mod.ts";

export default async (ctx: Context, next: () => Promise<void>) => {
  console.log("HIT USER LOGGER");
  await next();
};
