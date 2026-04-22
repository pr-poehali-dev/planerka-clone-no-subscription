ALTER TABLE users ALTER COLUMN email SET DEFAULT '';
UPDATE users SET email = '' WHERE email IS NULL;
