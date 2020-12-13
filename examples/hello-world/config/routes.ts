import { TestController } from "../src/controllers/test_controller.ts";
import { logger, Router } from ".https://deno.land/x/tails/mod.ts";

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
