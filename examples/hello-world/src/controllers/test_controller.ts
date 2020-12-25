import { Controller } from "https://denopkg.com/andrewc910/tailsjs/mod.ts";

export default class extends Controller {
  show() {
    return { version: "0.1.0" };
  }

  create() {
    console.log("HIIIIT");
    console.log("create");
    return { version: "0.2.0" };
  }
}
