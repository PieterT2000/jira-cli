import chalk from "chalk";
import { convert } from "html-to-text";
import { api } from "../../bin/index.js";
import config from "../../config/config.js";
import { Status } from "../types/types.js";
import Output from "../utils/console-output.js";
import { checkFetchResult } from "../utils/errorHandling.js";
import { formatIssueKeyInput, getJiraIssueKey } from "../utils/utils.js";

const getFirstName = (str) => str && str.split(" ")[0];

// TODO: split up in getting and displaying
export const getIssue = async (issueKeyInput = getJiraIssueKey(), fields) => {
  const issueKey = formatIssueKeyInput(issueKeyInput);
  const result = checkFetchResult(await api.findIssue(issueKey, fields));
  const commentResult = checkFetchResult(await api.getComments(issueKey));
  if (result && commentResult) {
    const issue = result.issues[0];
    const { issuetype, reporter, assignee, status, summary } = issue.fields;

    const htmlDescription = issue.renderedFields.description;
    const plainTextDescription = convert(htmlDescription, { wordwrap: 80 });
    const commentObjectsWithPlainText = commentResult.comments.map(
      (comment) => {
        return {
          text: convert(comment.renderedBody, { wordwrap: 80 }),
          author: comment.author.displayName,
          created: comment.created,
        };
      }
    );

    /* 
    ------------
      TEMPLATE
    ------------
      1. [{issuetype.name}] {summary}
      2. Reported: {reporter.displayName}
      3. Assigned: {assignee.displayName}
      4. Status: {status.name}
      5. Description: {plainTextDescription}
      6. Comments: {commentObjectsWithPlainText.map(c => c.text)}
      */

    const { italic, bold, whiteBright: white } = chalk;
    const bgPrimary = chalk.bgRgb(0, 82, 204);
    const primary = chalk.rgb(0, 82, 204);
    const grey = chalk.rgb(175, 175, 175);
    const divider = "=====================================================";

    const msg = [
      `\n${primary(divider)}`,
      `[${String(issuetype.name).toUpperCase()}] ${bold(white(summary))}`,
      `${primary(divider)}\n`,
      ` 📝 ${grey("(reporter)")}: ${italic(reporter.displayName)}`,
      ` 🧑‍💻 ${grey("(assignee)")}: ${bold(assignee && assignee.displayName)}`,
      ` 🚧 ${grey("(status)")}: ${status.name.toUpperCase()}`,
      `\n${bgPrimary(`------- ${white("Description")} -------`)}\n`,
      plainTextDescription,
      commentObjectsWithPlainText.length &&
        `\n${bgPrimary(`------- ${white("Comments")} -------`)}\n`,
      ...commentObjectsWithPlainText.map(
        (comment) =>
          `[${bold(grey(comment.author))}] --- ${white(
            italic(new Date(Date.parse(comment.created)).toLocaleString())
          )}
          \n${comment.text}\n`
      ),
    ];
    msg.filter(Boolean).forEach((line) => console.log(line));
  }
};

export const listIssues = async (status) => {
  const json = checkFetchResult(
    await api.getActiveSprint(config.get("jiraConfig.boardId"))
  );
  const activeSprintId = json.values.length && json.values[0].id;

  let statusString = Status[status];
  if (!statusString) {
    statusString = Status.TODO;
  }

  let jqlFilter;
  if (statusString === Status.TODO) {
    jqlFilter = `jql=status=\'${statusString}\' OR status=\'${Status.DEV_READY}\'`;
  } else {
    jqlFilter = `jql=status=\'${statusString}\'`;
  }

  const issuesResult = checkFetchResult(
    await api.getIssuesForSprint(activeSprintId, jqlFilter)
  );

  let issues = [];
  if (issuesResult) {
    issues = issuesResult.issues.map(({ key, fields }) => ({
      issueKey: key,
      assignee: getFirstName(fields.assignee && fields.assignee.displayName),
      reporter: getFirstName(fields.reporter.displayName),
      type: fields.issuetype.name.toUpperCase(),
      summary: fields.summary,
    }));
  }
  const sortedIssues = issues.sort((a, b) => {
    const assigneeA = a.assignee;
    const assigneeB = b.assignee;
    if (assigneeA === null || assigneeA < assigneeB) {
      return -1;
    } else if (assigneeA > assigneeB) {
      return 1;
    }

    return 0;
  });
  Output.info(`Issues in ${statusString}`);
  console.table(sortedIssues);
};

export const updateIssueStatus = async (
  newStatus,
  issueKeyInput = getJiraIssueKey()
) => {
  const issueKey = formatIssueKeyInput(issueKeyInput);
  const json = checkFetchResult(await api.getTransitionsForIssue(issueKey));
  const statusString = Status[newStatus];
  const transition = json.transitions.find(
    (item) => item.name === statusString
  );
  if (transition) {
    const resolved = checkFetchResult(
      await api.setTransitionForIssue(issueKey, transition.id)
    );
    if (resolved) {
      if (statusString === Status.PROGRESS) {
        const { accountId } = await api.getCurrentUser();
        checkFetchResult(await api.assignIssue(issueKey, accountId));
      }
      Output.success(`You moved issue ${issueKey} to ${statusString}`);
    }
  }
};

export default {
  getIssue,
  listIssues,
};
