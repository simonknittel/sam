# AWS security monitoring (CloudTrail alarms + GuardDuty)

## Goal

Detect suspicious activity in the AWS account — especially usage of a leaked access key — by alerting on CloudTrail-recorded permission errors and critical account activity via CloudWatch alarms, and by enabling GuardDuty for managed threat detection. All manually created resources involved (CloudTrail trail, its S3 bucket, AWS User Notifications) get imported into Terraform.

## Decision log

- Detection path is trail → CloudWatch Logs → metric filters → CloudWatch alarms (the CIS AWS Foundations Benchmark pattern). An EventBridge-only detector was rejected because EventBridge does not receive read-only management events (`List*`/`Describe*`/`Get*`), which is exactly what leaked-key probing mostly produces.
- CloudTrail Insights rejected: it only analyzes write management events, is anomaly/volume-based with baseline lag, and cannot alert on individual events.
- GuardDuty is enabled in addition, because AccessDenied alarms only catch a leaked key that lacks permissions; GuardDuty detects anomalous successful usage. It runs in all active regions (a key can be used from anywhere; idle regions cost ~nothing) with foundational data sources only — paid protection plans (S3, Malware, Runtime, …) stay off.
- Email delivery via the existing AWS User Notifications setup (not SNS, not the app's notification-router). The existing `cloudwatch-alarms` notification configuration already matches every eu-central-1 alarm entering `ALARM` state, so new alarms need no additional delivery wiring — only the import.
- Two alarms instead of one shared one: unauthorized API calls need a threshold of ≥3 per 5 minutes to tolerate benign AccessDenied noise, while critical activity must alert at ≥1 — a single shared alarm can only have one threshold and would mask single critical events. All critical filters feed one shared custom metric so a single standard alarm covers them.
- Critical-activity alarm covers: root account usage, console sign-in failures, IAM changes, and CloudTrail configuration changes (`StopLogging`, `DeleteTrail`, `UpdateTrail`, `PutEventSelectors` — disabling the trail is a typical first move of an attacker). Known self-noise: our own Terraform applies touching IAM or the trail will trigger it.
- GuardDuty findings of all severities are emailed via a new User Notifications configuration.
- Retention: CloudWatch Logs 90 days (only needed to drive the metric filters); S3 remains the archive and gets a new 400-day lifecycle expiration (bucket currently grows unbounded).
- Log file validation gets enabled on the trail (free tamper-evidence, currently off).
- The AWS Console Mobile App channel association on the existing notification configuration stays unmanaged by Terraform — it is tied to Simon's device and SSO identity, not infrastructure.
- Expected costs: $0.20/month for the two alarms, cents for CloudWatch Logs ingestion at current volume (~410 MB compressed over 17 months), GuardDuty an estimated $1–2/month after its 30-day free trial. Fits the $10/month budget.

### Out of scope

- The `Health-quick-setup` notification configuration (unrelated to this feature, stays console-managed).
- CloudTrail Insights, data events, and CloudTrail Lake.
- GuardDuty paid protection plans (S3 Protection, Malware Protection, Runtime Monitoring, …).
- SNS-based alerting or routing alerts through the app's notification-router/email-function.
- Multi-account or AWS Organizations setup (no prod account exists yet).

## Overall implementation notes

- Account `220746603587` serves as both test and prod today. The config stays environment-agnostic like the rest of the repo (per-env tfvars/backends), so a future prod account just gets a second state. Import blocks reference this account's ARNs and MUST be removed after the import has been applied — a future prod apply would otherwise fail on them.
- The existing CloudTrail bucket name (`aws-cloudtrail-logs-220746603587-6f2d1bf9`) contains a console-generated random suffix and cannot be derived, so it becomes a Terraform variable populated per environment.
- The User Notifications and Notifications Contacts APIs are served from us-east-1; the AWS provider v6 handles region selection per resource (`region` attribute) — verify during implementation how the `aws_notifications_*` resources want this expressed.
- The trail is multi-region with home region eu-central-1. CloudWatch Logs delivery aggregates all regions into one log group, so the metric filters see global activity. Detection latency is roughly 5–20 minutes (CloudTrail delivers to CloudWatch Logs in ~5 minutes on average, up to 15).
- GuardDuty detectors for all regions are created with a `for_each` over the enabled-regions data source using the provider v6 per-resource `region` attribute (no provider aliases needed).
- Alarms use `treat_missing_data = "notBreaching"` so they idle in `OK`; the existing notification filter matches `OK`/`INSUFFICIENT_DATA` → `ALARM` transitions.
- Implementation happens in a separate git worktree.

## Implementation phases

### Phase 1: Import CloudTrail and its S3 bucket

Bring the existing trail `management-events` and the bucket `aws-cloudtrail-logs-220746603587-6f2d1bf9` (policy, public access block, encryption config) under Terraform management, and fix the two hygiene gaps found during inspection.

#### Status

Done — applied to the test account and verified on 2026-08-08: trail, bucket, bucket policy and public access block imported; log file validation and the 400-day lifecycle are live; a follow-up plan is a clean no-op. The encryption configuration was left unmanaged (see notes).

#### Steps

- Add a variable for the CloudTrail bucket name, populated in `test.tfvars`.
- Write resources matching the live state: the trail (multi-region, management events read+write, global service events), the bucket, its CloudTrail service policy, public access block (all four flags on), and default SSE-S3 encryption. Add import blocks for each.
- Enable log file validation on the trail.
- Add a lifecycle configuration to the bucket: expire objects after 400 days, abort incomplete multipart uploads, clean up expired object delete markers.

#### Notes

- The live encryption config includes `BlockedEncryptionTypes: SSE-C`, which the pinned provider cannot express — the encryption configuration stays unmanaged (the live default of SSE-S3/AES256 is also what S3 applies to any new bucket automatically).
- The apply also picked up a pending change from main that predates this plan: the midnight-automations IAM policy gained access to the `/s3/*` SSM parameters (config was ahead of the last apply).
- The bucket policy's statement IDs contain console-generated UUIDs — reproduce them verbatim to avoid a policy diff.

#### Verification

- `terraform plan` after adding the import blocks shows only the two intended changes (log file validation, lifecycle) and no replacements.
- After apply: `get-trail` shows `LogFileValidationEnabled: true`, the lifecycle configuration exists, and `get-trail-status` shows `LatestDeliveryTime` still advancing.

### Phase 2: Import AWS User Notifications

Bring the existing manually created User Notifications setup under Terraform: the notification hub, the email contact, the `cloudwatch-alarms` notification configuration, its event rule, and the email channel association.

#### Status

Not started.

#### Steps

- Write and import: notification hub (eu-central-1), email contact (`arn:aws:notifications-contacts::220746603587:emailcontact/a01hhsbt41vkzvna6n5vc0x1bcy`), notification configuration (`arn:aws:notifications::220746603587:configuration/a01hhsbt51hcth28h753cdqq9m8`), its event rule (`.../rule/a01hhsbt58qn5aadqrtaxqyknnp`), and the association between the email contact and the configuration.
- Update the User Notifications section of `docs/setup-test-and-production.md`: hub, contact, and CloudWatch configuration are now Terraform-managed; only the Console Mobile App channel and the Health configuration remain manual.

#### Notes

- The live configuration reports `aggregationDuration: NONE` although the setup doc describes 5-minute aggregation — adopt the live value on import and correct the doc.
- The Console Mobile App channel association is intentionally not imported.
- For a future prod account these resources are created fresh; the email contact then requires a one-time activation click from an email AWS sends.

#### Verification

- A follow-up `terraform plan` is a no-op for all imported resources.
- End-to-end delivery is exercised in Phase 3's alarm test.

### Phase 3: CloudWatch Logs delivery, metric filters, and alarms

Deliver the trail to a CloudWatch Logs log group and create the metric filters and the two alarms.

#### Status

Not started.

#### Steps

- Create a log group with 90-day retention and the IAM role/policy CloudTrail needs to write to it; point the trail at both.
- Create five metric filters in the log group:
  - Unauthorized API calls (`errorCode` matching `AccessDenied*` or `*UnauthorizedOperation`) emitting its own metric.
  - Root account usage (userIdentity type `Root`, no `invokedBy`, excluding `AwsServiceEvent`), console sign-in failures (`ConsoleLogin` with `Failed authentication`), IAM changes (the CIS "IAM policy changes" pattern), and CloudTrail configuration changes — all four emitting one shared critical-activity metric.
- Create two alarms in eu-central-1 (5-minute period, Sum): unauthorized API calls at threshold ≥3, critical activity at threshold ≥1.

#### Notes

- The alarms are picked up automatically by the imported `cloudwatch-alarms` notification configuration — no new delivery wiring.
- The unauthorized threshold of 3 is a starting point; tune it after observing real noise for a week.

#### Verification

- Log streams appear in the log group shortly after apply and contain events from multiple regions.
- Delivery test: `set-alarm-state` to `ALARM` on one alarm → email (and mobile push) arrives.
- Real-signal test: assume a purpose-made permissionless role, make ≥3 API calls that get denied, and confirm metric increment → alarm → email within ~25 minutes. Remove the test role afterwards.
- IAM-change detection will also confirm itself on the next terraform apply touching IAM.

### Phase 4: GuardDuty in all regions

Enable GuardDuty detectors in every active region and email all findings via a new User Notifications configuration.

#### Status

Not started.

#### Steps

- Enumerate the account's enabled regions with a data source and create one detector per region via `for_each` (foundational data sources only, finding publishing frequency 15 minutes).
- Create a second notification configuration with an event rule for GuardDuty findings (source `aws.guardduty`, event type "GuardDuty Finding") covering all detector regions, without a severity filter, and associate the email contact.
- Extend the setup doc's monitoring notes accordingly.

#### Notes

- Enabling via API/Terraform activates only foundational sources; unlike the console flow it does not auto-enable paid protection plans. Verify none are active after apply.
- The 30-day free trial starts per region on first enablement.

#### Verification

- All detectors report `ACTIVE`; no optional protection plans enabled.
- `create-sample-findings` in eu-central-1 and one other region → notification emails arrive for both.
- Archive the sample findings afterwards.

## Final end-to-end verification

- `terraform plan` is clean (no drift) after the import blocks have been removed.
- The permissionless-role AccessDenied test triggers the unauthorized-API-calls alarm and an email lands in hallo@simonknittel.de.
- GuardDuty sample findings from two regions each produce an email.
- The trail delivers to both S3 and CloudWatch Logs; log file validation on; lifecycle rule visible.
- After a few days: Cost Explorer shows GuardDuty/CloudWatch costs in the expected range (well within the $10 budget) and alarm noise is acceptable, otherwise tune the unauthorized threshold.

## Rollout plan

1. Implement in a separate worktree, review, merge to main — not started.
2. `terraform apply` against the test state (the single live account), which performs the imports and creates everything — not started.
3. Run the end-to-end verification — not started.
4. Remove the import blocks and commit — not started.
5. Observe alarm noise and GuardDuty trial costs for about a week; tune thresholds if needed — not started.
6. Future prod account: apply the same config with prod tfvars/backend (fresh creation, no imports; email contact needs its activation click) — blocked until a prod account exists.
