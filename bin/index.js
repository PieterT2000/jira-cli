#!/usr/local/bin/node
import { config as dotenv } from "dotenv";
const __dirname = getDirname(import.meta.url);
dotenv({ path: path.join(__dirname, "..", ".env") });
import config from "./../config/config.js";

import { Argument, Command } from "commander/esm.mjs";
import inquirer from "inquirer";
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

const requiredConfigVars = ["endpoint", "username", "apiToken", "boardId"];

async function getJiraClient() {
  const missingConfigVars = [];
  requiredConfigVars.forEach((configVar) => {
    if (!config.has(`jiraConfig.${configVar}`)) {
      missingConfigVars.push(configVar);
    }
  });

  if (missingConfigVars.length) {
    await setup(missingConfigVars);
  }
  const jiraConfig = config.get("jiraConfig");
  return new JiraClient(jiraConfig);
}

async function setup(configVars) {
  const questions = {
    endpoint: {
      type: "input",
      name: "endpoint",
      message: "Endpoint: ",
    },
    username: {
      type: "input",
      name: "username",
      message: "Username (email): ",
    },
    apiToken: { type: "input", name: "apiToken", message: "API key: " },
    boardId: {
      type: "input",
      name: "boardId",
      message: "Board ID: ",
      validate: (input) => {
        if (isNaN(input)) {
          return "BoardId should be a number";
        }
        return true;
      },
    },
  };

  const answers = await inquirer.prompt(
    Object.values(questions).filter((q) => configVars.includes(q.name))
  );
  Object.entries(answers).forEach(([key, val]) => {
    // ... store in config
    config.set(`jiraConfig.${key}`, val);
  });
  config.save();
  Output.success("You're successfully set up!");
}

const argsLen = process.argv.length;
const isHelpOrSetupCommand =
  argsLen === 2 ||
  ["-h", "--help", "setup"].includes(process.argv[argsLen - 1]);

let api = null;
if (!isHelpOrSetupCommand) {
  api = await getJiraClient();
}

const commentsRequired = true;
const program = new Command();
program
  .command("setup")
  .alias("init")
  .description("run this first before you use the program")
  .action(() => {
    if (!config.isValid("jiraConfig", requiredConfigVars)) {
      setup(requiredConfigVars);
    } else {
      Output.success("Cheers, you're already successfully set up!");
    }
  });

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
  .command("start")
  .argument("[issueKey]")
  .description("Starts the timer")
  .action(db.saveStartTime);
program
  .command("stop")
  .argument("[comment]")
  .argument("[issueKey]")
  .description("Stops the timer")
  .action(async (comment, issueKey = getJiraIssueKey()) => {
    if (!comment && commentsRequired) {
      const questionKey = "comment";
      inquirer
        .prompt([{ type: "input", name: questionKey }])
        .then((answers) => {
          db.saveToApi(issueKey, answers[questionKey]);
        });
    } else {
      await db.saveToApi(issueKey, comment);
    }
  });

program
  .command("info")
  .aliases(["get", "view", "find", "i"])
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
  .argument("<comment>")
  .argument("[mention]")
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

export { api };
