import type { ServerResponse } from "node:http";

export class ErrorResponseProvider {
  public writeBadRequest = (response: ServerResponse, message: string): void => {
    this.writeError(response, 400, "bad_request", message);
  };

  public writeNotFound = (response: ServerResponse): void => {
    this.writeError(response, 404, "not_found", "接口不存在");
  };

  public writeMethodNotAllowed = (response: ServerResponse): void => {
    this.writeError(response, 405, "method_not_allowed", "请求方法不支持");
  };

  public writeInternalError = (response: ServerResponse, error: unknown): void => {
    const message = error instanceof Error ? error.message : "未知错误";
    this.writeError(response, 500, "internal_error", message);
  };

  private writeError = (response: ServerResponse, statusCode: number, code: string, message: string): void => {
    response.writeHead(statusCode, {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*"
    });
    response.end(JSON.stringify({ error: { code, message } }));
  };
}
