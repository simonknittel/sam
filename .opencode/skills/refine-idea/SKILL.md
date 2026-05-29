---
name: refine-idea
description: Refine a rough idea into actionable engineering ticket(s) with user story, functional acceptance criteria, non-functional acceptance criteria.
---

# Refine idea

Use this skill when you receive an idea that is incomplete, vague, or not implementation-ready.

The skill supports feature requests, tasks, bugs, and other technical improvements.

## Goal

Transform a rough idea into a clear, buildable ticket(s) and create GitHub issues for them.

## Inputs

The idea will be given in the form of either an existing GitHub issue or a free-form description.

## Process

Follow these steps in order.

### 1) Understand the idea and inspect the codebase

- Classify idea type: `feature`, `bug`, `task` or `investigation`.
- Restate the idea in one sentence to confirm understanding.
- Search for relevant code paths, modules, APIs, UI screens, event handlers, and data models.
- Identify existing behavior and nearby patterns already used in the codebase.
- Capture concrete references (file paths, symbols, services, tables, endpoints).

Minimum output from this step:

- `What exists today`
- `Where it likely changes`
- `Known constraints`

### 2) Interview me

Before continuing with the refinement, use the `question`/`vscode_askQuestions` tool to ask clarifying questions. Do a thorough interview with me to extract all necessary details before moving on to the next step. Multiple rounds of questioning may be needed.

- Ask only high-value questions that unblock implementation.
- Prefer grouped questions by topic (product, UX, data, security, rollout, testing).
- Highlight vague phrases from the issue and ask for explicit decisions.
- Ask for clarification on terms and wording that could be interpreted in multiple ways.
- If the issue is a bug, ask for reproduction details, expected behavior, and environment.
- Ask one question at a time. Bad example: "Should we do X or Y? Also, do we need to consider Z?"

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

Assessment checklist:

- Problem is clear
- User impact is clear
- Scope is bounded
- Edge cases considered
- Testing approach defined
- Monitoring/alerts/logging considered (if applicable)
- Security/privacy/performance considerations included (if applicable)

### 4) Produce refined GitHub issues

Split the idea into one or more actionable GitHub issues (common splits: backend vs frontend). Add the label "AI-candidate" to each new issue. Each new issue should link to each other. Add an implementation order if applicable. Also, they should link to the original parent idea/issue if applicable. The links should be added to the "Context" section of the ticket template (see below). You can update the issue description later on if you don't have created the other issues yet.

Add a comment to the original issue with links to the new refined issue(s) and close it afterwards.

For each ticket, prepare a refined ticket body using the template below.

## Refined ticket template

Use this format and adapt sections to issue type.

```md
## Goal

<Describe in one concise sentence what you want to achieve with the task or the improvement. Make sure not to describe a solution already but the outcome.>

## Problem

<Share the context and describe the problem in more detail.>

## Solution

<This section can outline a proposal.>

## Context

- Notes from codebase: <relevant findings>
- Parent issue: <link to original issue if applicable>
- Links to related issues incl. implementation order: <links to other new issues created from the same idea>

## Scope

- In scope:
	- <item>
- Out of scope:
	- <item>

## Acceptance Criteria (Functional)

- [ ] <observable behavior 1>
- [ ] <observable behavior 2>
- [ ] <error/edge case behavior>

## Acceptance Criteria (Non-Functional)

- [ ] Performance: <latency/throughput target or no regression statement>
- [ ] Security/Privacy: <constraints>
- [ ] Reliability: <retry/failure behavior>
- [ ] Observability: <logs/metrics/traces/alerts>
- [ ] Accessibility (if UI): <a11y expectations>

## Technical Notes

- Likely areas to change: <files/modules/services>
- Dependencies: <internal/external dependencies>
- Data/migration impact: <yes/no + details>

## Risks and Mitigations

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

## Output

When using this skill, always return the link(s) to the created GitHub issue(s).

## Quality bar

- Do not invent codebase facts.
- Keep acceptance criteria testable and observable.
- Keep scope tight enough for one implementation cycle.
- Prefer explicit assumptions over implicit guesswork.
- Don't include code snippets.

## The idea in question:
