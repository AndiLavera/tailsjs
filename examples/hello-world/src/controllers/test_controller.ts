import { Controller } from "https://denopkg.com/andrewc910/tailsjs/mod.ts";

export default class extends Controller {
  show() {
    console.log("show APIII hit");
    return { method: "show" };
  }

  create() {
    console.log("create api hit");
    return { version: "0.5.0" };
  }
}
