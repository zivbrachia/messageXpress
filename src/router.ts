import {MiddlewareLayer} from "./middlewareLayer";
import {Response} from "./response";
import {RouteLayer} from "./routeLayer";
import {NextFunc} from "./types";

export class Router {
  public stack: (RouteLayer | MiddlewareLayer)[];

  constructor() {
    this.stack = [];
  }

  public async handle(routingKey: string, req: any, res: Response) {
    const layerExecutor = this.executeLayers(routingKey, req, res);
    try {
      for await (const value of layerExecutor) {
      }
      if (!res.usedOnce) {
        throw new Error(`no action handler for ${routingKey}`)
      }
    } catch (err) {
      throw err;
    }
  }
  use(middleware: (msg: any, res: any, next: NextFunc) => void) {
    const layer = new MiddlewareLayer(middleware);
    this.stack.push(layer);
  }

  public action(routingKey: string, action: string, ...middlewares: ((msg: any | Error, res: any, next: NextFunc) => void)[]) {
    const layer = new RouteLayer(routingKey);
    layer.action(action, ...middlewares);
    this.stack.push(layer);
  }

  private *executeLayers(routingKey: string, req, res: Response) {
    for (const layer of this.stack) {
      // let errorOccurred = false;

      if (layer instanceof RouteLayer) {
        if (layer.routingKey !== routingKey) {
          continue;
        }

        yield* layer.executeLayers(routingKey, req, res);
      } else {
        const layerPromise = new Promise<void>((resolve, reject) => {
          // Call the middleware function with a custom next function
          const next = (err?: Error) => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          }
          res.next = next;
          layer.handleMessage(req, res, next);
        });
        yield layerPromise;
      }

      // If an error occurred in the middleware, break the loop
      if (res.error) {
        break;
      }

      if (res.usedOnce) {
        break;
      }
    }
  }
}
