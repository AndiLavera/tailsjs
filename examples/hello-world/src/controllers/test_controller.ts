import { Controller } from "https://denopkg.com/andrewc910/tailsjs/mod.ts";

export default class extends Controller {
  show() {
    console.log("show api hit");
    return { method: "show" };
  }

  create() {
    console.log("create api hit");
    return { version: "0.1.0" };
  }
}
