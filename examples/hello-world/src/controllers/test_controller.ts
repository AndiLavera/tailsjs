import { Controller } from "https://deno.land/x/tails@v0.1.2/mod.ts";

export default class extends Controller {
  show() {
    return { version: "0.1.2" };
  }

  create() {
    return { version: "0.1.2" };
  }
}
