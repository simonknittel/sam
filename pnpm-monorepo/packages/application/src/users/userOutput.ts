import { UserRole } from "@sam-monorepo/database/browser";
import type { Prisma } from "@sam-monorepo/database/client";
import { redactEmailAddress } from "@sam-monorepo/domain";
import {
  CITIZEN_REFERENCE_SELECT,
  toCitizenReference,
  type CitizenReference,
} from "../citizenReference.js";

export enum UserRoleOutput {
  Admin = "admin",
  User = "user",
}

/** The fields of a user in the output of the user use cases */
export const USER_OUTPUT_SELECT = {
  id: true,
  name: true,
  email: true,
  emailVerified: true,
  createdAt: true,
  role: true,
  discordTwoFactorEnabled: true,
  bannedAt: true,
  bannedReason: true,
  bannedBy: { select: CITIZEN_REFERENCE_SELECT },
  accounts: {
    where: { provider: "discord" },
    select: { providerAccountId: true },
    take: 1,
  },
  citizen: { select: CITIZEN_REFERENCE_SELECT },
} as const satisfies Prisma.UserSelect;

type UserOutputRow = Prisma.UserGetPayload<{
  select: typeof USER_OUTPUT_SELECT;
}>;

export interface UserBanOutput {
  readonly banned_at: string;
  readonly reason: string | null;
  /** Null for a ban without a citizen or by a deleted citizen */
  readonly banned_by: CitizenReference | null;
}

export interface UserOutput {
  readonly id: string;
  /** The name from Discord */
  readonly name: string | null;
  /** Redacted, see `redactEmailAddress()` */
  readonly email: string | null;
  readonly email_verified_at: string | null;
  readonly created_at: string | null;
  readonly role: UserRoleOutput;
  readonly discord_id: string | null;
  /** The status of the last Discord login. Null: unknown. */
  readonly discord_two_factor_enabled: boolean | null;
  /** Null for a user without a citizen or with a deleted citizen */
  readonly citizen: CitizenReference | null;
  /** Null for a user who is not banned */
  readonly ban: UserBanOutput | null;
}

const toUserRoleOutput = (role: UserRole | null) => {
  switch (role) {
    case UserRole.ADMIN:
      return UserRoleOutput.Admin;

    // A user without a user role is a normal user
    case null:
      return UserRoleOutput.User;

    default:
      throw new Error(`Unknown user role: ${role satisfies never}`);
  }
};

/** The email address never leaves the use case without the redaction */
export const toUserOutput = (user: UserOutputRow): UserOutput => ({
  id: user.id,
  name: user.name,
  email: user.email === null ? null : redactEmailAddress(user.email),
  email_verified_at: user.emailVerified?.toISOString() ?? null,
  created_at: user.createdAt?.toISOString() ?? null,
  role: toUserRoleOutput(user.role),
  discord_id: user.accounts[0]?.providerAccountId ?? null,
  discord_two_factor_enabled: user.discordTwoFactorEnabled,
  citizen: toCitizenReference(user.citizen),
  ban: user.bannedAt && {
    banned_at: user.bannedAt.toISOString(),
    reason: user.bannedReason,
    banned_by: toCitizenReference(user.bannedBy),
  },
});
