---
name: refine-github-issue
description: Refine a rough GitHub issue into an actionable engineering ticket with user story, functional acceptance criteria, non-functional acceptance criteria, and a posted issue comment.
---

# Refine GitHub Issue

Use this skill when you receive a GitHub issue that is incomplete, vague, or not implementation-ready.

The skill supports feature requests, tasks, bugs, and other technical improvements.

## Goal

Transform a rough issue into a clear, buildable ticket and post the refined version as a comment on the issue.

## Required Inputs

- GitHub repository (`owner/repo`)
- Issue number or URL
- Original issue title/body
- Access to the local codebase (for discovery)
- Permission/authentication to comment on the issue (for final step)

## Process

Follow these steps in order.

### 1) Understand the issue and inspect the codebase

- Classify issue type: `feature`, `bug`, `task`, `tech-debt`, or `investigation`.
- Restate the issue in one sentence to confirm understanding.
- Search for relevant code paths, modules, APIs, UI screens, event handlers, and data models.
- Identify existing behavior and nearby patterns already used in the codebase.
- Capture concrete references (file paths, symbols, services, tables, endpoints).

Minimum output from this step:

- `What exists today`
- `Where it likely changes`
- `Known constraints`

### 2) Ask clarifying questions

Before continuing with the refinement, use the `question` tool to ask clarifying questions.

- Ask only high-value questions that unblock implementation.
- Prefer grouped questions by topic (product, UX, data, security, rollout, testing).
- Highlight vague phrases from the issue and ask for explicit decisions.
- If the issue is a bug, ask for reproduction details, expected behavior, and environment.

Question quality rules:

- No yes/no-only questions when nuance is needed.
- No duplicate questions.
- If there are too many unknowns, ask for priority order.

### 3) Assess and improve the proposed direction

- Check if the request is coherent and technically feasible with the current architecture.
- Suggest better/common alternatives if they reduce risk or complexity.
- Identify missing scope boundaries and out-of-scope items.
- Add dependencies, migration implications, permissions, observability, and rollback considerations when relevant.
- Call out risks and assumptions explicitly.
- Suggest splitting into multiple tickets if the scope is too large or contains distinct phases.

Assessment checklist:

- Problem is clear
- User impact is clear
- Scope is bounded
- Edge cases considered
- Testing approach defined
- Monitoring/alerts/logging considered (if applicable)
- Security/privacy/performance considerations included (if applicable)

### 4) Produce refined ticket(s) and post as issue comment

Prepare a refined ticket body using the template below, then add it as a comment on the GitHub issue.

If refinement leads to multiple tickets, update the current one to a parent issue with a clear summary and description, then create child issues for each sub-ticket and link them in the parent.

If posting is not possible due to missing auth/tooling, return the exact comment body and a one-line command the user can run.

## Refined Ticket Template

Use this format and adapt sections to issue type.

```md
## Refined Ticket

### Summary

<1-3 sentence summary of the problem and desired outcome>

### User Story

As a <type of user>,
I want <goal>,
so that <value/outcome>.

### Context

- Current behavior: <what happens today>
- Expected behavior: <what should happen>
- Notes from codebase: <relevant findings>

### Scope

- In scope:
	- <item>
- Out of scope:
	- <item>

### Acceptance Criteria (Functional)

- [ ] <observable behavior 1>
- [ ] <observable behavior 2>
- [ ] <error/edge case behavior>

### Acceptance Criteria (Non-Functional)

- [ ] Performance: <latency/throughput target or no regression statement>
- [ ] Security/Privacy: <constraints>
- [ ] Reliability: <retry/failure behavior>
- [ ] Observability: <logs/metrics/traces/alerts>
- [ ] Accessibility (if UI): <a11y expectations>

### Technical Notes

- Likely areas to change: <files/modules/services>
- Dependencies: <internal/external dependencies>
- Data/migration impact: <yes/no + details>

### Risks and Mitigations

- Risk: <risk>
	- Mitigation: <mitigation>
```

## Communication with GitHub

Preferred method: GitHub CLI

Examples:

```sh
# View issue details (incl. comments):
gh issue view <issue-number> --repo <owner/repo> --json title,body,labels,number,url,comments

# Post comment:
gh issue comment <issue-number> --repo <owner/repo> --body-file <refined-ticket.md>
```

Fallback:

- Provide the full markdown comment body for manual paste.

## Output Contract

When using this skill, always return:

1. `Understanding Summary` (short)
2. `Clarifying Questions` (if needed)
3. `Assessment` (feasibility, alternatives, risks)
4. `Refined Ticket` (template completed)
5. `Comment Status` (`posted` or `ready-to-post` + command)

## Quality Bar

- Do not invent codebase facts.
- Keep acceptance criteria testable and observable.
- Keep scope tight enough for one implementation cycle.
- Prefer explicit assumptions over implicit guesswork.
- Don't include code snippets.

## The issue in question:
