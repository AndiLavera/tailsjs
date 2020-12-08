export default abstract class Controller {
  // deno-lint-ignore no-explicit-any
  [key: string]: any

  constructor() {
    console.log("construct controller");
  }

  log(msg: string) {
    console.log(msg);
  }
}
