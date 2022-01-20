/**
 * Compiles `worklog` object from api result
 * @param {Object} apiResult
 * @returns {worklog} worklog
 */
export const formatResultAsWorklogEntry = (apiResult, comment) => ({
  id: apiResult.id,
  issueId: apiResult.issueId,
  comment,
  timeSpent: apiResult.timeSpent,
  started: apiResult.started,
});

export default {
  formatResultAsWorklogEntry,
};
