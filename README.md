### Recipe

1. The user initiates process with `start` command. If matching Jira ticket can be found for branch name, then start the timer process.
2. Get current time save with jira ticket, branch name to file database.
3. When the process exits, an other branch is checked out, or the stop command is issued, calculate difference between saved start time and current time. Prompt user for comment and save to Jira ticket.

### Ingredients

- jira api endpoint for timewriting/list of stories
- axios
- simple file database
- commander
