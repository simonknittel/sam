import { env } from "@/env";
import { getApplicationContext } from "@/modules/application/getApplicationContext";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import {
  DEVELOPMENT_SESSION_TOKEN_COOKIE,
  SESSION_TOKEN_COOKIE_NAMES,
} from "@/modules/auth/utils/sessionTokenCookie";
import { getDiscordAvatar } from "@/modules/discord/utils/getDiscordAvatar";
import { getDiscordTwoFactorEnabled } from "@/modules/discord/utils/getDiscordTwoFactorEnabled";
import { getGuildMember } from "@/modules/discord/utils/getGuildMember";
import { log } from "@/modules/logging";
import { PrismaAdapter } from "@auth/prisma-adapter";
import {
  hasBirthdayTodaySafely,
  linkCitizenOfSignedInUser,
  sendEmailConfirmation,
} from "@sam-monorepo/application";
import { prisma } from "@sam-monorepo/database";
import {
  UserRole,
  type Citizen,
  type User as DatabaseUser,
} from "@sam-monorepo/database/client";
import {
  ACTIVE_CITIZEN_WHERE,
  ASSUMABLE_USER_WHERE,
  comparePermissionSets,
  FLEET_UPDATE_REMINDER_ABSENCE_MONTHS,
  getLocalDateKey,
  isMissingTwoFactorAuthentication,
  ORGANIZATION_TIMEZONE,
  USER_AGENT_MAXIMUM_LENGTH,
  type PermissionSet,
} from "@sam-monorepo/domain";
import {
  getServerSession,
  type DefaultSession,
  type NextAuthOptions,
  type Session,
} from "next-auth";
import type { AdapterSession, AdapterUser } from "next-auth/adapters";
import DiscordProvider, {
  type DiscordProfile,
} from "next-auth/providers/discord";
import { cookies, headers } from "next/headers";
import { after } from "next/server";
import { ASSUME_USER_COOKIE } from "../utils/adminCookies";
import { getEffectiveRoles, type EffectiveRoles } from "./getEffectiveRoles";

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      role: UserRole | null;
      emailVerified: Date | null;
    } & DefaultSession["user"];
    /** NULL only for a user without a Discord account */
    discordId: string | null;
    /**
     * The two-factor authentication of the Discord account behind the
     * session token, not of an assumed user: the person who logged in.
     */
    discordTwoFactorEnabled: boolean | null;
    givenPermissionSets: PermissionSet[];
    /**
     * Kept deliberately minimal: the session is serialized into the payload
     * of every page, so it carries only what its consumers read — the
     * citizen id, the handle (embed tokens) and the raw role assignments
     * (the level progress and the assigned roles of the career flows).
     * Permission and role decisions use `givenPermissionSets` and
     * `getEffectiveRoles()`, never these assignments: they ignore
     * inheritance and the level gate.
     */
    entity:
      | (Pick<Citizen, "id" | "handle"> & {
          /**
           * Whether the citizen has their birthday today, in their own time
           * zone. Only this answer travels; the day and the month of the
           * birthday stay on the server. Both account avatars read it, thus
           * it belongs on the session and not into a query of its own.
           */
          hasBirthdayToday: boolean;
          roleAssignments: EffectiveRoles["roleAssignments"];
        })
      | null;
    /**
     * The id of the admin behind the session token when this session was
     * built for another user which the admin assumes via the `assume_user`
     * cookie. Null for a session of the own user.
     */
    assumedByAdminId: string | null;
  }

  interface User {
    role?: UserRole | null;
    lastSeenAt?: Date;
    discordTwoFactorEnabled?: boolean | null;
  }
}

const adapter = PrismaAdapter(prisma);

export const SESSION_MAX_AGE = 60 * 60 * 24 * 31; // 31 days, in seconds

/**
 * Replaces the adapter's own `createSession` so the session gets the two
 * columns the account's session list shows. The adapter writes only the
 * fields NextAuth knows about, so there is nothing to delegate to.
 */
export const createSession = async (
  session: AdapterSession,
): Promise<AdapterSession> => {
  const userAgent = (await headers()).get("user-agent");

  return prisma.session.create({
    data: {
      ...session,
      createdAt: new Date(),
      userAgent: userAgent?.slice(0, USER_AGENT_MAXIMUM_LENGTH) ?? null,
    },
  });
};

/**
 * Admins can assume another user via the `assume_user` cookie (set by the
 * admin toolbar). The session is then built entirely from the assumed user,
 * so the whole app behaves as if they were logged in — including audit
 * attribution of mutations. The cookie is only honored when the user behind
 * the session token actually has the admin role and the two-factor
 * authentication of Discord. Without it, the own session of the admin stops
 * at the gate of the two-factor authentication.
 */
const getAssumedUser = async (
  sessionUser: AdapterUser,
): Promise<DatabaseUser | null> => {
  if (
    sessionUser.role !== UserRole.ADMIN ||
    sessionUser.discordTwoFactorEnabled !== true
  )
    return null;

  const assumedUserId = (await cookies()).get(ASSUME_USER_COOKIE)?.value;
  if (!assumedUserId || assumedUserId === sessionUser.id) return null;

  // A session that fails to resolve would break every request of the admin
  // until the cookie expires, thus an unassumable user is ignored.
  return prisma.user.findFirst({
    where: {
      id: assumedUserId,
      ...ASSUMABLE_USER_WHERE,
    },
  });
};

/**
 * Whether the request carries the token of a valid session. During a
 * session, NextAuth links a Discord account without a user to the user of
 * the session, and the citizen of that account then moves to this user. A
 * user has one Discord account, thus the sign-in refuses such a link: else a
 * user with the two-factor authentication could take the permissions of a
 * different account without it.
 */
const hasSessionOfRequest = async () => {
  const cookieStore = await cookies();
  const sessionTokens = SESSION_TOKEN_COOKIE_NAMES.flatMap((name) => {
    const value = cookieStore.get(name)?.value;
    return value ? [value] : [];
  });
  if (sessionTokens.length === 0) return false;

  const sessionCount = await prisma.session.count({
    where: {
      sessionToken: { in: sessionTokens },
      expires: { gt: new Date() },
    },
  });
  return sessionCount > 0;
};

/**
 * Welcomes a citizen on their first request with access to the app. The
 * welcome is a notification and, on the same local day, the welcome banner
 * of the dashboard.
 *
 * Each citizen gets one welcome. Only the request that sets `welcomedAt`
 * continues, thus parallel requests of the same first visit send one
 * welcome. The marker comes first, because the banner of the same request
 * reads it. The notification and the audit event follow after the response.
 * If a failure occurs after the marker is set, the citizen gets no
 * notification. This is better than two welcomes.
 */
const welcomeCitizen = async (
  citizenId: Citizen["id"],
  userId: DatabaseUser["id"],
) => {
  try {
    const { count } = await prisma.citizen.updateMany({
      where: { id: citizenId, welcomedAt: null },
      data: { welcomedAt: new Date() },
    });
    if (count !== 1) return;

    after(async () => {
      try {
        await getApplicationContext().notifications.trigger([
          { type: "WelcomeGreeting", payload: { citizenId } },
        ]);
      } catch (error) {
        log.error("Failed to send the welcome notification", {
          citizenId,
          userId,
          error,
        });
      }

      await getApplicationContext().audit.create([
        {
          type: AuditEventType.CITIZEN_WELCOMED,
          data: { citizenId },
          createdById: userId,
        },
      ]);
    });
  } catch (error) {
    log.error("Failed to welcome the citizen", { citizenId, userId, error });
  }
};

/**
 * Moves `lastSeenAt` of the user to now on their first request of the day.
 * After an absence of `FLEET_UPDATE_REMINDER_ABSENCE_MONTHS` or more, the
 * citizen of the user also gets the reminder to check their ships. A user
 * without `lastSeenAt` is new and gets the welcome instead.
 *
 * Only the request that moves `lastSeenAt` from the value of its session
 * continues, thus parallel requests of the same visit write one audit event
 * and send one reminder.
 */
const recordFirstVisitOfTheDay = async (
  user: AdapterUser,
  citizenId: Citizen["id"] | null,
) => {
  try {
    const now = new Date();
    const previousLastSeenAt = user.lastSeenAt ?? null;

    const { count } = await prisma.user.updateMany({
      where: { id: user.id, lastSeenAt: previousLastSeenAt },
      data: { lastSeenAt: now },
    });
    if (count !== 1) return;

    await getApplicationContext().audit.create([
      {
        type: AuditEventType.USER_FIRST_VISIT_OF_THE_DAY_V2,
        data: {
          userId: user.id,
          userEmail: user.email,
          userName: user.name,
        },
        createdById: user.id,
      },
    ]);

    const absenceStart = new Date(now);
    absenceStart.setUTCMonth(
      absenceStart.getUTCMonth() - FLEET_UPDATE_REMINDER_ABSENCE_MONTHS,
    );
    if (!citizenId || !previousLastSeenAt || previousLastSeenAt > absenceStart)
      return;

    after(async () => {
      try {
        await getApplicationContext().notifications.trigger([
          { type: "FleetUpdateReminder", payload: { citizenId } },
        ]);
      } catch (error) {
        log.error("Failed to send the fleet update reminder", {
          citizenId,
          userId: user.id,
          error,
        });
      }
    });
  } catch (error) {
    log.warn("Failed to update user's lastSeenAt", {
      userId: user.id,
      error,
    });
  }
};

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authOptions: NextAuthOptions = {
  callbacks: {
    session: async ({ session, user }) => {
      const assumedUser = await getAssumedUser(user);
      const effectiveUser = assumedUser ?? user;

      const { accounts, citizen } = await prisma.user.findUniqueOrThrow({
        where: {
          id: effectiveUser.id,
        },
        select: {
          accounts: {
            where: { provider: "discord" },
            select: { providerAccountId: true },
            take: 1,
          },
          citizen: {
            select: {
              id: true,
              handle: true,
              timezone: true,
              birthdayDay: true,
              birthdayMonth: true,
              welcomedAt: true,
            },
          },
        },
      });

      let givenPermissionSets: PermissionSet[] = [];
      let entity: Session["entity"] = null;
      if (citizen) {
        const effectiveRoles = await getEffectiveRoles(citizen.id);

        givenPermissionSets = effectiveRoles.permissionSets;
        entity = {
          id: citizen.id,
          handle: citizen.handle,
          hasBirthdayToday: hasBirthdayTodaySafely(
            { log },
            citizen,
            new Date(),
          ),
          roleAssignments: effectiveRoles.roleAssignments,
        };
      }

      // Only update lastSeenAt once a day. Skipped while assuming another
      // user so their presence data doesn't get falsified.
      if (
        !assumedUser &&
        (!user.lastSeenAt ||
          getLocalDateKey(user.lastSeenAt, ORGANIZATION_TIMEZONE) !==
            getLocalDateKey(new Date(), ORGANIZATION_TIMEZONE))
      )
        await recordFirstVisitOfTheDay(user, citizen?.id ?? null);

      // The welcome follows the roles of the citizen and not the admin mode,
      // because the notification goes only to citizens with `login;manage`
      // through their roles. An assumed session must not use up the welcome
      // of the assumed user. The dashboard requires a confirmed email and
      // the two-factor authentication that some permissions require (see
      // `requireAuthenticationPage()`), thus the welcome waits for them.
      if (
        citizen &&
        !citizen.welcomedAt &&
        !assumedUser &&
        user.emailVerified &&
        comparePermissionSets(
          { resource: "login", operation: "manage" },
          givenPermissionSets,
        ) &&
        !isMissingTwoFactorAuthentication({
          userRole: user.role ?? null,
          permissionSets: givenPermissionSets,
          discordTwoFactorEnabled: user.discordTwoFactorEnabled ?? null,
        })
      )
        await welcomeCitizen(citizen.id, user.id);

      return {
        ...session,
        user: {
          ...session.user,
          id: effectiveUser.id,
          name: effectiveUser.name,
          email: effectiveUser.email,
          image: effectiveUser.image,
          role: effectiveUser.role ?? null,
          emailVerified: effectiveUser.emailVerified,
        },
        discordId: accounts[0]?.providerAccountId ?? null,
        discordTwoFactorEnabled: user.discordTwoFactorEnabled ?? null,
        givenPermissionSets,
        entity,
        assumedByAdminId: assumedUser ? user.id : null,
      };
    },

    async signIn({ user, account, profile }) {
      if (!profile) throw new Error("Missing profile");

      /**
       * Update account and user on login
       *
       * This callback doesn't tell us if the user already exists in the
       * database. Also, this callback gets called before a new user gets
       * created in the database. Therefore, we have to figure out ourselves
       * if we can update an existing user or not.
       */

      log.info("Login attempt", {
        accountProvider: account?.provider,
        accountProviderAccountId: account?.providerAccountId,
        profileEmail: profile.email,
      });

      /**
       * The sign-in callback checks whether the user exists and is banned,
       * and compares the status of the two-factor authentication
       */
      const existingUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { id: true, bannedAt: true, discordTwoFactorEnabled: true },
      });

      if (!account) throw new Error("account is missing");
      if (!account.access_token)
        throw new Error("account.access_token is missing");

      if (existingUser) {
        if (existingUser.bannedAt) {
          log.info("Banned user attempted to log in", {
            userId: user.id,
          });

          await getApplicationContext().audit.create([
            {
              type: AuditEventType.USER_LOGIN_BLOCKED,
              data: {
                userId: user.id,
              },
              createdById: user.id,
            },
          ]);

          return "/?error=UserBanned";
        }

        const guildMember = await getGuildMember(account.access_token);

        if ("message" in guildMember) {
          log.info("User not member of the Discord guild", {
            userId: user.id,
          });
          throw new Error(guildMember.message);
        }

        const avatar = getDiscordAvatar(profile as DiscordProfile, guildMember);
        const discordTwoFactorEnabled = getDiscordTwoFactorEnabled(profile);

        /**
         * The status belongs to the user, thus it also applies to the older
         * sessions. A session from before the two-factor authentication can
         * belong to a different person, for example after a phished
         * password. Thus these sessions end when a login confirms the
         * two-factor authentication. NextAuth then creates a new session for
         * this login, because the session of the cookie is gone.
         */
        const endsOlderSessions =
          discordTwoFactorEnabled === true &&
          existingUser.discordTwoFactorEnabled !== true;

        await prisma.$transaction([
          ...(endsOlderSessions
            ? [prisma.session.deleteMany({ where: { userId: user.id } })]
            : []),

          prisma.account.update({
            where: {
              provider_providerAccountId: {
                provider: account.provider,
                providerAccountId: account.providerAccountId,
              },
            },
            data: {
              refresh_token: account.refresh_token,
              access_token: account.access_token,
              expires_at: account.expires_at,
              scope: account.scope,
              updatedAt: new Date(),
            },
          }),

          prisma.user.update({
            where: {
              id: user.id,
            },
            data: {
              email: profile.email!.toLocaleLowerCase(),
              image: avatar,
              discordTwoFactorEnabled,
              updatedAt: new Date(),
            },
          }),
        ]);
      } else {
        // New user
        if (await hasSessionOfRequest()) {
          log.info("Refused the link of a different Discord account", {
            accountProviderAccountId: account.providerAccountId,
          });
          return false;
        }

        const guildMember = await getGuildMember(account.access_token);

        if ("message" in guildMember) {
          log.info("User not member of the Discord guild", {
            userId: user.id,
          });
          throw new Error(guildMember.message);
        }

        user.email = profile.email!.toLocaleLowerCase();

        const avatar = getDiscordAvatar(profile as DiscordProfile, guildMember);
        user.image = avatar;

        user.discordTwoFactorEnabled = getDiscordTwoFactorEnabled(profile);

        user.name = null;

        if (!("id" in profile) || !profile.id)
          throw new Error("profile.id is missing");

        /** The columns hold the latest confirmed Discord ID and handle */
        const citizen = await prisma.citizen.findFirst({
          where: { discordId: profile.id, ...ACTIVE_CITIZEN_WHERE },
          select: { id: true, handle: true },
        });

        if (citizen) user.name = citizen.handle || citizen.id;
      }

      return true;
    },
  },

  adapter: {
    ...adapter,
    createUser: async (user: AdapterUser) => {
      const createdUser = await adapter.createUser!(user);

      // Guards the sign-in against a programming error: the helper never throws
      try {
        await sendEmailConfirmation(getApplicationContext(), {
          userId: createdUser.id,
          email: user.email,
        });
      } catch (error) {
        log.error("Failed to request email confirmation for created user", {
          userId: createdUser.id,
          error,
        });
      }

      return createdUser;
    },

    createSession,
  },

  providers: [
    DiscordProvider({
      clientId: env.DISCORD_CLIENT_ID,
      clientSecret: env.DISCORD_CLIENT_SECRET,
      authorization:
        "https://discord.com/api/oauth2/authorize?scope=identify+email+guilds.members.read",
      // Discord sends the `iss` parameter in the callback (RFC 9207). openid-client rejects the callback if the provider has no issuer.
      issuer: "https://discord.com",
    }),
  ],

  pages: {
    error: "/",
    newUser: "/email-confirmation?new-user=true",
  },

  session: {
    maxAge: SESSION_MAX_AGE,
    updateAge: SESSION_MAX_AGE * 2, // Make sure `updateAge` is bigger than `maxAge` so that the session actually expires at some point and then a refreshed authentication with the identity provider is forced
  },

  cookies: DEVELOPMENT_SESSION_TOKEN_COOKIE
    ? { sessionToken: DEVELOPMENT_SESSION_TOKEN_COOKIE }
    : undefined,

  events: {
    signIn: async (message) => {
      /**
       * A failed link does not stop the sign-in, because next-auth catches
       * the errors of the events. The system log must show the login also
       * then.
       */
      if (message.account?.provider === "discord") {
        try {
          await linkCitizenOfSignedInUser(
            { prisma },
            message.user.id,
            message.account.providerAccountId,
          );
        } catch (error) {
          log.error("Failed to link the citizen of the signed-in user", {
            userId: message.user.id,
            error,
          });
        }
      }

      await getApplicationContext().audit.create([
        {
          type: AuditEventType.USER_LOGIN_V3,
          data: {
            userId: message.user.id,
            userEmail: message.user.email,
            userName: message.user.name,
            /**
             * The profile of this event comes from `profile()` of the
             * provider and does not have `mfa_enabled`. The user comes from
             * the database after the sign-in callback, thus it has the
             * status of this login.
             */
            discordTwoFactorEnabled:
              message.user.discordTwoFactorEnabled ?? null,
          },
          createdById: message.user.id,
        },
      ]);
    },

    signOut: async (message) => {
      /**
       * `id` and `userId` DO exist on the session here. However, the types
       * won't be fixed for anything auth-related due to the pending migration
       * off of NextAuth.js.
       */
      const session = message.session as unknown as {
        id: string;
        userId: string;
      };

      await getApplicationContext().audit.create([
        {
          type: AuditEventType.USER_LOGOUT,
          data: {
            sessionId: session.id,
            userId: session.userId,
          },
          createdById: session.userId,
        },
      ]);
    },
  },
};

/**
 * Wrapper for `getServerSession` so that you don't need to import the `authOptions` in every file.
 *
 * @see https://next-auth.js.org/configuration/nextjs
 */
export const getServerAuthSession = () => getServerSession(authOptions);
