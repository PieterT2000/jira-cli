## Jira CLI

- [Commands](#commands)
  - [Worklogs (i.e. timetracking)](#worklogs--ie-timetracking-)
  - [List issues](#list-issues)
  - [Lookup issue information](#lookup-issue-information)
  - [Adding comments](#adding-comments)
  - [Help](#help)

### Commands

##### Worklogs (i.e. timetracking)

_To start the timer_. If no `ISSUE_KEY`is provided and you're currently in a git branch, the name of that branch will be used as issue key. Otherwise an error will be thrown. This is what issue keys look like ![](/assets//images//issueKeys.png)

```node
jira start [ISSUE_KEY]
```

_To stop the timer and save the worklog._ If you don't provide the `issueKey`, your current git branch name will be used. (very handy if git branches are linked to Jira issues). Otherwise, an error will be thrown.

```node
jira stop [COMMENT] [ISSUE_KEY]
```

_Logging recurring activities_.

```node
jira log ACTIVITY
```

You can define _recurring activities_ in the `cli-config.js` file. For example:

```js
export default {
  standup: {
    issueKey: "PROJECTNAME-XXXX",
    comment: "Standup",
    timeSpent: 900,
    startTime: "08:30",
  },
};
```

Note that `timeSpent` must be in _seconds_. `startTime` can be in _any time format_. (e.g. 12, 3 pm, 15:49, 11:49:34 a.m., etc)
After defining `standup` as a recurring activity, you can run `jira log standup`. Look for more examples in [cli-config.js](./cli-config.js).
**TIP**: use cron-jobs to automate the logging of recurring events.

##### List issues

To get a table displaying the current issues in the sprint, run

```node
jira issue|is list|ls [STATUS_CATEGORY]
```

##### Lookup issue information

To view information about a specific Jira issue

```node
jira info|i [ISSUE_KEY]
```

##### Adding comments

```node
jira comment|cm add ISSUE_KEY COMMENT [MENTION]
```

You can also include a `mention` (first name of person you want to mention). This will add a mention block at the front of your comment in Jira.
**Note**: the `COMMENT` argument must be a quoted string.

##### Help

Whenever stuck or when you trying to find info or aliases for a command, run

```node
jira [COMMAND ...] - h
```
