import Output from "./console-output.js";

/**
 * Checks the json response of the JIRA rest api for errors and displays them if needed
 * @param {Promise} result
 * @returns {Boolean | Object} false if error, otherwise result from argument is returned
 */
export const checkFetchResult = (result) => {
  let error = false;
  if (result.errorMessages && result.errorMessages.length) {
    result.errorMessages.map(Output.error);
    error = true;
  } else if (result.errors) {
    Object.entries(result.errors).map(([key, value]) =>
      Output.error(`${key}: ${value}`)
    );
    error = true;
  }
  if (error) return false;
  else return result;
};

export default {
  checkFetchResult,
};
