import {MiddlewareFunc} from "../types";

export const init: MiddlewareFunc<any> = (req, res, next) => {
  next();
};
