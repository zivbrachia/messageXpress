import {MiddlewareLayer} from "./middlewareLayer";
import {Response} from "./response";
import {MiddlewareFunc} from "./types";

export class RouteLayer {
  public stack: (RouteLayer | MiddlewareLayer)[] = [];
  constructor(public readonly routingKey: string, public readonly actionName: string = '') {
    this.stack = [];
    // this.actions = new Map();
  }

  public use(middleware: MiddlewareFunc<any> | RouteLayer) {
    if (middleware instanceof RouteLayer) {
      this.stack.push(middleware);
    } else {
      const layer = new MiddlewareLayer(middleware);
      this.stack.push(layer);
    }
  }

  public action(action: string, ...middlewares: MiddlewareFunc<any>[]) {
    const layer = new RouteLayer(this.routingKey, action);
    for (const middleware of middlewares) {
      layer.use(middleware);
    }
    this.stack.push(layer);
  }
  handleMessage(req: any, res: Response, next) {
    try {
      this.handle(this.routingKey, req, res);
      if (res.usedOnce) {
        next();
      }
    } catch (err) {
      throw err;
    }
  }

  public *executeLayers(routingKey: string, req, res) {
    for (const layer of this.stack) {
      if (layer instanceof RouteLayer && layer?.actionName === req?.body?.action) {
        const generatorLayers = layer.executeLayers(routingKey, req, res);
        yield* generatorLayers;
      } else {
        if (layer instanceof RouteLayer) {
          continue;
        }
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
        if (res.usedOnce) {
          break;
        }
        if (res.error) {
          break;
        }
        yield layerPromise;
      }
    }
  }

  public async handle(routingKey: string, req: any, res: Response) {
    const layerExecutor = this.executeLayers(routingKey, req, res);

    try {
      for await (const value of layerExecutor) {
      }
    } catch (err) {
      throw err;
    }
  }
}
