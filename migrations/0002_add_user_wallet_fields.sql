-- Adds Privy/NFT-ready user metadata without changing existing order ownership.
ALTER TABLE users ADD COLUMN privy_user_id TEXT;
ALTER TABLE users ADD COLUMN wallet_address TEXT;

UPDATE users
SET privy_user_id = id
WHERE privy_user_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_privy_user_id ON users(privy_user_id);
