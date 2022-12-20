import { existsSync, readFileSync, writeFileSync, statSync } from "fs";
import path, { dirname } from "path";
import get from "lodash.get";
import set from "lodash.set";
import { getDirname } from "../lib/utils/utils.js";

const __dirname = getDirname(import.meta.url);

const defaultConfig = {
  jiraConfig: {
    endpoint: null,
    username: null,
    apiToken: null,
    boardId: null,
  },
};

class Config {
  constructor(filePath) {
    this.data = null;
    this.filePath = filePath;
    this.init();
  }

  init() {
    // check if file exists, otherwise create
    if (!(existsSync(this.filePath) && statSync(this.filePath))) {
      writeFileSync(this.filePath, JSON.stringify(defaultConfig));
      this.data = defaultConfig;
    } else {
      this.read();
    }
  }

  read() {
    this.data = JSON.parse(readFileSync(this.filePath, "utf-8"));
  }

  save() {
    writeFileSync(this.filePath, JSON.stringify(this.data));
  }

  has(path) {
    if (!this.data) {
      this.read();
    }
    return Boolean(get(this.data, path, null));
  }

  get(path) {
    if (!this.data) {
      this.read();
    }
    return get(this.data, path, null);
  }

  set(path, value) {
    if (!this.data) {
      this.read();
    }
    set(this.data, path, value);
    return config;
  }

  isValid(path, keys) {
    return keys.every((key) => this.has(`${path}.${key}`));
  }
}

const config = new Config(path.join(__dirname, "/config.json"));

export default config;

// https://support.atlassian.com/atlassian-account/docs/manage-api-tokens-for-your-atlassian-account/
