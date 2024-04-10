import {Router} from "./router";
import {init} from "./middleware/init";
import {Response} from "./response";
import {MiddlewareLayer} from "./middlewareLayer";
import http from "http";
import { Socket } from "node:net";
import * as stream from "stream";
import {RouteLayer} from "./routeLayer";
import {NextFunc} from "./types";
import { EventEmitter } from 'events';

export class Application extends EventEmitter {
    private _router: Router;

    constructor() {
        super();
        this._router = new Router();
        this._router.use(init);
    }

    internalHandle = async (msg: any, routingKey: string) => {
        const res = new Response();
        await this._router.handle(routingKey, msg, res);
        return res.body;
    }

    private rawMsgToIncomingMsg = (rawMsg: any) => {
        const bodyStream = new stream.Readable();
        bodyStream._read = () => {}; // Define a dummy _read function for the readable stream
        bodyStream.push(rawMsg.content.toString().trim());
        bodyStream.push(null); // Indicates the end of the stream

        /* Create an instance of http.IncomingMessage
        using http.IncomingMessage for req in messageXpress gives the ability
        to use 99% of express middlewares.
         */
        const req = new http.IncomingMessage(new Socket());
        req.method = 'POST';
        req.url = '/data';
        req.headers = {
            'content-type': 'application/json',
            'content-length': Buffer.byteLength(rawMsg.content.toString().trim(), 'utf-8').toString()
        };

        req['body'] = {};
        // Attach the body stream to the request
        req.push = bodyStream.push.bind(bodyStream);
        req.push(null); // Indicate the end of the request body

        req['getHeader'] = function (headerName) {
            return this.headers[headerName.toLowerCase()];
        };

        /*
         using setTimeout just for using express.json({limit: '50Mb'}).
         express.json set req.body after stream data with an json object.
         in case we set req.body our self we can skip this setTimeout()
         */
        setTimeout(() => {
            // Emit 'data' events on the request object for each chunk of data from the body stream
            bodyStream.on('data', (chunk) => {
                req.emit('data', chunk);
            });

            // Emit the 'end' event on the request object when the body stream ends
            bodyStream.on('end', () => {
                req.emit('end');
            });
        }, 0);
        return req;
    }

    handle = async (rawMsg: any, ch: string) => {
        const req = this.rawMsgToIncomingMsg(rawMsg);
        this.emit('message_arrive', rawMsg, ch, req);

        try {
            const res = new Response();
            await this._router.handle(rawMsg.fields.routingKey, req, res);
            this.emit('handled', req, res);
            return true;
        } catch (err) {
            this.emit('error', err, req);
            return true;
        }
    }

    public action(routingKey: string, action: string, ...middlewares: ((req: any | Error, res: any, next: NextFunc) => void)[]) {
        const route = new RouteLayer(routingKey);
        route.action(action, ...middlewares);
        this._router.stack.push(route);
    }

    public use(middleware: ((req: any | Error, res: any, next: NextFunc) => void) | RouteLayer) {
        if (middleware instanceof RouteLayer) {
            this._router.stack.push(middleware);
        } else {
            const layer = new MiddlewareLayer(middleware);
            this._router.stack.push(layer);
        }
    }
}
