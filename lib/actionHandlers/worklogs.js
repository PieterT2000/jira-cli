import { api } from "../../bin/index.js";
import db from "../db.js";
import Output from "../utils/console-output.js";
import { checkFetchResult } from "../utils/errorHandling.js";
import cliConfig from "../../cli-config.js";
import {
  timeStringToSeconds,
  timeToToDateTimeString,
} from "../utils/date_time.js";
import {
  formatIssueKeyInput,
  formatToJiraApiDateString,
} from "../utils/utils.js";

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

/**
 * Add Work Log to Jira Issue
 * @param {String} issueKeyInput
 * @param {String} startTime
 * @param {String} timeSpent
 * @param {String} comment
 */
export const addWorkLog = async (...args) => {
  const [issueKeyInput] = args;

  let issueKey = null;
  if (issueKeyInput in cliConfig) {
    const log = cliConfig[issueKeyInput];
    issueKey = log.issueKey;
    args = [issueKey, log.startTime, log.timeSpent, log.comment];
  } else {
    issueKey = formatIssueKeyInput(issueKeyInput);
  }

  const [, startTime, timeSpent, comment = ""] = args;

  if (!issueKey)
    return Output.error(`Invalid issueKey or log type: ${issueKeyInput}`);
  if (!timeSpent) return Output.error("Please specify time spent");

  let startTimeDateStr = startTime ? timeToToDateTimeString(startTime) : Date();
  const jiraDateString = formatToJiraApiDateString(startTimeDateStr);
  const timeInSeconds = timeStringToSeconds(timeSpent);

  const resolved = checkFetchResult(
    await api.addWorklog(issueKey, comment, jiraDateString, timeInSeconds)
  );
  if (resolved) {
    Output.success(` ${comment} log added for ${issueKey}!`);
  }
};

export default {
  listWorkLogs,
  deleteWorkLog,
  addWorkLog,
};
