import { env } from "./midnight-automations/setup"; // must be first

import {
  archiveIrrelevantOnSiteNotifications,
  autoAssignInactiveRoles,
  countCitizensPerRole,
  countMcpUsage,
  countShips,
  countUniqueLogins,
  deleteUnusedUploads,
  disburseRoleSalaries,
  endDueCollectionPhases,
  endDuePayoutPhases,
  purgeExpiredAuthenticationRecords,
  purgeExpiredOAuthRecords,
  purgeOrphanedWikiTags,
  purgeTrashedWikiPages,
  removeExpiredRoleAssignments,
} from "@sam-monorepo/application";
import { createS3Client, createS3Storage } from "@sam-monorepo/infrastructure";
import type { ScheduledHandler } from "aws-lambda";
import { createApplicationContext } from "./common/createApplicationContext";
import { createJobFactory } from "./common/createJob";
import { runJobsInIsolation } from "./common/runJobsInIsolation";

/**
 * The S3 parameters are optional: without them, the context has no storage
 * and `deleteUnusedUploads` skips the bucket.
 */
const createStorage = () => {
  const {
    S3_ACCOUNT_ID: accountId,
    S3_ACCESS_KEY_ID: accessKeyId,
    S3_SECRET_ACCESS_KEY: secretAccessKey,
    S3_BUCKET_NAME: bucketName,
  } = env;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName)
    return null;

  return createS3Storage({
    client: createS3Client({
      accountId,
      credentials: { accessKeyId, secretAccessKey },
    }),
    bucketName,
  });
};

const context = createApplicationContext({
  source: "midnight-automations",
  baseUrl: env.BASE_URL,
  publicUploadBaseUrl: env.PUBLIC_UPLOAD_BASE_URL,
  storage: createStorage(),
});

const createJob = createJobFactory(context);

export const handler: ScheduledHandler = async () =>
  runJobsInIsolation({
    endCollectionPhases: createJob(endDueCollectionPhases),
    endPayoutPhases: createJob(endDuePayoutPhases),
    removeExpiredRoles: createJob(removeExpiredRoleAssignments),
    autoAssignInactiveRoles: createJob(autoAssignInactiveRoles),
    countCitizensPerRole: createJob(countCitizensPerRole),
    disburseRoleSalaries: createJob(disburseRoleSalaries),
    countShips: createJob(countShips),
    countUniqueLogins: createJob(countUniqueLogins),
    countMcpUsage: createJob(countMcpUsage),
    purgeTrashedWikiPages: createJob(purgeTrashedWikiPages),
    purgeOrphanedWikiTags: createJob(purgeOrphanedWikiTags),
    archiveIrrelevantOnSiteNotifications: createJob(
      archiveIrrelevantOnSiteNotifications,
    ),
    deleteUnusedUploads: createJob(deleteUnusedUploads),
    purgeExpiredAuthenticationRecords: createJob(
      purgeExpiredAuthenticationRecords,
    ),
    purgeExpiredOAuthRecords: createJob(purgeExpiredOAuthRecords),
  });
