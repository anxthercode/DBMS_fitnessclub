"""Accounts, revocable sessions, one-use email tokens and audit."""

from migrations.sql import execute

revision = "0002_auth"
down_revision = "0001_access_catalogue"
branch_labels = depends_on = None


def upgrade():
    execute("""
        CREATE TABLE users (
            id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            email TEXT NOT NULL UNIQUE CHECK (email = lower(btrim(email))),
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL CHECK (role IN ('CLIENT','TRAINER','ADMIN')) DEFAULT 'CLIENT',
            first_name TEXT NOT NULL CHECK (length(btrim(first_name)) BETWEEN 1 AND 80),
            last_name TEXT NOT NULL CHECK (length(btrim(last_name)) BETWEEN 1 AND 80),
            phone TEXT, locale TEXT NOT NULL CHECK (locale IN ('ru','en')) DEFAULT 'ru',
            is_active BOOLEAN NOT NULL DEFAULT true,
            email_verified_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
        );
        CREATE TABLE auth_sessions (
            token_hash BYTEA PRIMARY KEY CHECK (octet_length(token_hash)=32),
            user_id BIGINT NOT NULL REFERENCES users(id),
            created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
            expires_at TIMESTAMPTZ NOT NULL, revoked_at TIMESTAMPTZ,
            CHECK (expires_at > created_at)
        );
        CREATE INDEX auth_sessions_user_idx ON auth_sessions(user_id);
        CREATE INDEX auth_sessions_expiry_idx ON auth_sessions(expires_at);
        CREATE TABLE email_verification_tokens (
            token_hash BYTEA PRIMARY KEY CHECK (octet_length(token_hash)=32),
            user_id BIGINT NOT NULL REFERENCES users(id),
            created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
            expires_at TIMESTAMPTZ NOT NULL, used_at TIMESTAMPTZ, revoked_at TIMESTAMPTZ,
            CHECK (expires_at > created_at), CHECK (used_at IS NULL OR revoked_at IS NULL)
        );
        CREATE UNIQUE INDEX email_verification_live_idx ON email_verification_tokens(user_id)
            WHERE used_at IS NULL AND revoked_at IS NULL;
        CREATE TABLE password_reset_tokens (
            LIKE email_verification_tokens INCLUDING ALL,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
        CREATE TABLE auth_throttles (
            key BYTEA PRIMARY KEY, window_started TIMESTAMPTZ NOT NULL,
            attempts INTEGER NOT NULL CHECK (attempts > 0)
        );
        CREATE TABLE audit_logs (
            id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            actor_id BIGINT REFERENCES users(id), action TEXT NOT NULL,
            record_id BIGINT, created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
        );
        CREATE INDEX audit_logs_actor_idx ON audit_logs(actor_id, created_at);
    """)


def downgrade():
    execute(
        "DROP TABLE audit_logs, auth_throttles, password_reset_tokens, "
        "email_verification_tokens, auth_sessions, users"
    )
