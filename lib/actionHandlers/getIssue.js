import chalk from "chalk";
import { convert } from "html-to-text";
import { api } from "../../bin/index.js";
import { checkFetchResult } from "../utils/errorHandling.js";

// TODO: split up in getting and displaying
const getIssue = async (issueKey, fields) => {
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
    const msg = [
      `\n--------------------------------------------`,
      `[${String(issuetype.name).toUpperCase()}] ${white(summary)}`,
      `--------------------------------------------\n`,
      `📝 (reporter): ${italic(reporter.displayName)}`,
      `🧑‍💻 (asignee): ${bold(assignee.displayName)}`,
      `🚧 (status): ${status.name.toUpperCase()}`,
      `\n ------- ${white("Description")} -------\n`,
      plainTextDescription,
      `\n ------- ${white("Comments")} -------\n`,
      ...commentObjectsWithPlainText.map(
        (comment) =>
          `[${bold(white(comment.author))}] --- ${italic(
            new Date(Date.parse(comment.created)).toLocaleString()
          )}
          \n${comment.text}\n`
      ),
    ];
    msg.forEach((line) => console.log(line));
  }
};

export default getIssue;
