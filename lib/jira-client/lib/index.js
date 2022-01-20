import fetch, { Headers } from "node-fetch";

class JiraClient {
  constructor(props) {
    this.endpointBase = props.endpoint;
    this.endpoint = `${props.endpoint}/rest/api/3`;
    this.apikey = props.apikey;
    this.username = props.username;
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

  makeRequest = async (path, body = null, customMethod) => {
    let method = "GET";
    if (body) method = "POST";
    else if (customMethod) method = customMethod;

    let data;
    try {
      const res = await fetch(`${this.endpoint}${path}`, {
        method,
        headers: this.getHeaders(),
        body: JSON.stringify(body),
      });

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

  getWorklogs = async () => {
    const json = await this.makeRequest("/issue/STREET-4105/worklog");
    return json;
  };

  /**
   * Converts simple comment to Atlassian Document Format object understood by Jira rest api
   * @param {string} comment
   * @returns {object} ADF object
   */
  convertCommentToADF = (comment) => {
    if (!comment) return null;

    const schema = {
      type: "doc",
      version: 1,
      content: [
        {
          type: "paragraph",
          content: [
            {
              text: comment,
              type: "text",
            },
          ],
        },
      ],
    };
    return schema;
  };

  addWorklog = async (issueKey, comment, started, timeSpent) => {
    const body = {
      comment: this.convertCommentToADF(comment),
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
}

export default JiraClient;
