// import { Routes } from "https://denopkg.com/andrewc910/tailsjs@master/types.ts";

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

export default routes;
