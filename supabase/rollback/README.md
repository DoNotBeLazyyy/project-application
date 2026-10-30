# Rollback scripts

Each `<migration>.down.sql` here reverses the migration of the same name in
`../migrations/`. They were generated from the live definitions right before the
forward migration was applied, so they restore the exact prior state (function
bodies and EXECUTE grants), and each runs as a single transaction.

Apply newest first:

```bash
psql "<connection string>" -v ON_ERROR_STOP=1 -f supabase/rollback/<migration>.down.sql
```

See `ROLLBACK-20261030.md` in the repo root for the full release rollback runbook.
