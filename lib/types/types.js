/**
 * @typedef {Object} worklog
 * @property {string} id
 * @property {string} issueId
 * @property {string} timeSpent
 * @property {string} comment
 * @property {string} started
 */

/**
 * @typedef {Object} comment
 * @property {string} id
 * @property {string} issueKey
 * @property {string} created
 * @property {string} comment
 */

/**
 * Status Defines possible values of Jira Issue statuses
 * @enum {string}
 */
export const Status = {
  DEV_READY: "Ready for development",
  TODO: "To Do",
  PROGRESS: "In Progress",
  REVIEW: "Review",
  DONE: "Done",
  CLOSED: "Closed",
  WAIT: "Wait",
};
