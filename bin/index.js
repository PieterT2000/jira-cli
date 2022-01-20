#!/usr/local/bin/node
import { config } from "dotenv";
import { Argument, Command } from "commander/esm.mjs";
import * as readline from "node:readline";
import { stdin as input, stdout as output } from "node:process";
import db from "../lib/db.js";
import JiraClient from "../lib/jira-client/lib/index.js";
import path from "path";
import { formatToJiraApiDateString, getDirname } from "../lib/utils/utils.js";
import Output from "../lib/utils/console-output.js";
import cliConfig from "../cli-config.js";
import { checkFetchResult } from "../lib/utils/errorHandling.js";
import getIssue from "../lib/actionHandlers/getIssue.js";
import { deleteWorkLog, listWorkLogs } from "../lib/actionHandlers/worklogs.js";

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
      const { issueKey, comment, timeSpent } = cliConfig[type];
      const started = formatToJiraApiDateString(new Date());
      const resolved = checkFetchResult(
        await api.addWorklog(issueKey, comment, started, timeSpent)
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
  .description("Stops the timer")
  .action(async (comment) => {
    if (!comment && commentsRequired) {
      const rl = readline.createInterface({ input, output });
      rl.question("Comment: ", (comment) => {
        db.saveToApi(comment);
        rl.close();
      });
    }
    await db.saveToApi(comment);
  });

program
  .command("find")
  .argument("<issueKey>")
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

program.parse(process.argv);
