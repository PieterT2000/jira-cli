import { convert } from "html-to-text";
import { api } from "../../bin/index.js";
import Output from "../utils/console-output.js";

// TODO: split up in getting and displaying
const getIssue = async (issueKey, fields) => {
  const result = await api.findIssue(issueKey, fields);
  if (result.errorMessages) {
    result.errorMessages.map((e) => Output.error(e));
  } else {
    const htmlDescription = result.issues[0].renderedFields.description;
    const plainTextDescription = convert(htmlDescription, { wordwrap: 80 });
    console.log(plainTextDescription);
  }
};

export default getIssue;
