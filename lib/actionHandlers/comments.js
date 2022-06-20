import { api } from "../../bin/index.js";
import db from "../db.js";
import ADFDoc from "../jira-client/lib/adfFormatter.js";
import Output from "../utils/console-output.js";
import { checkFetchResult } from "../utils/errorHandling.js";
import { getJiraIssueKey } from "../utils/utils.js";

/**
 * Adds a comment to an issue
 * @param {string} mention who should be mentioned in front of the comment
 * @param {string} comment
 */
export const addComment = async (
  issueKey = getJiraIssueKey(),
  mention,
  comment
) => {
  if (!issueKey || !comment) return;

  const doc = new ADFDoc();
  const paragraphNode = doc.paragraph(comment);
  if (mention) {
    const resolved = checkFetchResult(await api.findUser(mention));
    if (resolved) {
      // Account id of the user that needs to be mentioned
      const { accountId } = resolved[0];
      doc.mention(paragraphNode, accountId);
    }
  }

  const resolvedComment = checkFetchResult(
    await api.addComent(issueKey, doc.getDoc())
  );
  if (resolvedComment) {
    db.addComment({
      id: resolvedComment.id,
      created: resolvedComment.created,
      issueKey,
      comment,
    });
    Output.success(`Comment successfully added to ${issueKey}`);
  }
};

export const listComments = async (maxLen = 10) => {
  const items = await db.getComments(maxLen);
  Output.info("Comment List");
  console.table(items);
};

export const deleteComment = async (id) => {
  let issueKey;
  if (!id) {
    ({ id, issueKey } = db.getLatestComment());
  } else {
    ({ issueKey } = db.getCommentById(id));
  }

  if (!id) {
    return Output.error("No comments added yet!");
  } else if (!issueKey) {
    return Output.error(`Comment with id ${id} not found in db`);
  }

  const resolved = checkFetchResult(await api.deleteComment(issueKey, id));
  if (resolved) {
    db.deleteComment(id);
    Output.success(`Successfully deleted comment with id ${id}`);
  }
};

export default {
  addComment,
  listComments,
  deleteComment,
};
