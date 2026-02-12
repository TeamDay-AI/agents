---
name: mysql
description: Query and manage MySQL databases using mysql CLI. Connect to PlanetScale, AWS RDS, Google Cloud SQL, or any MySQL instance.
version: 1.0.0
allowed-tools: Bash
metadata:
  credentials:
    - MYSQL_URL
    - MYSQL_HOST
    - MYSQL_USER
    - MYSQL_PASSWORD
    - MYSQL_DATABASE
---

# MySQL Skill

Query and manage MySQL databases using the `mysql` CLI.

## Quick Start

```bash
# Using individual variables
mysql -h "$MYSQL_HOST" -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" -e "SELECT count(*) FROM users"
```

## Prerequisites

Configure credentials as Space environment variables.

| Variable | Description | Example |
|----------|-------------|---------|
| `MYSQL_HOST` | Database host | `db.example.com` |
| `MYSQL_USER` | Database user | `readonly` |
| `MYSQL_PASSWORD` | Database password | `secret123` |
| `MYSQL_DATABASE` | Database name | `myapp` |
| `MYSQL_PORT` | Port (optional, default 3306) | `3306` |

Or use a URL and parse it:

| Variable | Description | Example |
|----------|-------------|---------|
| `MYSQL_URL` | Full connection URL | `mysql://user:pass@host:3306/dbname` |

### Parse MYSQL_URL Helper

```bash
if [ -n "$MYSQL_URL" ]; then
  MYSQL_USER=$(echo "$MYSQL_URL" | sed -E 's|mysql://([^:]+):.*|\1|')
  MYSQL_PASSWORD=$(echo "$MYSQL_URL" | sed -E 's|mysql://[^:]+:([^@]+)@.*|\1|')
  MYSQL_HOST=$(echo "$MYSQL_URL" | sed -E 's|mysql://[^@]+@([^:/]+).*|\1|')
  MYSQL_PORT=$(echo "$MYSQL_URL" | sed -E 's|mysql://[^@]+@[^:]+:([0-9]+).*|\1|')
  MYSQL_DATABASE=$(echo "$MYSQL_URL" | sed -E 's|mysql://[^/]+/([^?]+).*|\1|')
  MYSQL_PORT="${MYSQL_PORT:-3306}"
fi
```

### Verify Connection

```bash
mysql -h "$MYSQL_HOST" -P "${MYSQL_PORT:-3306}" -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" -e "SELECT version()"
```

## Core Recipes

### Run a Query

```bash
mysql -h "$MYSQL_HOST" -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" -e "SELECT * FROM users LIMIT 10"
```

### List Tables

```bash
mysql -h "$MYSQL_HOST" -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" -e "SHOW TABLES"
```

### Describe Table

```bash
mysql -h "$MYSQL_HOST" -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" -e "DESCRIBE users"
```

### Show Table Sizes

```bash
mysql -h "$MYSQL_HOST" -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" -e "
SELECT table_name,
  ROUND(data_length/1024/1024, 2) AS data_mb,
  ROUND(index_length/1024/1024, 2) AS index_mb,
  table_rows
FROM information_schema.tables
WHERE table_schema = '$MYSQL_DATABASE'
ORDER BY data_length DESC"
```

### Count Rows

```bash
mysql -h "$MYSQL_HOST" -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" -e "SELECT count(*) FROM users"
```

## Export & Import

### Export to CSV

```bash
mysql -h "$MYSQL_HOST" -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" -B -e "SELECT * FROM users" | tr '\t' ',' > users.csv
```

### Export as JSON (MySQL 8+)

```bash
mysql -h "$MYSQL_HOST" -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" -N -e "
SELECT JSON_ARRAYAGG(JSON_OBJECT('id', id, 'email', email, 'name', name))
FROM users LIMIT 100" > users.json
```

### Import SQL Dump

```bash
mysql -h "$MYSQL_HOST" -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" < dump.sql
```

### Import CSV (via LOAD DATA LOCAL)

```bash
mysql -h "$MYSQL_HOST" -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" --local-infile -e "
LOAD DATA LOCAL INFILE 'data.csv' INTO TABLE users
FIELDS TERMINATED BY ',' ENCLOSED BY '\"'
LINES TERMINATED BY '\n'
IGNORE 1 ROWS (name, email)"
```

## Schema Operations

### Show Create Table

```bash
mysql -h "$MYSQL_HOST" -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" -e "SHOW CREATE TABLE users\G"
```

### List Indexes

```bash
mysql -h "$MYSQL_HOST" -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" -e "SHOW INDEX FROM users"
```

### Show All Databases

```bash
mysql -h "$MYSQL_HOST" -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" -e "SHOW DATABASES"
```

## Write Operations

### Insert

```bash
mysql -h "$MYSQL_HOST" -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" -e "INSERT INTO users (name, email) VALUES ('John', 'john@example.com')"
```

### Update

```bash
mysql -h "$MYSQL_HOST" -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" -e "UPDATE users SET name = 'Jane' WHERE id = 1"
```

### Delete

```bash
mysql -h "$MYSQL_HOST" -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" -e "DELETE FROM users WHERE id = 1"
```

## Managed Service Setup

### PlanetScale
- Host: `aws.connect.psdb.cloud`
- Requires `--ssl-mode=VERIFY_IDENTITY --ssl-ca=/etc/ssl/certs/ca-certificates.crt`
- Get credentials: PlanetScale Dashboard — Database — Connect — Create password

### AWS RDS
- Host: `[instance].[region].rds.amazonaws.com`
- Default port: 3306
- Add `--ssl-mode=REQUIRED` for encrypted connections

### Google Cloud SQL
- Use Cloud SQL Proxy or authorized networks
- Host: Public IP from Cloud Console

### Self-Hosted
- Use host IP/domain, standard port 3306

## Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| `Can't connect to MySQL server` | Host unreachable | Check MYSQL_HOST, firewall rules |
| `Access denied` | Wrong credentials | Verify MYSQL_USER/MYSQL_PASSWORD |
| `Unknown database` | Database doesn't exist | Check MYSQL_DATABASE name |
| `SSL connection error` | SSL required | Add `--ssl-mode=REQUIRED` flag |
| `Table doesn't exist` | Wrong table name | Run `SHOW TABLES` first |

## Tips

- **Always use `LIMIT`** when exploring — avoid dumping entire tables
- **Use `-e` flag** for single queries, pipe from files for multi-statement SQL
- **Use `\G`** suffix instead of `;` for vertical display of wide rows
- **Use `-B` flag** for batch mode (tab-separated, no table borders) — good for scripting
- **Use `-N` flag** to suppress column headers
- **Quote passwords** with `-p"$MYSQL_PASSWORD"` (no space after `-p`)
- **SSL**: Most cloud providers require SSL — add `--ssl-mode=REQUIRED`
