export type Params = Record<string, string>;
export type Handler = (req: Request, params: Params) => Response | Promise<Response>;

interface Route {
  method: string;
  segments: string[];
  handler: Handler;
}

/** A tiny method + path router. Path segments starting with ':' are captured as params. */
export class Router {
  private readonly routes: Route[] = [];

  on(method: string, path: string, handler: Handler): this {
    this.routes.push({ method, segments: split(path), handler });
    return this;
  }

  match(method: string, pathname: string): { handler: Handler; params: Params } | undefined {
    const parts = split(pathname);
    for (const route of this.routes) {
      if (route.method !== method || route.segments.length !== parts.length) continue;
      const params: Params = {};
      const ok = route.segments.every((segment, i) => {
        const part = parts[i] ?? "";
        if (segment.startsWith(":")) {
          params[segment.slice(1)] = decodeURIComponent(part);
          return true;
        }
        return segment === part;
      });
      if (ok) return { handler: route.handler, params };
    }
    return undefined;
  }
}

function split(path: string): string[] {
  return path.split("/").filter(Boolean);
}
