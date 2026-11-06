-- Migration 016: link external sign-in identities to app users; one-time Apple sign-in nonces

CREATE TABLE IF NOT EXISTS users.user_identities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    provider VARCHAR(32) NOT NULL CHECK (provider IN ('google', 'apple')),
    provider_user_id VARCHAR(255) NOT NULL,
    provider_email VARCHAR(255),
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (provider, provider_user_id),
    UNIQUE (user_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_user_identities_user_id
    ON users.user_identities (user_id);

CREATE INDEX IF NOT EXISTS idx_user_identities_provider_email
    ON users.user_identities (provider, provider_email);

DROP TRIGGER IF EXISTS trg_user_identities_updated_at ON users.user_identities;
CREATE TRIGGER trg_user_identities_updated_at
    BEFORE UPDATE ON users.user_identities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- One-time nonces for Sign in with Apple, stored by SHA-256 hash.
CREATE TABLE IF NOT EXISTS users.auth_nonces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider VARCHAR(32) NOT NULL CHECK (provider IN ('apple')),
    nonce_hash CHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_nonces_expires_at
    ON users.auth_nonces (expires_at);
