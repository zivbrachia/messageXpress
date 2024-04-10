export class Response {
  body: any;
  usedOnce: boolean;
  error?: Error;
  next?: (err?: Error) => void;
  constructor() {
    this.usedOnce = false;
    this.body = undefined;
    this.error = undefined;
  }

  err(err: Error) {
    this.error = err;
  }

  end(res: any) {
    this.usedOnce = true;
    this.body = res;

    if (this?.next) {
      this.next();
    }
  }

  json(res: any) {
    this.usedOnce = true;
    this.body = res;

    if (this?.next) {
      this.next();
    }
  }
}
