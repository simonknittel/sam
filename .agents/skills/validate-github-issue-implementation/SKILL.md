---
name: validate-github-issue-implementation
description: Validates the correct implementation of a GitHub issue
---

# Validate GitHub issue implementation

Use this skill to validate the implementation of a GitHub issue. The validation includes these checks: the implementation satisfies the acceptance criteria, the code obeys the coding guidelines of this project, and the implementation is complete and correct.

## Process

### 1) Retrieve the GitHub issue details

### 2) Review the implementation against the issue details and acceptance criteria

The implementation is in the currently staged or unstaged changes of the local git repository.

### 3) Review the implementation against the coding guidelines of this project

The coding guidelines are in `docs/coding-guidelines.md`.

## Communication with GitHub

MUST use method: GitHub CLI

Examples:

```sh
# Show the details of an issue together with its comments:
gh issue view <issue-number> --repo <owner/repo> --json title,body,labels,number,url,comments

# Post a comment:
gh issue comment <issue-number> --repo <owner/repo> --body-file <refined-ticket.md>
```

If `gh` is not available or returns an authentication error, stop and tell the user. Do not fall back to a different method.

## The GitHub issue in question:
