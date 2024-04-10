import {Response} from "./response";
import {MiddlewareFunc, NextFunc} from "./types";

export class MiddlewareLayer {
    constructor(private handle: MiddlewareFunc<any>, private options?: {}) {
    }

    handleMessage(req: any, res: Response, next: NextFunc) {
        try {
            // handle async middleware with Promise.resolve().catch
            Promise.resolve(this.handle(req, res, next))
                .catch(err => {
                    next(err);
                });
        } catch (err) {
            // handle sync middleware with try...catch
            next(err);
        }
    }
}
