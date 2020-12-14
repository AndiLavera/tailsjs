import { TestController } from "../src/controllers/test_controller.ts";
import { logger, Router } from "https://denopkg.com/andrewc910/tailsjs/mod.ts";

export default class extends Router {
  drawRoutes() {
    this.pipeline("api", () => {
      return [
        logger,
      ];
    });

    this.pipeline("web", () => {
      return [
        logger,
      ];
    });

    this.routes("api", () => {
      this.get({
        path: "/create",
        module: TestController,
        method: "create",
      });
    });

    this.routes("web", () => {
      this.get(
        {
          path: "/",
          page: "index.tsx",
        },
      );
      this.get(
        {
          path: "/about",
          page: "about.tsx",
        },
      );
    });
  }
}
