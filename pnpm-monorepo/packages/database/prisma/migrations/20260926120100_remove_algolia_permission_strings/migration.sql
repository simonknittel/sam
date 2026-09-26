-- The Spynet search does not use Algolia anymore, thus the "algolia"
-- permission has no function. Remove its permission strings from all roles.
DELETE FROM "PermissionString" WHERE "permissionString" LIKE 'algolia;%';
