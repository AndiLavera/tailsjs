import { Context } from "../../../../mod.ts";

export default async (ctx: Context, next: () => Promise<void>) => {
  console.log("HIT USER LOGGER");
  await next();
};
