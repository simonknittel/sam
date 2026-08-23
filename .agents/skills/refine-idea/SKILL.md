---
name: refine-idea
description: Refine a rough idea into actionable engineering ticket(s) with user story, functional acceptance criteria, non-functional acceptance criteria.
---

# Refine idea

Use this skill when you receive an idea that is incomplete, vague, or not ready for implementation.

The skill supports feature requests, tasks, bugs, and other technical improvements.

## Goal

Transform a rough idea into one or more clear, buildable tickets and create GitHub issues for them.

## Inputs

The idea comes in the form of an existing GitHub issue or a free-form description.

## Process

Do these steps in this sequence.

### 1) Understand the idea and examine the codebase

- Classify the idea type: `feature`, `bug`, `task` or `investigation`.
- Repeat the idea in one sentence to confirm that you understand it.
- Search for applicable code paths, modules, APIs, UI screens, event handlers, and data models.
- Identify the current behavior and the patterns that the codebase already uses in the applicable areas.
- Record concrete references (file paths, symbols, services, tables, endpoints).
- Do not invent codebase facts.

Minimum output from this step:

- `What exists today`
- `Where it likely changes`
- `Known constraints`

### 2) Interview me

Before you continue with the refinement, use the `question`/`vscode_askQuestions` tool to ask clarification questions. Do a thorough interview with me to get all necessary details before you continue to the next step. Continue to ask clarification questions until you can answer everything without a guess. Then explicitly say: "I have enough information to proceed" before you continue to the next step.

- Only ask high-value questions that unblock the implementation.
- Prefer questions grouped by topic (product, UX, data, security, rollout, testing).
- Point out vague phrases from the issue and ask for explicit decisions.
- Ask for clarification of terms and wording that permit more than one interpretation.
- If the issue is a bug, ask for reproduction details, the expected behavior, and the environment.
- Do not combine questions. Bad example: "Should we do X or Y? Also, do we need to consider Z?"

Question quality rules:

- Do not ask a yes/no-only question when the answer needs nuance.
- Do not ask duplicate questions.
- If there are too many unknowns, ask for a priority order.

### 3) Assess and improve the proposed direction

- Reconcile the findings from step 1 with the interview answers that replace them. Update the known constraints and the likely change areas before you produce the ticket.
- Check that the request is coherent and technically feasible with the current architecture.
- Suggest better or more common alternatives if they decrease risk or complexity.
- Identify missing scope boundaries and out-of-scope items.
- Add dependencies, migration implications, permissions, observability, and rollback considerations when applicable.
- Explicitly identify risks and assumptions.

Assessment checklist:

- The problem is clear
- The user impact is clear
- The scope is bounded
- Edge cases are considered
- The test approach is defined
- Monitoring/alerts/logging are considered (if applicable)
- Security/privacy/performance considerations are included (if applicable)

### 4) Produce refined GitHub issues

Divide the idea into one or more actionable GitHub issues (a common division: backend and frontend). Create separate issues when: (a) different teams or disciplines can do the work independently, (b) one part can ship without the other, or (c) the combined scope is more than approximately 3-5 days of work. In the other cases, keep the idea as one issue. Add the label "AI-candidate" to each new issue. Link each new issue to the other new issues. Add an implementation order if applicable. The issues must also link to the original parent idea or issue if applicable. Add the links to the "Context" section of the ticket template (see below). You can update the issue description later if you have not created the other issues yet.

Add a comment with links to the new refined issue(s) to the original issue, then close the original issue. If the input is a free-form description without a GitHub issue number, skip the comment and close steps.

For each ticket, prepare a refined ticket body with the template below.

- Keep the acceptance criteria testable and observable.
- Keep the scope small enough for one implementation cycle.
- Do not include code snippets.

## Refined ticket template

Use this format and adapt the sections to the issue type.

```md
## Goal

<Describe in one concise sentence what you want to achieve with the task or the improvement. Make sure to describe the outcome, not a solution.>

## Problem

<Share the context and describe the problem in more detail.>

## Solution

<This section can outline a proposal.>

## Context

- Notes from codebase: <relevant findings>
- Parent issue: <link to original issue if applicable>
- Links to related issues together with the implementation order: <links to other new issues created from the same idea>

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

MUST use method: GitHub CLI

Examples:

```sh
# Show the details of an issue together with its comments:
gh issue view <issue-number> --repo <owner/repo> --json title,body,labels,number,url,comments

# Post a comment:
gh issue comment <issue-number> --repo <owner/repo> --body-file <refined-ticket.md>
```

- If `gh` is not available or returns an authentication error, stop and tell the user. Do not fall back to a different method.
- Before you execute a `gh` command, confirm the target repo with `gh repo view --json nameWithOwner` in the current directory. If the result is ambiguous or the working directory is not a git repo, ask the user to specify `<owner/repo>` explicitly.

## Final output

Only return the link(s) to the created GitHub issue(s).

## The idea:
