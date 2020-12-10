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

    this.pipeline("web", () => {
      return [
        logging,
      ];
    });

    this.routes("api", () => {
      // this.get("/create", TestController, "create");
      this.gett({
        path: "/create",
        module: TestController,
        method: "create",
      });
    });

    this.routes("web", () => {
      this.gett(
        {
          path: "/",
          page: "index.tsx",
        },
      );
      this.gett(
        {
          path: "/about",
          page: "about.tsx",
        },
      );
    });
  }
}
