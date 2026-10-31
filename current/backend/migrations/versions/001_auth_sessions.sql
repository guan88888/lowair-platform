-- Server-side, revocable refresh-token sessions. Do not store plaintext tokens.
CREATE TABLE IF NOT EXISTS auth_sessions (
    id VARCHAR(64) NOT NULL,
    user_id INTEGER NOT NULL,
    refresh_token_hash VARCHAR(64) NOT NULL,
    expires_at DATETIME NOT NULL,
    revoked_at DATETIME NULL,
    ip_hash VARCHAR(64) NULL,
    user_agent VARCHAR(255) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_auth_sessions_refresh_token_hash (refresh_token_hash),
    KEY ix_auth_sessions_user_id (user_id),
    KEY ix_auth_sessions_expires_at (expires_at),
    CONSTRAINT fk_auth_sessions_user_id FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
