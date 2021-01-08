// import { Routes } from "https://deno.land/x/tails@v0.1.1/types.ts";
// TODO: Would be nice to make this type safe...

const routes = {
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
        ssg: true,
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

export default routes;
