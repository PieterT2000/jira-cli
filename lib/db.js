import { Low, JSONFile } from "lowdb";
import { execSync } from "child_process";
import { join } from "path";
import { getDirname } from "./utils.js";
import JiraClient from "./jira-client/lib/index.js";
import Output from "./console-output.js";

const __dirname = getDirname(import.meta.url);

const file = join(__dirname, "db.json");
const adapter = new JSONFile(file);
const db = new Low(adapter);

// Read data from JSON file, this will set db.data content
await db.read();

db.data = db.data || { issues: {} };

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
 * @param {JiraClient} api
 * @param {String} comment
 */
async function saveToApi(api, comment) {
  const logObject = fetchLogObject();
  const issueKey = logObject.id;
  const startDate = new Date(logObject.start);
  const endTime = new Date().getTime();
  const duration = Math.floor((endTime - startDate.getTime()) / 1000);
  const result = await api.addWorklog(
    issueKey,
    comment,
    startDate.toISOString(),
    duration
  );
  if (result.errorMessages) {
    result.errorMessages.map(Output.error);
  } else {
    delete db.data.issues[issueKey];
    db.write();
  }
}

export default { saveStartTime, saveStopTime, saveComment, saveToApi };
