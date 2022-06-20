## Jira Automation

### Commands

##### Worklogs (i.e. timetracking)

_To start the timer_. If no `ISSUE_KEY`is provided and you're currently in a git branch, the name of that branch will be used as issue key. Otherwise an error will be thrown.

```node
jira start [ISSUE_KEY]
```

_To stop the timer and save the worklog._

```node
jira stop [COMMENT] [ISSUE_KEY]
```
