import { fileURLToPath } from "url";
import { dirname } from "path";

export const getDirname = (filePath) => {
  const __filename = fileURLToPath(filePath);
  return dirname(__filename);
};

/**
 * Formats a dateObject to a date string in the format of "yyyy-MM-dd'T'HH:mm:ss.SSSZ"
 * @param {Date} dateObject
 */
export const formatToJiraApiDateString = (dateObject) => {
  const utcString = new Date(
    dateObject.toString().split("GMT")[0] + " UTC"
  ).toISOString();
  // const utcString = dateObject.toISOString();
  return utcString.replace("Z", "+0000");
};
