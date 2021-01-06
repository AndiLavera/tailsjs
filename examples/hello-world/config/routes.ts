import { Routes } from "../../../types.ts";

export const routes: Routes = {
  api: {
    middleware: [],
    routes: [
      {
        controller: "test_controller",
        method: "create",
        httpMethod: "GET",
        path: "/create",
      },
    ],
  },

  web: {
    middleware: [],
    routes: [
      {
        page: "index",
        ssg: false,
        path: "/",
        controller: "test_controller",
        method: "show",
      },
      {
        page: "about",
        path: "/about",
      },
    ],
  },
};
