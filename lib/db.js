import { Low, JSONFile } from "lowdb";
import { join } from "path";
import {
  formatIssueKeyInput,
  formatToJiraApiDateString,
  getDirname,
  getJiraIssueKey,
} from "./utils/utils.js";
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

db.data = db.data || { issues: {}, worklogs: [], comments: [] };

function saveStartTime(issueKeyInput = getJiraIssueKey()) {
  const issueKey = formatIssueKeyInput(issueKeyInput);
  // 1. Get issue key and id
  db.data.issues[issueKey] = {
    id: issueKey,
    start: Date.now(),
  };
  db.write();
}

function fetchLogObject(issueKey = getJiraIssueKey()) {
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
async function saveToApi(issueKey = getJiraIssueKey(), comment) {
  await db.read();
  const logObject = fetchLogObject(issueKey);
  if (!logObject) {
    return Output.error(`No start data found in db for ${issueKey}`);
  }
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

/**
 * @param {comment} commentObject
 */
const addComment = (commentObject) => {
  db.data.comments.push(commentObject);
  db.write();
};

const getComments = async (maxLen) => {
  await db.read();
  return Array.from(db.data.comments).slice(0, maxLen);
};

/**
 * @returns {comment} if no comments are present in db, `{}` is returned
 */
const getLatestComment = async () => {
  await db.read();
  db.data.comments[db.data.comments.length - 1] || {};
};

const getCommentById = (commentId) =>
  db.data.comments.find((item) => item.id === commentId) || {};

const deleteComment = async (id) => {
  await db.read();
  db.data.comments = db.data.comments.filter((item) => item.id !== id);
  db.write();
};

export default {
  saveStartTime,
  saveStopTime,
  saveComment,
  saveToApi,
  getWorkLogs,
  deleteWorkLog,
  getWorkLogById,
  getLatestWorkLog,
  addComment,
  getComments,
  getLatestComment,
  getCommentById,
  deleteComment,
};
