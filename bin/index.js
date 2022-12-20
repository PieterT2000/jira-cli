#!/usr/bin/env node
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
  getDirname,
  getJiraIssueKey,
  formatIssueKeyInput,
} from "../lib/utils/utils.js";
import Output from "../lib/utils/console-output.js";

import {
  getIssue,
  listIssues,
  updateIssueStatus,
} from "../lib/actionHandlers/issues.js";
import {
  addWorkLog,
  deleteWorkLog,
  listWorkLogs,
} from "../lib/actionHandlers/worklogs.js";
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

/**
 * JiraClient singleton
 * @type {JiraClient | null}
 */
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
  .action(async () => {
    if (config.isValid("jiraConfig", requiredConfigVars)) {
      Output.success("Cheers, you're already successfully set up!");
    } else {
      await setup(requiredConfigVars);
    }
  });
program
  .command("info")
  .aliases(["get", "view", "find", "i"])
  .argument("[issueKey]")
  .argument("[fields...]")
  .description("Finds that Jira issue with the key")
  .action(getIssue);

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
  .action(async (comment, issueKeyInput = getJiraIssueKey()) => {
    const issueKey = formatIssueKeyInput(issueKeyInput);
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
  .command("log")
  .argument("<type|issueKey>")
  .argument("[startTime]")
  .argument("[timeSpent]")
  .argument("[comment]")
  .description(
    "Logs work on the activity specified in cli-config.js or the issueKey in first argument"
  )
  .addHelpText(
    "after",
    `\nArguments info: \n\n <type|issueKey> - Valid types are: ${Object.keys(
      cliConfig
    ).join(", ")}`
  )
  .addHelpText(
    "after",
    " [startTime] - Valid inputs are 10:00, 10.00, 12 43, 3.00 p.m., 10:45am"
  )
  .addHelpText("after", " [timeSpent] - Valid inputs are 2h 15m, 30m, 4h \n")
  .action(addWorkLog);

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
  .alias("ls")
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
