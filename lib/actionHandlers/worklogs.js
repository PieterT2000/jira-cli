import { api } from "../../bin/index.js";
import db from "../db.js";
import Output from "../utils/console-output.js";
import { checkFetchResult } from "../utils/errorHandling.js";

export const listWorkLogs = async (maxLen = 10) => {
  const items = await db.getWorkLogs(maxLen);
  Output.info("Worklog Item List");
  console.table(items);
};

/**
 * Delete worklog by id in both database and api
 * @param {string} id worklog id
 */
export const deleteWorkLog = async (id) => {
  let issueId;
  if (!id) {
    ({ issueId, id } = db.getLatestWorkLog());
  } else {
    ({ issueId } = db.getWorkLogById(id));
  }

  if (!id) {
    return Output.error("No worklogs added yet!");
  } else if (!issueId) {
    return Output.error(`No worklog found in db with id ${id}`);
  }

  const resolved = checkFetchResult(await api.deleteWorklog(issueId, id));
  if (resolved) {
    db.deleteWorkLog(id);
    Output.success(`Successfully deleted worklog with id ${id}`);
  }
};

export default {
  listWorkLogs,
  deleteWorkLog,
};
