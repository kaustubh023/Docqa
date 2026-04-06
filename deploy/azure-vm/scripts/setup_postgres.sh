#!/usr/bin/env bash
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
    echo "Run as root: sudo bash $0"
    exit 1
fi

DB_NAME="${DB_NAME:-docqa_db}"
DB_USER="${DB_USER:-docqa_user}"
DB_PASSWORD="${DB_PASSWORD:-change-me}"

echo "==> Configuring PostgreSQL role/database"
sudo -u postgres psql <<SQL
DO \$\$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${DB_USER}') THEN
      CREATE ROLE ${DB_USER} LOGIN PASSWORD '${DB_PASSWORD}';
   ELSE
      ALTER ROLE ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';
   END IF;
END
\$\$;
SQL

sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1 || \
    sudo -u postgres createdb -O "${DB_USER}" "${DB_NAME}"

sudo -u postgres psql <<SQL
ALTER ROLE ${DB_USER} SET client_encoding TO 'utf8';
ALTER ROLE ${DB_USER} SET default_transaction_isolation TO 'read committed';
ALTER ROLE ${DB_USER} SET timezone TO 'UTC';
SQL

echo "PostgreSQL setup complete for DB=${DB_NAME}, USER=${DB_USER}"
