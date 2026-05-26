---
name: validate-github-issue-implementation
description: Validates the correct implementation of a GitHub issue
---

# Validate GitHub issue implementation

Use this skill to validate the implementation of a GitHub issue. This includes checking if the implementation meets the acceptance criteria, if the code follows this project's coding guidelines, and if the implementation is complete and correct.

## Process

### 1) Retrieve the GitHub issue details

### 2) Review the implementation against the issue details and acceptance criteria

Update the issue description and tick off acceptance criteria items as you validate them.

### 3) Review the implementation against this project's coding guidelines

The coding guidelines can be found in [docs/coding-guidelines.md](../../../docs/coding-guidelines.md).

## Communication with GitHub

Preferred method: GitHub CLI

Examples:

```sh
# View issue details (incl. comments):
gh issue view <issue-number> --repo <owner/repo> --json title,body,labels,number,url,comments

# Post comment:
gh issue comment <issue-number> --repo <owner/repo> --body-file <refined-ticket.md>
```

## The GitHub issue in question:
