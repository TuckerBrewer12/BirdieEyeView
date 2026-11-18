-- Migration 016: one row per signed-in session; an access token counts only while its row exists.
BEGIN;
CREATE TABLE IF NOT EXISTS users.sessions (
    jti UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON users.sessions (user_id);
COMMIT;
