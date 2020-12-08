import { Context } from "../../../../deps.ts";

export default async (ctx: Context, next: () => Promise<void>) => {
  console.log("HIT USER LOGGER");
  await next();
};
