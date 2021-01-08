export default abstract class Controller {
  // deno-lint-ignore no-explicit-any
  [key: string]: any

  constructor() {}

  log(msg: string) {
    console.log(msg);
  }
}
