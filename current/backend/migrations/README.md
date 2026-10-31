# Database migrations

`001_auth_sessions.sql` is the baseline migration for deployments created before
server-side auth sessions were introduced. Apply it once after the existing
schema has been created, using a MySQL account that can alter tables:

```bash
mysql -h "$MYSQL_HOST" -P "$MYSQL_PORT" -u "$MYSQL_USER" -p "$MYSQL_DATABASE" < migrations/versions/001_auth_sessions.sql
```

For a new installation, start the API once to create the full schema, then run
the migration. The application remains backward compatible with the prior
`users` table and never stores a plaintext refresh token.

The application startup also applies idempotent compatibility updates for
development databases created by earlier releases, including the academy
institution district and course start-date columns. This preserves existing
data; production deployments should still record equivalent schema changes in
the formal migration history.
