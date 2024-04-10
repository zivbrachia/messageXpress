import {Response} from "./response";

export type NextFunc = (err?: Error) => void;
export type MiddlewareFunc<T> = (req: T, res: Response, next: NextFunc) => void;
export interface RequestWithBody<T> {
    body: T;
}