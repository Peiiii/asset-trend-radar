import type { ServerResponse } from "node:http";

export class JsonResponseProvider {
  public writeJson = (response: ServerResponse, payload: unknown, statusCode = 200): void => {
    response.writeHead(statusCode, {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "cache-control": "no-store"
    });
    response.end(JSON.stringify(payload));
  };

  public writeNoContent = (response: ServerResponse): void => {
    response.writeHead(204, {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-headers": "content-type"
    });
    response.end();
  };
}
