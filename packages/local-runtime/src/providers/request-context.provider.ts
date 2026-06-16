import type { IncomingMessage } from "node:http";

export class RequestContextProvider {
  public getUrl = (request: IncomingMessage): URL => {
    const host = request.headers.host ?? "127.0.0.1";
    return new URL(request.url ?? "/", `http://${host}`);
  };
}
