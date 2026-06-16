import type { ServerResponse } from "node:http";
import { JsonResponseProvider } from "../providers/json-response.provider";
import type { TaskCenterService } from "../services/task-center.service";
import { getIntegerQueryParam } from "../utils/query-param.utils";

export class TasksController {
  public constructor(
    private readonly taskCenterService: TaskCenterService,
    private readonly jsonResponseProvider = new JsonResponseProvider()
  ) {}

  public handleTasks = (url: URL, response: ServerResponse): void => {
    const limit = getIntegerQueryParam(url, "limit", 80, 1, 200);
    this.jsonResponseProvider.writeJson(response, this.taskCenterService.getTaskCenter(limit));
  };
}
