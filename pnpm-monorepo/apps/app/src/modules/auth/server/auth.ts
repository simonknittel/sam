import { prisma } from "@/db";
import { env } from "@/env";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { getDiscordAvatar } from "@/modules/discord/utils/getDiscordAvatar";
import { getGuildMember } from "@/modules/discord/utils/getGuildMember";
import { log } from "@/modules/logging";
import { triggerNotifications } from "@/modules/notifications/utils/triggerNotification";
import { getUserById } from "@/modules/users/queries/getUserById";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type {
  User as DatabaseUser,
  Entity,
  RoleAssignment,
} from "@sam-monorepo/database/client";
import {
  getPermissionSetsByRoles,
  resolveEffectiveRoles,
  type PermissionSet,
} from "@sam-monorepo/permissions";
import {
  getServerSession,
  type DefaultSession,
  type NextAuthOptions,
} from "next-auth";
import type { AdapterUser } from "next-auth/adapters";
import DiscordProvider, {
  type DiscordProfile,
} from "next-auth/providers/discord";
import { cookies } from "next/headers";
import { serializeError } from "serialize-error";
import { type UserRole } from "../../../types";

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
      role: UserRole;
      emailVerified: Date | null;
    } & DefaultSession["user"];
    discordId: string;
    givenPermissionSets: PermissionSet[];
    entity:
      | (Entity & {
          roleAssignments: RoleAssignment[];
        })
      | null;
    /**
     * True when this session was built for another user which an admin is
     * assuming via the `assume_user` cookie. The logged-in user behind the
     * session token is still the admin.
     */
    assumedByAdmin: boolean;
  }

  interface User {
    role?: UserRole;
    lastSeenAt?: Date;
  }
}

const adapter = PrismaAdapter(prisma);

const maxAge = 60 * 60 * 24 * 31; // 31 days

/**
 * Admins can assume another user via the `assume_user` cookie (set by the
 * AdminEnabler). The session is then built entirely from the assumed user,
 * so the whole app behaves as if they were logged in — including audit
 * attribution of mutations. The cookie is only honored when the user behind
 * the session token actually has the admin role.
 */
const getAssumedUser = async (
  sessionUser: AdapterUser,
): Promise<DatabaseUser | null> => {
  if (sessionUser.role !== "admin") return null;

  const assumedUserId = (await cookies()).get("assume_user")?.value;
  if (!assumedUserId || assumedUserId === sessionUser.id) return null;

  /**
   * The session below is resolved through the user's Discord account. A user
   * without one can't be assumed and the cookie gets ignored, since a session
   * failing to resolve would break every request of the admin until the
   * cookie expires.
   */
  return prisma.user.findFirst({
    where: {
      id: assumedUserId,
      accounts: {
        some: {},
      },
    },
  });
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

      const discordAccount = await prisma.account.findFirst({
        where: {
          userId: effectiveUser.id,
        },
      });

      const entity = await prisma.entity.findUnique({
        where: {
          discordId: discordAccount!.providerAccountId,
        },
        include: {
          roleAssignments: {
            include: {
              role: {
                include: {
                  permissionStrings: true,
                  inherits: {
                    include: {
                      permissionStrings: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      let givenPermissionSets: PermissionSet[] = [];
      if (entity) {
        givenPermissionSets = getPermissionSetsByRoles(
          resolveEffectiveRoles(entity.roleAssignments),
        );
      }

      // Only update lastSeenAt once a day. Skipped while assuming another
      // user so their presence data doesn't get falsified.
      if (
        !assumedUser &&
        user.lastSeenAt?.toLocaleDateString("de-DE", {
          timeZone: "Europe/Berlin",
        }) !==
          new Date().toLocaleDateString("de-DE", {
            timeZone: "Europe/Berlin",
          })
      ) {
        try {
          await prisma.user.update({
            where: {
              id: user.id,
            },
            data: {
              lastSeenAt: new Date(),
            },
          });

          await createAuditEvents([
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
        } catch (error) {
          log.warn("Failed to update user's lastSeenAt", {
            userId: user.id,
            error,
          });
        }
      }

      return {
        ...session,
        user: {
          ...session.user,
          id: effectiveUser.id,
          name: effectiveUser.name,
          email: effectiveUser.email,
          image: effectiveUser.image,
          role: effectiveUser.role as UserRole,
          emailVerified: effectiveUser.emailVerified,
        },
        discordId: discordAccount!.providerAccountId,
        givenPermissionSets,
        entityId: entity?.id,
        entity,
        assumedByAdmin: Boolean(assumedUser),
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

      const existingUser = await getUserById(user.id);

      if (!account) throw new Error("account is missing");
      if (!account.access_token)
        throw new Error("account.access_token is missing");

      if (existingUser) {
        if (existingUser.bannedAt) {
          log.info("Banned user attempted to log in", {
            userId: user.id,
          });

          await createAuditEvents([
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

        await prisma.$transaction([
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
              updatedAt: new Date(),
            },
          }),
        ]);
      } else {
        // New user
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

        user.name = null;

        if (!("id" in profile) || !profile.id)
          throw new Error("profile.id is missing");

        const latestConfirmedDiscordIdEntityLog =
          await prisma.entityLog.findFirst({
            where: {
              type: "discord-id",
              content: profile.id,
              attributes: {
                some: {
                  key: "confirmed",
                  value: "confirmed",
                },
              },
            },
            orderBy: {
              createdAt: "desc",
            },
          });

        if (latestConfirmedDiscordIdEntityLog) {
          const latestConfirmedHandleEntityLog =
            await prisma.entityLog.findFirst({
              where: {
                entityId: latestConfirmedDiscordIdEntityLog.entityId,
                type: "handle",
                attributes: {
                  some: {
                    key: "confirmed",
                    value: "confirmed",
                  },
                },
              },
              orderBy: {
                createdAt: "desc",
              },
            });

          user.name =
            latestConfirmedHandleEntityLog?.content ||
            latestConfirmedDiscordIdEntityLog.entityId;
        }
      }

      return true;
    },
  },

  adapter: {
    ...adapter,
    createUser: async (user: AdapterUser) => {
      const createdUser = await adapter.createUser!(user);

      try {
        await triggerNotifications([
          {
            type: "EmailConfirmation",
            payload: {
              userId: createdUser.id,
              userEmail: user.email,
            },
          },
        ]);
      } catch (error) {
        log.error("Failed to request email confirmation for created user", {
          userId: createdUser.id,
          error: serializeError(error),
        });
      }

      return createdUser;
    },
  },

  providers: [
    DiscordProvider({
      clientId: env.DISCORD_CLIENT_ID,
      clientSecret: env.DISCORD_CLIENT_SECRET,
      authorization:
        "https://discord.com/api/oauth2/authorize?scope=identify+email+guilds.members.read",
    }),
  ],

  pages: {
    error: "/",
    newUser: "/email-confirmation?new-user=true",
  },

  session: {
    maxAge,
    updateAge: maxAge * 2, // Make sure `updateAge` is bigger than `maxAge` so that the session actually expires at some point and then a refreshed authentication with the identity provider is forced
  },

  events: {
    signIn: async (message) => {
      await createAuditEvents([
        {
          type: AuditEventType.USER_LOGIN_V2,
          data: {
            userId: message.user.id,
            userEmail: message.user.email,
            userName: message.user.name,
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

      await createAuditEvents([
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
