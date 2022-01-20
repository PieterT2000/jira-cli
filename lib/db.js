import { Low, JSONFile } from "lowdb";
import { execSync } from "child_process";
import { join } from "path";
import { formatToJiraApiDateString, getDirname } from "./utils/utils.js";
import Output from "./utils/console-output.js";
import { checkFetchResult } from "./utils/errorHandling.js";
import { api } from "../bin/index.js";
import { formatResultAsWorklogEntry } from "./utils/type-formatting.js";

const __dirname = getDirname(import.meta.url);

const file = join(__dirname, "..", "db.json");
const adapter = new JSONFile(file);
const db = new Low(adapter);

// Read data from JSON file, this will set db.data content
await db.read();

db.data = db.data || { issues: {}, worklogs: [] };

function getJiraIssueKey() {
  return execSync("git rev-parse --abbrev-ref HEAD")
    .toString("utf8")
    .replace(/[\n\r\s]+$/, "");
  // do regex for verification here
}

function saveStartTime() {
  // 1. Get issue key and id
  const issueKey = getJiraIssueKey();
  db.data.issues[issueKey] = {
    id: issueKey,
    start: Date.now(),
  };
  db.write();
}

function fetchLogObject() {
  const issueKey = getJiraIssueKey();
  return db.data.issues[issueKey];
}

function saveStopTime() {
  const logObject = fetchLogObject();
  if (logObject) {
    logObject.end = Date.now();
    db.write();
    return logObject.id;
  }
}

function saveComment(issueKey = fetchLogObject(), comment) {
  const logObject = db.data.issues[issueKey];
  if (logObject) {
    logObject.comment = comment;
    db.write();
  }
}

/**
 * Adds log work entry to Jira through api instance
 * @param {String} comment
 */
async function saveToApi(comment) {
  await db.read();
  const logObject = fetchLogObject();
  const issueKey = logObject.id;
  const startDate = new Date(logObject.start);
  const endTime = new Date().getTime();
  const duration = Math.floor((endTime - startDate.getTime()) / 1000);
  const workLog = [
    issueKey,
    comment,
    formatToJiraApiDateString(startDate),
    duration,
  ];
  const resolved = checkFetchResult(await api.addWorklog(...workLog));
  if (resolved) {
    const { [issueKey]: logToBeDeleted, ...rest } = db.data.issues;
    db.data.issues = rest;
    db.data.worklogs.push(formatResultAsWorklogEntry(resolved, comment));
    db.write();

    Output.success(`Worklog added to ${issueKey}`);
  }
}

async function getWorkLogs(maxLen) {
  await db.read();
  return Array.from(db.data.worklogs).slice(0, maxLen);
}

function getWorkLogById(worklogId) {
  return db.data.worklogs.find((item) => item.id === worklogId) || {};
}
function getLatestWorkLog() {
  return db.data.worklogs[db.data.worklogs.length - 1] || {};
}

async function deleteWorkLog(id) {
  await db.read();
  db.data.worklogs = db.data.worklogs.filter((item) => item.id !== id);
  db.write();
}

export default {
  saveStartTime,
  saveStopTime,
  saveComment,
  saveToApi,
  getWorkLogs,
  deleteWorkLog,
  getWorkLogById,
  getLatestWorkLog,
};
