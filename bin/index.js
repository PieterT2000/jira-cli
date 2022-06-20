#!/usr/local/bin/node
import { config } from "dotenv";
import { Argument, Command } from "commander/esm.mjs";
import * as readline from "node:readline";
import { stdin as input, stdout as output } from "node:process";
import path from "path";

import cliConfig from "../cli-config.js";
import db from "../lib/db.js";
import JiraClient from "../lib/jira-client/lib/index.js";

import {
  formatToJiraApiDateString,
  getDirname,
  getJiraIssueKey,
} from "../lib/utils/utils.js";
import { checkFetchResult } from "../lib/utils/errorHandling.js";
import Output from "../lib/utils/console-output.js";

import {
  getIssue,
  listIssues,
  updateIssueStatus,
} from "../lib/actionHandlers/issues.js";
import { deleteWorkLog, listWorkLogs } from "../lib/actionHandlers/worklogs.js";
import {
  addComment,
  listComments,
  deleteComment,
} from "../lib/actionHandlers/comments.js";
import { Status } from "../lib/types/types.js";

const __dirname = getDirname(import.meta.url);
config({ path: path.join(__dirname, "..", ".env") });

const jiraConfig = {
  endpoint: process.env.JIRA_END_POINT,
  username: process.env.JIRA_USERNAME,
  apikey: process.env.JIRA_API_KEY,
};

export const api = new JiraClient(jiraConfig);

const program = new Command();

const commentsRequired = false;

program
  .command("start")
  .argument("[issueKey]")
  .description("Starts the timer")
  .action(db.saveStartTime);
program
  .command("log")
  .addArgument(
    new Argument("<type>", "The type of work/activity you want to log").choices(
      Object.keys(cliConfig)
    )
  )
  .description("Logs work on the activity specified in cli-config.js")
  .action(async (type) => {
    if (type in cliConfig) {
      const { issueKey, comment, timeSpent, startTime } = cliConfig[type];
      let startTimeDateStr = Date();
      if (startTime) {
        const timeRegex =
          /^(\d{1,2})[:. ]?(\d{0,2})[:. ]?(\d{0,2})[:. ]?([ap]?\.?m\.?)?/gi;
        const [, h, m, s, period] = timeRegex.exec(startTime);

        const timeMarkerRegex = /^([ap]{1})\.?m?\.?/gi;
        let timeMarker = null;
        if (period) [, timeMarker] = timeMarkerRegex.exec(period);

        const date = new Date();
        let periodAdjustedHour = h;
        /**
         * Conventions:
         * - 12 p.m. -> noon
         * - 12 a.m. -> noon
         */
        if (timeMarker === "p" && h < 12) periodAdjustedHour += 12;
        else if (timeMarker === "a" && h === 12) periodAdjustedHour = 0;
        date.setHours(periodAdjustedHour, m, s, 0);
        startTimeDateStr = date.toString();
      }
      const jiraDateString = formatToJiraApiDateString(startTimeDateStr);
      const resolved = checkFetchResult(
        await api.addWorklog(issueKey, comment, jiraDateString, timeSpent)
      );
      if (resolved) {
        Output.success(`${comment} log added!`);
      }
    }
    process.exit(0);
  });

program
  .command("stop")
  .argument("[comment]")
  .argument("[issueKey]")
  .description("Stops the timer")
  .action(async (comment, issueKey = getJiraIssueKey()) => {
    if (!comment && commentsRequired) {
      const rl = readline.createInterface({ input, output });
      rl.question("Comment: ", (comment) => {
        db.saveToApi(issueKey, comment);
        rl.close();
      });
    }
    await db.saveToApi(issueKey, comment);
  });

program
  .command("find")
  .alias("get")
  .alias("view")
  .argument("[issueKey]")
  .argument("[fields...]")
  .description("Finds that Jira issue with the key")
  .action(getIssue);

const worklog = program.command("worklog").alias("wl");
worklog
  .command("list")
  .argument("[maxLen]", "Maximum number of worklogs you want to see")
  .action(listWorkLogs);
worklog
  .command("del")
  .argument("[worklogId]", "Id of the worklog you want to delete")
  .action(deleteWorkLog);

const comment = program.command("comment").alias("cm");
comment
  .command("add")
  .argument("<issueKey>")
  .argument("[mention]")
  .argument("<comment>")
  .action(addComment);
comment.command("list").argument("[maxLen]").action(listComments);
comment
  .command("del")
  .argument(
    "[commentId]",
    "If no id is provided, lastly added comment will be removed"
  )
  .action(deleteComment);

const issue = program.command("issue").alias("is");
issue
  .command("list")
  .addArgument(
    new Argument(
      "[status]",
      "The status category for which you want to list Jira issues"
    ).choices(Object.keys(Status))
  )
  .action(listIssues);
issue
  .command("move")
  .alias("mv")
  .addArgument(
    new Argument(
      "[status]",
      "The status category for which you want to list Jira issues"
    ).choices(Object.keys(Status))
  )
  .argument("[issueKey]")
  .action(updateIssueStatus);

program.parse(process.argv);
