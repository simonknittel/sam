-- Anonymizes sensitive production data after it got mirrored to the local
-- database. See `docs/mirror-database.md` for more information.

-- The rows themselves have to stay because the session callback resolves the
-- citizen through `Account.providerAccountId`.
UPDATE "Account"
SET
	refresh_token = NULL,
	access_token = NULL,
	id_token = NULL,
	session_state = NULL;

UPDATE "User"
SET email = 'user_' || id || '@example.com'
WHERE email IS NOT NULL;

-- Some audit events (e.g. logins) duplicate the user's email address in their
-- JSON payload. The replacement matches the anonymized `User.email` since
-- `userId` refers to `User.id`.
UPDATE "AuditEvent"
SET data = jsonb_set(
	data,
	'{userEmail}',
	to_jsonb('user_' || coalesce(data ->> 'userId', 'unknown') || '@example.com')
)
WHERE data ? 'userEmail';
