BEGIN;
CREATE TABLE IF NOT EXISTS users (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), username VARCHAR(30) UNIQUE NOT NULL,
 email VARCHAR(254) UNIQUE NOT NULL, password_hash TEXT NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;
-- Preserve the existing users.id type (UUID or integer) when upgrading a database.
DO $migration$
DECLARE user_id_type TEXT;
BEGIN
 SELECT format_type(atttypid, atttypmod) INTO user_id_type
 FROM pg_attribute WHERE attrelid = 'users'::regclass AND attname = 'id';
 EXECUTE format($table$CREATE TABLE IF NOT EXISTS character_sheets (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id %s NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 system TEXT NOT NULL, name VARCHAR(80) NOT NULL, sheet_data JSONB NOT NULL DEFAULT '{}',
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)$table$, user_id_type);
 EXECUTE format($table$CREATE TABLE IF NOT EXISTS email_verifications (
 user_id %s PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 token_hash TEXT UNIQUE NOT NULL, expires_at TIMESTAMPTZ NOT NULL, sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)$table$, user_id_type);
 EXECUTE format($table$CREATE TABLE IF NOT EXISTS campaigns (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), owner_id %s NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 name VARCHAR(120) NOT NULL, description TEXT NOT NULL DEFAULT '', data JSONB NOT NULL DEFAULT '{}',
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)$table$, user_id_type);
 EXECUTE format($table$CREATE TABLE IF NOT EXISTS campaign_players (
 campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
 user_id %s NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY(campaign_id, user_id)
)$table$, user_id_type);
END $migration$;
-- Registros legados de confirmação por link não são códigos de seis dígitos.
ALTER TABLE email_verifications ADD COLUMN IF NOT EXISTS attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE email_verifications ADD COLUMN IF NOT EXISTS verification_type TEXT NOT NULL DEFAULT 'link';
CREATE INDEX IF NOT EXISTS campaign_players_user_idx ON campaign_players(user_id);
COMMIT;
