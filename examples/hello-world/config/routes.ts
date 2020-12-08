import { Router } from "../../../controller/router.ts";
import { TestController } from "../src/controllers/test_controller.ts";
import logging from "../src/middleware/logging.ts";

export default class extends Router {
  drawRoutes() {
    this.pipeline("api", () => {
      return [
        logging,
      ];
    });

    this.routes("api", () => {
      this.get("/create", TestController, "create");
    });
  }
}
