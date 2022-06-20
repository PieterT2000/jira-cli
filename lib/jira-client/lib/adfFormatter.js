/**
 * Formats to Atlassian Document Format object understood by Jira rest api
 */
export default class Document {
  constructor() {
    this.doc = {
      type: "doc",
      version: 1,
      content: [],
    };
  }

  /**
   * Add paragraph to `this.doc`
   * @param {string} text
   * @returns {array} reference to paragraph node so childs can be appended
   */
  paragraph = (text) => {
    const node = {
      type: "paragraph",
      content: [
        {
          text,
          type: "text",
        },
      ],
    };
    this.doc.content.push(node);
    return node;
  };

  /**
   * Adds mention Inner Node to parent node
   * @param {object} parentNode
   * @param {string} accountId
   * @param {boolean} [insertBefore] `true` by default
   */
  mention = (parentNode, accountId, insertBefore = true) => {
    const childNode = {
      type: "mention",
      attrs: {
        id: accountId,
      },
    };
    if (insertBefore) {
      parentNode.content = [childNode, ...parentNode.content];
    } else {
      parentNode.content.push(childNode);
    }
  };

  getDoc = () => this.doc;
}
