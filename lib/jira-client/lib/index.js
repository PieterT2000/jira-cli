import fetch, { Headers } from "node-fetch";
import ADFDoc from "./adfFormatter.js";

class JiraClient {
  constructor(props) {
    this.endpointBase = props.endpoint;
    this.endpoint = `${props.endpoint}/rest/api/3`;
    this.agileEndpoint = `${props.endpoint}/rest/agile/1.0`;
    this.apikey = props.apikey;
    this.username = props.username;
    this.adfDoc = new ADFDoc();
  }

  getAuthHeaders = () => {
    return {
      Authorization: `Basic ${Buffer.from(
        `${this.username}:${this.apikey}`
      ).toString("base64")}`,
    };
  };

  getHeaders(method) {
    let headers = {
      ...this.getAuthHeaders(),
    };
    if (method === "GET") {
      headers = {
        ...headers,
        Accept: "application/json",
      };
    } else {
      headers = {
        ...headers,
        "Content-Type": "application/json",
      };
    }
    return new Headers(headers);
  }

  /**
   * Makes a request to the JIRA rest api and returns result if present
   * @param {string} path
   * @param {Object} body please don't `JSON.stringify()`!
   * @param {string} customMethod in case of PUT/DELETE
   * @param {string} endpoint
   * @returns
   */
  makeRequest = async (
    path,
    body = null,
    customMethod,
    endpoint = this.endpoint
  ) => {
    let method = "GET";
    if (body && !customMethod) method = "POST";
    else if (customMethod) method = customMethod;

    let data;
    try {
      const res = await fetch(`${endpoint}${path}`, {
        method,
        headers: this.getHeaders(),
        body: body !== null ? JSON.stringify(body) : null,
      });
      // console.log(res.status, " ", res.url);
      if (res.status === 204) data = {};
      else {
        data = await res.json();
      }
    } catch (error) {
      console.error(error);
    }
    return data;
  };

  findIssue = async (issueKey, fields = ["id", "key", "description"]) => {
    const jqlObject = {
      jql: `key = ${issueKey}`,
      fields,
      expand: ["renderedFields"],
    };
    const json = await this.makeRequest("/search", jqlObject);
    return json;
  };

  getComments = (issueKey) => {
    return this.makeRequest(
      `/issue/${issueKey}/comment?expand=renderedBody&orderBy=-created`
    );
  };

  addComent = (issueKey, commentBody) => {
    const body = {
      body: commentBody,
    };
    return this.makeRequest(`/issue/${issueKey}/comment`, body);
  };

  deleteComment = (issueKey, commentId) => {
    return this.makeRequest(
      `/issue/${issueKey}/comment/${commentId}`,
      null,
      "DELETE"
    );
  };

  findUser = (name) => {
    return this.makeRequest(`/user/search?query=${name}`);
  };

  getWorklogs = async () => {
    const json = await this.makeRequest("/issue/STREET-4105/worklog");
    return json;
  };

  addWorklog = async (issueKey, comment, started, timeSpent) => {
    this.adfDoc.paragraph(comment);

    const body = {
      comment: this.adfDoc.getDoc(),
      started: started,
      timeSpentSeconds: timeSpent,
    };
    const json = await this.makeRequest(`/issue/${issueKey}/worklog`, body);
    return json;
  };

  deleteWorklog = async (issueId, worklogId) => {
    return this.makeRequest(
      `/issue/${issueId}/worklog/${worklogId}`,
      null,
      "DELETE"
    );
  };

  /**
   * Returns the active sprint information in the passed board
   * @param {number} boardId
   * @returns
   */
  getActiveSprint = async (boardId) => {
    return this.makeRequest(
      `/board/${boardId}/sprint?state=active`,
      null,
      null,
      this.agileEndpoint
    );
  };

  getIssuesForSprint = async (sprintId, jqlFilter) => {
    return this.makeRequest(
      `/sprint/${sprintId}/issue?fields=summary,assignee,reporter,issuetype&${jqlFilter}`,
      null,
      null,
      this.agileEndpoint
    );
  };

  getTransitionsForIssue = async (issueKey) => {
    return this.makeRequest(`/issue/${issueKey}/transitions`);
  };

  /**
   * Sets the status of the issue by updating the transition property
   * @param {string} issueKey
   * @param {number} transitionId
   */
  setTransitionForIssue = async (issueKey, transitionId) => {
    const body = {
      transition: {
        id: transitionId,
      },
    };
    return this.makeRequest(`/issue/${issueKey}/transitions`, body);
  };

  assignIssue = async (issueKey, accountId) => {
    const body = {
      accountId,
    };
    return this.makeRequest(`/issue/${issueKey}/assignee`, body, "PUT");
  };

  getCurrentUser = () => {
    return this.makeRequest(`/myself`);
  };
}

export default JiraClient;
