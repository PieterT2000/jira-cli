import { fileURLToPath } from "url";
import { dirname } from "path";
import { execSync } from "child_process";
import Output from "./console-output.js";

export const getDirname = (filePath) => {
  const __filename = fileURLToPath(filePath);
  return dirname(__filename);
};

/**
 * Formats a dateObject to a date string in the format of "yyyy-MM-dd'T'HH:mm:ss.SSSZ"
 * @param {string} dateObject
 */
export const formatToJiraApiDateString = (dateString) => {
  const utcString = new Date(dateString).toISOString();
  return utcString.replace("Z", "+0000");
};

/**
 * Gets the jira issue key from branch name (note convention in order for this to work)
 * @returns {string}
 */
export const getJiraIssueKey = () => {
  try {
    return execSync("git rev-parse --abbrev-ref HEAD")
      .toString("utf8")
      .replace(/[\n\r\s]+$/, "");
  } catch (error) {
    Output.error("You're not in a git repo");
  }
};
