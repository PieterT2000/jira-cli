#!/usr/local/bin/node
import { config } from "dotenv";
import { Command } from "commander/esm.mjs";
import * as readline from "node:readline";
import { stdin as input, stdout as output } from "node:process";
import { convert } from "html-to-text";
import db from "../lib/db.js";
import JiraClient from "../lib/jira-client/lib/index.js";
import path from "path";
import { getDirname } from "../lib/utils.js";
import Output from "./../lib/console-output.js";

const __dirname = getDirname(import.meta.url);
config({ path: path.join(__dirname, "..", ".env") });

const jiraConfig = {
  endpoint: process.env.JIRA_END_POINT,
  username: process.env.JIRA_USERNAME,
  apikey: process.env.JIRA_API_KEY,
};
const jc = new JiraClient(jiraConfig);

const rl = readline.createInterface({ input, output });

const program = new Command();

const commentsRequired = false;

program
  .command("start")
  .description("Starts the timer")
  .action(() => {
    db.saveStartTime();
    rl.close();
  });
program
  .command("stop")
  .argument("[comment]")
  .description("Stops the timer")
  .action(async (comment) => {
    if (!comment && commentsRequired) {
      rl.question("Comment: ", (comment) => {
        // Push to api and delete record
        db.saveToApi(jc, comment);
        rl.close();
      });
    }
    await db.saveToApi(jc, comment);
    process.exit(0);
  });

program
  .command("find")
  .argument("<issueKey>")
  .argument("[fields...]")
  .description("Finds that Jira issue with the key")
  .action(async (issueKey, fields) => {
    const result = await jc.findIssue(issueKey, fields);
    if (result.errorMessages) {
      result.errorMessages.map((e) => Output.error(e));
    } else {
      const htmlDescription = result.issues[0].renderedFields.description;
      const plainTextDescription = convert(htmlDescription, { wordwrap: 80 });
      console.log(plainTextDescription);
    }
    process.exit(0);
  });
program.parse(process.argv);
