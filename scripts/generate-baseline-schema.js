import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const { Client } = pg;

const DB_CONFIG = {
    host: process.env.SUPABASE_DB_HOST || 'aws-1-ap-northeast-2.pooler.supabase.com',
    port: Number(process.env.SUPABASE_DB_PORT) || 6543,
    user: process.env.SUPABASE_DB_USER || 'postgres.ysitzlbjoueorndmnmdf',
    password: process.env.SUPABASE_DB_PASSWORD || 'GiDv0ziY5w7SVyGl',
    database: process.env.SUPABASE_DB_NAME || 'postgres',
    ssl: { rejectUnauthorized: false }
};

async function generateBaseline() {
    const client = new Client(DB_CONFIG);
    await client.connect();

    console.log('Generating complete baseline schema from live PostgreSQL database...');

    const sections = [];

    // Header
    sections.push(`-- AU-JAS LMS Production Database Baseline Schema
-- Target PostgreSQL Version: 17+
-- Authoritative Consolidated Source of Truth`);

    // 1. Extensions
    sections.push(`\n-- ============================================================================
-- 1. EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

    // 2. Custom Types / Enums
    const enumsRes = await client.query(`
        SELECT t.typname AS enum_name,
               e.enumlabel AS enum_value
        FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname IN ('public')
        ORDER BY t.typname, e.enumsortorder;
    `);

    const enumMap = new Map();
    for (const row of enumsRes.rows) {
        if (!enumMap.has(row.enum_name)) {
            enumMap.set(row.enum_name, []);
        }
        enumMap.get(row.enum_name).push(row.enum_value);
    }

    const enumStatements = Array.from(enumMap.entries()).map(([enumName, values]) => {
        const quotedValues = values.map(v => `'${v.replace(/'/g, "''")}'`).join(', ');
        return `DO $$ BEGIN
    CREATE TYPE public.${enumName} AS ENUM (${quotedValues});
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;`;
    });

    sections.push(`\n-- ============================================================================
-- 2. ENUM TYPES
-- ============================================================================
${enumStatements.join('\n\n')}`);

    // 3. Tables DDL
    const tablesRes = await client.query(`
        SELECT c.relname AS table_name,
               c.oid AS table_oid
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relkind = 'r'
        ORDER BY c.relname;
    `);

    const tableDDLs = [];
    for (const table of tablesRes.rows) {
        const colsRes = await client.query(`
            SELECT a.attname AS col_name,
                   pg_catalog.format_type(a.atttypid, a.atttypmod) AS col_type,
                   a.attnotnull AS is_not_null,
                   pg_get_expr(d.adbin, d.adrelid) AS col_default
            FROM pg_attribute a
            LEFT JOIN pg_attrdef d ON a.attrelid = d.adrelid AND a.attnum = d.adnum
            WHERE a.attrelid = $1
              AND a.attnum > 0
              AND NOT a.attisdropped
            ORDER BY a.attnum;
        `, [table.table_oid]);

        const colDefs = colsRes.rows.map(col => {
            let def = `    ${col.col_name} ${col.col_type}`;
            if (col.col_default) {
                def += ` DEFAULT ${col.col_default}`;
            }
            if (col.is_not_null) {
                def += ' NOT NULL';
            }
            return def;
        });

        // Primary Key constraint
        const pkRes = await client.query(`
            SELECT conname, pg_get_constraintdef(oid) as condef
            FROM pg_constraint
            WHERE conrelid = $1 AND contype = 'p';
        `, [table.table_oid]);

        if (pkRes.rows.length > 0) {
            colDefs.push(`    CONSTRAINT ${pkRes.rows[0].conname} ${pkRes.rows[0].condef}`);
        }

        // Unique and Check constraints
        const otherCons = await client.query(`
            SELECT conname, pg_get_constraintdef(oid) as condef
            FROM pg_constraint
            WHERE conrelid = $1 AND contype IN ('u', 'c');
        `, [table.table_oid]);

        for (const con of otherCons.rows) {
            colDefs.push(`    CONSTRAINT ${con.conname} ${con.condef}`);
        }

        const tableSql = `CREATE TABLE IF NOT EXISTS public.${table.table_name} (\n${colDefs.join(',\n')}\n);`;
        tableDDLs.push(tableSql);
    }

    sections.push(`\n-- ============================================================================
-- 3. TABLES DEFINITION
-- ============================================================================
${tableDDLs.join('\n\n')}`);

    // 4. Indexes
    const indexesRes = await client.query(`
        SELECT indexdef
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND indexname NOT LIKE '%_pkey'
        ORDER BY tablename, indexname;
    `);

    const indexStatements = indexesRes.rows.map(r => `${r.indexdef};`);
    sections.push(`\n-- ============================================================================
-- 4. INDEXES
-- ============================================================================
${indexStatements.join('\n')}`);

    // 5. Foreign Key Constraints
    const fkRes = await client.query(`
        SELECT c.conrelid::regclass::text AS tablename,
               c.conname,
               pg_get_constraintdef(c.oid) AS condef
        FROM pg_constraint c
        JOIN pg_namespace n ON n.oid = c.connamespace
        WHERE n.nspname = 'public' AND c.contype = 'f'
        ORDER BY tablename, c.conname;
    `);

    const fkStatements = fkRes.rows.map(r =>
        `DO $$ BEGIN
    ALTER TABLE ${r.tablename} ADD CONSTRAINT ${r.conname} ${r.condef};
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;`
    );

    sections.push(`\n-- ============================================================================
-- 5. FOREIGN KEY CONSTRAINTS
-- ============================================================================
${fkStatements.join('\n\n')}`);

    // 6. RLS Enable
    const rlsEnableStatements = tablesRes.rows.map(t =>
        `ALTER TABLE public.${t.table_name} ENABLE ROW LEVEL SECURITY;`
    );
    sections.push(`\n-- ============================================================================
-- 6. ROW LEVEL SECURITY (RLS) ACTIVATION
-- ============================================================================
${rlsEnableStatements.join('\n')}`);

    // 7. Stored Procedures and Functions
    const funcsRes = await client.query(`
        SELECT p.proname,
               pg_get_functiondef(p.oid) AS definition
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.prokind = 'f'
        ORDER BY p.proname;
    `);

    const funcStatements = funcsRes.rows.map(f => `${f.definition};`);
    sections.push(`\n-- ============================================================================
-- 7. STORED PROCEDURES & DATABASE FUNCTIONS (fn_*)
-- ============================================================================
${funcStatements.join('\n\n')}`);

    // 8. RLS Policies
    const policiesRes = await client.query(`
        SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
        FROM pg_policies
        WHERE schemaname = 'public'
        ORDER BY tablename, policyname;
    `);

    const policyStatements = policiesRes.rows.map(p => {
        const roles = Array.isArray(p.roles)
            ? p.roles.join(', ')
            : (typeof p.roles === 'string' ? p.roles.replace(/[{}]/g, '') : 'public');
        let pol = `DROP POLICY IF EXISTS "${p.policyname}" ON public.${p.tablename};\nCREATE POLICY "${p.policyname}" ON public.${p.tablename} FOR ${p.cmd} TO ${roles}`;
        if (p.qual) {
            pol += ` USING (${p.qual})`;
        }
        if (p.with_check) {
            pol += ` WITH CHECK (${p.with_check})`;
        }
        return `${pol};`;
    });

    sections.push(`\n-- ============================================================================
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
${policyStatements.join('\n\n')}`);

    // 9. Triggers
    const triggersRes = await client.query(`
        SELECT t.tgname AS trigger_name,
               c.relname AS table_name,
               pg_get_triggerdef(t.oid) AS trigger_def
        FROM pg_trigger t
        JOIN pg_class c ON c.oid = t.tgrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND NOT t.tgisinternal
        ORDER BY c.relname, t.tgname;
    `);

    const triggerStatements = triggersRes.rows.map(t =>
        `DROP TRIGGER IF EXISTS ${t.trigger_name} ON public.${t.table_name};\n${t.trigger_def};`
    );

    sections.push(`\n-- ============================================================================
-- 9. TRIGGERS
-- ============================================================================
${triggerStatements.join('\n\n')}`);

    // Combine all sections into full SQL
    const fullSql = sections.join('\n\n');

    // Ensure directories exist
    const migrationsDir = path.resolve('supabase/migrations');
    if (!fs.existsSync(migrationsDir)) {
        fs.mkdirSync(migrationsDir, { recursive: true });
    }

    const baselineMigrationPath = path.join(migrationsDir, '20260101000000_baseline_schema.sql');
    const schemaLivePath = path.resolve('supabase/schema_live.sql');

    fs.writeFileSync(baselineMigrationPath, fullSql, 'utf8');
    fs.writeFileSync(schemaLivePath, fullSql, 'utf8');

    console.log(`Baseline schema successfully generated:
- ${baselineMigrationPath} (${(fullSql.length / 1024).toFixed(1)} KB)
- ${schemaLivePath} (${(fullSql.length / 1024).toFixed(1)} KB)`);

    await client.end();
}

generateBaseline().catch(err => {
    console.error('Error generating baseline schema:', err);
    process.exit(1);
});
