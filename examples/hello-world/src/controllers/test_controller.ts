import { Controller } from "https://denopkg.com/andrewc910/tailsjs/mod.ts";

export class TestController extends Controller {
  show() {
    return { version: "0.1.0" };
  }
  create() {
    console.log("HIIIIT");
    console.log("create");
  }
}
