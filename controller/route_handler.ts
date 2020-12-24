import FakeRouter from "../controller/fake_router.ts";
import { Router } from "../controller/router.ts";
import { Router as ServerRouter } from "../deps.ts";
import { Configuration } from "../core/configuration.ts";
import { path } from "../std.ts";
import { AssetRouter } from "../types.ts";
import { ModuleHandler } from "../core/module_handler.ts";
import { DevelopmentAssetRouter } from "./development_asset_router.ts";
import { WebRouter } from "./web_router.ts";

// TODO: For dev mode, fetch modules on each route hit for ModuleHandler#watch
// Prod mode should load everything into routes like current set up
export class RouteHandler {
  router: Router;

  readonly serverRouters: ServerRouter[];

  private readonly config: Configuration;
  private readonly assetRouter: AssetRouter;
  private readonly webRouter: WebRouter;
  private readonly moduleHandler: ModuleHandler;

  constructor(
    config: Configuration,
    moduleHandler: ModuleHandler,
    assetRouter: AssetRouter = new DevelopmentAssetRouter(),
  ) {
    this.config = config;
    this.moduleHandler = moduleHandler;
    this.serverRouters = [];
    this.assetRouter = assetRouter;

    this.router = new FakeRouter();
    this.webRouter = new WebRouter(
      config,
      moduleHandler,
    );
  }

  get _allStaticRoutes(): string[] {
    return this.router._allStaticRoutes;
  }

  async init(): Promise<void> {
    await this.prepareRouter();
  }

  async prepareRouter(): Promise<void> {
    const routesPath = path.join(this.config.appRoot, "config/routes.ts");
    const { default: routes } = await import("file://" + routesPath);

    const router = new routes();
    router.drawRoutes();
    this.router = router;
  }

  async build(): Promise<void> {
    await this.webRouter.setRoutes(
      this.router,
      this.serverRouters,
    );
    // await this.setUserRoutes();
    await this.assetRouter.setRoutes(
      this.moduleHandler,
      this.config,
    );

    this.serverRouters.push(this.assetRouter.serverRouter);
  }
}
