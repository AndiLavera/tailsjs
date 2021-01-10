// Note: Runtime is injected when building the route. This is so
// react-refresh-runtime can be compiled and served locally.
import events from "./events.ts";

interface Callback {
  // deno-lint-ignore no-explicit-any
  (...args: any[]): void;
}

const hashShort = 9;

// deno-lint-ignore ban-types
function debounce<T extends Function>(callback: T, delay: number): T {
  let timer: number | null = null;
  // deno-lint-ignore no-explicit-any
  return ((...args: any[]) => {
    if (timer != null) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      timer = null;
      callback(...args);
    }, delay);
    // deno-lint-ignore no-explicit-any
  }) as any;
}

// react-refresh
// @link https://github.com/facebook/react/issues/16604#issuecomment-528663101
runtime.injectIntoGlobalHook(window);
Object.assign(window, {
  $RefreshReg$: () => {},
  // deno-lint-ignore no-explicit-any
  $RefreshSig$: () => (type: any) => type,
});
export const performReactRefresh = debounce(
  runtime.performReactRefresh,
  30,
);
export const RefreshRuntime = runtime;

class Module {
  private readonly id: string;
  private isLocked: boolean;
  private isAccepted: boolean;
  private readonly acceptCallbacks: Callback[];

  constructor(id: string) {
    this.id = id;
    this.isLocked = false;
    this.isAccepted = false;
    this.acceptCallbacks = [];
  }

  lock(): void {
    this.isLocked = true;
  }

  accept(callback?: () => void): void {
    if (this.isLocked) {
      return;
    }
    if (!this.isAccepted) {
      sendMessage({ id: this.id, type: "hotAccept" });
      this.isAccepted = true;
    }
    if (callback) {
      this.acceptCallbacks.push(callback);
    }
  }

  async applyUpdate(updateUrl: string) {
    try {
      const module = await import(updateUrl + "?t=" + Date.now());
      this.acceptCallbacks.forEach((callback) => callback(module));
    } catch (e) {
      location.reload();
    }
  }
}

// deno-lint-ignore no-explicit-any
const { location } = window as any;
const { protocol, host } = location;
const modules: Map<string, Module> = new Map();
// deno-lint-ignore no-explicit-any
const messageQueue: any[] = [];
const socket = new WebSocket(
  (protocol === "https:" ? "wss" : "ws") + "://" + host + "/_hmr",
  /*  'aleph-hmr' */
);

socket.addEventListener("open", () => {
  messageQueue.forEach((msg) => socket.send(JSON.stringify(msg)));
  messageQueue.splice(0, messageQueue.length);
  console.log("[HMR] listening for file changes...");
});

// TODO: This is disabled because it breaks loading
// any page except root.
// socket.addEventListener("close", () => {
//   location.reload();
// });

socket.addEventListener("message", ({ data: rawData }: { data?: string }) => {
  if (rawData) {
    try {
      const { type, moduleId, hash, updateUrl } = JSON.parse(rawData);
      const mod = modules.get(moduleId);

      switch (type) {
        case "add":
          events.emit("add-module", { id: moduleId, hash });
          break;
        case "update":
          if (mod) mod.applyUpdate(updateUrl);

          break;
        case "remove":
          if (modules.has(moduleId)) {
            modules.delete(moduleId);
            events.emit("remove-module", moduleId);
          }
          break;
      }
      console.log(
        `[HMR]${
          hash ? " [" + hash.slice(0, hashShort) + "]" : ""
        } ${type} module '${moduleId}'`,
      );
    } catch (err) {
      console.warn(err);
    }
  }
});

// deno-lint-ignore no-explicit-any
function sendMessage(msg: any) {
  if (socket.readyState !== socket.OPEN) {
    messageQueue.push(msg);
  } else {
    socket.send(JSON.stringify(msg));
  }
}

export function createHotContext(id: string) {
  if (modules.has(id)) {
    const mod = modules.get(id)!;
    mod.lock();
    return mod;
  }

  const mod = new Module(id);
  modules.set(id, mod);
  return mod;
}
