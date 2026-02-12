---
name: postgresql
description: Query and manage PostgreSQL databases using psql CLI. Connect to Supabase, Neon, AWS RDS, Railway, or any PostgreSQL instance via connection string.
version: 1.0.0
allowed-tools: Bash
metadata:
  credentials:
    - DATABASE_URL
---

# PostgreSQL Skill

Query and manage PostgreSQL databases directly using `psql` CLI.

## Quick Start

```bash
# Run a query
psql "$DATABASE_URL" -c "SELECT count(*) FROM users"

# List all tables
psql "$DATABASE_URL" -c "\dt"
```

## Prerequisites

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/dbname?sslmode=require` |

### Verify Connection

```bash
psql "$DATABASE_URL" -c "SELECT version()"
```

If this fails, check:
1. `DATABASE_URL` is set in Space environment variables
2. Connection string format is correct
3. SSL mode is appropriate for your provider

## Core Recipes

### Run a Query

```bash
psql "$DATABASE_URL" -c "SELECT * FROM users LIMIT 10"
```

### List Tables

```bash
psql "$DATABASE_URL" -c "\dt"
```

### Describe Table Structure

```bash
psql "$DATABASE_URL" -c "\d users"
```

### List Columns with Types

```bash
psql "$DATABASE_URL" -c "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position"
```

### Count Rows

```bash
psql "$DATABASE_URL" -c "SELECT count(*) FROM users"
```

### Search Data

```bash
psql "$DATABASE_URL" -c "SELECT * FROM users WHERE email LIKE '%@example.com' LIMIT 20"
```

## Export & Import

### Export to CSV

```bash
psql "$DATABASE_URL" -c "COPY (SELECT * FROM users) TO STDOUT CSV HEADER" > users.csv
```

### Export Query Results to CSV

```bash
psql "$DATABASE_URL" -c "COPY (SELECT id, email, created_at FROM users WHERE created_at > '2024-01-01') TO STDOUT CSV HEADER" > recent_users.csv
```

### Import from CSV

```bash
psql "$DATABASE_URL" -c "\copy users(name, email) FROM 'import.csv' CSV HEADER"
```

### Export as JSON

```bash
psql "$DATABASE_URL" -t -A -c "SELECT json_agg(t) FROM (SELECT * FROM users LIMIT 100) t" > users.json
```

### Export Single Row as JSON

```bash
psql "$DATABASE_URL" -t -A -c "SELECT row_to_json(u) FROM users u WHERE id = 1"
```

## Schema Operations

### Dump Full Schema

```bash
pg_dump --schema-only "$DATABASE_URL" > schema.sql
```

### Dump Single Table Schema

```bash
pg_dump --schema-only -t users "$DATABASE_URL"
```

### List All Schemas

```bash
psql "$DATABASE_URL" -c "\dn"
```

### List Indexes

```bash
psql "$DATABASE_URL" -c "\di"
```

### Table Sizes

```bash
psql "$DATABASE_URL" -c "SELECT relname AS table, pg_size_pretty(pg_total_relation_size(relid)) AS size FROM pg_catalog.pg_statio_user_tables ORDER BY pg_total_relation_size(relid) DESC"
```

## Formatting Options

### Expanded Output (vertical)

```bash
psql "$DATABASE_URL" -c "\x on" -c "SELECT * FROM users LIMIT 1"
```

### No Headers (for scripting)

```bash
psql "$DATABASE_URL" -t -A -c "SELECT email FROM users"
```

### Tab-Separated Output

```bash
psql "$DATABASE_URL" -A -F $'\t' -c "SELECT * FROM users LIMIT 10"
```

### HTML Output

```bash
psql "$DATABASE_URL" -H -c "SELECT * FROM users LIMIT 10" > users.html
```

## Write Operations

### Insert Data

```bash
psql "$DATABASE_URL" -c "INSERT INTO users (name, email) VALUES ('John', 'john@example.com') RETURNING id"
```

### Update Data

```bash
psql "$DATABASE_URL" -c "UPDATE users SET name = 'Jane' WHERE id = 1 RETURNING *"
```

### Delete Data

```bash
psql "$DATABASE_URL" -c "DELETE FROM users WHERE id = 1 RETURNING *"
```

### Create Table

```bash
psql "$DATABASE_URL" -c "CREATE TABLE IF NOT EXISTS reports (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
)"
```

## Managed Service Connection Strings

### Supabase
```
postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
```
Find in: Supabase Dashboard — Settings — Database — Connection string

### Neon
```
postgresql://[user]:[password]@[endpoint].neon.tech/[database]?sslmode=require
```
Find in: Neon Console — Connection Details

### AWS RDS
```
postgresql://[user]:[password]@[instance].rds.amazonaws.com:5432/[database]?sslmode=require
```
Find in: AWS Console — RDS — Instances — Connectivity

### Railway
```
postgresql://[user]:[password]@[host].railway.internal:5432/railway
```
Find in: Railway Dashboard — PostgreSQL service — Connect

### Self-Hosted
```
postgresql://[user]:[password]@[host]:[port]/[database]
```

## Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| `connection refused` | Host unreachable | Check host/port, firewall rules |
| `password authentication failed` | Wrong credentials | Verify DATABASE_URL |
| `SSL off` / `SSL required` | SSL mismatch | Add `?sslmode=require` to URL |
| `relation does not exist` | Wrong table name | Run `\dt` to list tables |
| `permission denied` | Insufficient privileges | Check database user permissions |
| `too many connections` | Connection limit hit | Use connection pooler (e.g., Supabase pooler port 6543) |

## Tips

- **Always use `LIMIT`** when exploring data to avoid dumping huge tables
- **Use `\x on`** for wide tables — switches to vertical display
- **Use `RETURNING *`** on INSERT/UPDATE/DELETE to see affected rows
- **Use `-t -A`** flags for clean output in scripts (no headers, no alignment)
- **Use `pg_dump --schema-only`** to understand a database before querying
- **Connection pooling**: For Supabase, use port 6543 (pooler) instead of 5432 (direct)
- **SSL**: Most managed services require `?sslmode=require` in the URL
