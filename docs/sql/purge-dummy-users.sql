CREATE OR REPLACE FUNCTION public.fn_purge_dummy_users(p_apply BOOLEAN DEFAULT FALSE, p_email_pattern TEXT DEFAULT 'dummy[_]user[_]%@example.com')
RETURNS TABLE (action TEXT, target TEXT, rows_affected BIGINT)
LANGUAGE plpgsql
AS $$
DECLARE
    v_changed BOOLEAN := TRUE;
    v_rec RECORD;
    v_count BIGINT;
    v_iterations INT := 0;
BEGIN
    CREATE TEMP TABLE IF NOT EXISTS _purge_plan (
        tbl TEXT NOT NULL,
        id UUID NOT NULL,
        depth INT NOT NULL,
        PRIMARY KEY (tbl, id)
    ) ON COMMIT DROP;

    CREATE TEMP TABLE IF NOT EXISTS _purge_result (
        action TEXT NOT NULL,
        target TEXT NOT NULL,
        rows_affected BIGINT NOT NULL
    ) ON COMMIT DROP;

    DELETE FROM _purge_plan;
    DELETE FROM _purge_result;

    INSERT INTO _purge_plan (tbl, id, depth)
    SELECT 'public.users', u.id, 0
    FROM public.users u
    WHERE u.email LIKE p_email_pattern;

    WHILE v_changed AND v_iterations < 50 LOOP
        v_changed := FALSE;
        v_iterations := v_iterations + 1;

        FOR v_rec IN
            SELECT (con.conrelid::regclass)::TEXT AS child_tbl,
                   ac.attname AS child_col,
                   (con.confrelid::regclass)::TEXT AS parent_tbl
            FROM pg_constraint con
            JOIN pg_attribute ac ON ac.attrelid = con.conrelid AND ac.attnum = con.conkey[1]
            JOIN pg_attribute ap ON ap.attrelid = con.confrelid AND ap.attnum = con.confkey[1]
            WHERE con.contype = 'f'
                AND array_length(con.conkey, 1) = 1
                AND ap.attname = 'id'
                AND ac.attnotnull
                AND con.connamespace = 'public'::regnamespace
                AND EXISTS (
                    SELECT 1 FROM pg_attribute pk
                    WHERE pk.attrelid = con.conrelid
                        AND pk.attname = 'id'
                        AND pk.atttypid = 'uuid'::regtype
                        AND pk.attnum > 0
                )
        LOOP
            EXECUTE format(
                'INSERT INTO _purge_plan (tbl, id, depth)
                 SELECT %L, c.id, p.depth + 1
                 FROM %s c
                 JOIN _purge_plan p ON p.tbl = %L AND p.id = c.%I
                 WHERE p.depth < 40
                 ON CONFLICT (tbl, id) DO UPDATE SET depth = EXCLUDED.depth
                 WHERE _purge_plan.depth < EXCLUDED.depth',
                v_rec.child_tbl, v_rec.child_tbl, v_rec.parent_tbl, v_rec.child_col
            );
            GET DIAGNOSTICS v_count = ROW_COUNT;
            IF v_count > 0 THEN
                v_changed := TRUE;
            END IF;
        END LOOP;
    END LOOP;

    IF v_iterations >= 50 THEN
        RAISE EXCEPTION 'fn_purge_dummy_users: dependency walk did not converge';
    END IF;

    FOR v_rec IN
        SELECT (con.conrelid::regclass)::TEXT AS child_tbl,
               ac.attname AS child_col,
               (con.confrelid::regclass)::TEXT AS parent_tbl
        FROM pg_constraint con
        JOIN pg_attribute ac ON ac.attrelid = con.conrelid AND ac.attnum = con.conkey[1]
        JOIN pg_attribute ap ON ap.attrelid = con.confrelid AND ap.attnum = con.confkey[1]
        WHERE con.contype = 'f'
            AND array_length(con.conkey, 1) = 1
            AND ap.attname = 'id'
            AND NOT ac.attnotnull
            AND con.connamespace = 'public'::regnamespace
            AND EXISTS (SELECT 1 FROM _purge_plan p WHERE p.tbl = (con.confrelid::regclass)::TEXT)
    LOOP
        IF p_apply THEN
            EXECUTE format(
                'UPDATE %s c SET %I = NULL
                 WHERE c.%I IN (SELECT p.id FROM _purge_plan p WHERE p.tbl = %L)
                     AND NOT EXISTS (SELECT 1 FROM _purge_plan q WHERE q.tbl = %L AND q.id = c.id)',
                v_rec.child_tbl, v_rec.child_col, v_rec.child_col, v_rec.parent_tbl, v_rec.child_tbl
            );
        ELSE
            EXECUTE format(
                'SELECT count(*) FROM %s c
                 WHERE c.%I IN (SELECT p.id FROM _purge_plan p WHERE p.tbl = %L)
                     AND NOT EXISTS (SELECT 1 FROM _purge_plan q WHERE q.tbl = %L AND q.id = c.id)',
                v_rec.child_tbl, v_rec.child_col, v_rec.parent_tbl, v_rec.child_tbl
            ) INTO v_count;
        END IF;

        IF p_apply THEN
            GET DIAGNOSTICS v_count = ROW_COUNT;
        END IF;

        IF v_count > 0 THEN
            INSERT INTO _purge_result (action, target, rows_affected)
            VALUES ('detach', v_rec.child_tbl || '.' || v_rec.child_col, v_count);
        END IF;
    END LOOP;

    IF p_apply THEN
        UPDATE public.sections s
        SET faculty_id = NULL
        WHERE s.faculty_id IN (SELECT p.id FROM _purge_plan p WHERE p.tbl = 'public.users');
        GET DIAGNOSTICS v_count = ROW_COUNT;
    END IF;

    IF NOT p_apply THEN
        SELECT count(*) INTO v_count
        FROM public.sections s
        WHERE s.faculty_id IN (SELECT p.id FROM _purge_plan p WHERE p.tbl = 'public.users');
    END IF;

    IF v_count > 0 THEN
        INSERT INTO _purge_result (action, target, rows_affected)
        VALUES ('detach', 'public.sections.faculty_id', v_count);
    END IF;

    IF p_apply THEN
        FOR v_rec IN
            SELECT p.tbl, p.depth, array_agg(p.id) AS ids
            FROM _purge_plan p
            GROUP BY p.tbl, p.depth
            ORDER BY p.depth DESC
        LOOP
            EXECUTE format('DELETE FROM %s WHERE id = ANY($1)', v_rec.tbl) USING v_rec.ids;
            GET DIAGNOSTICS v_count = ROW_COUNT;
            INSERT INTO _purge_result (action, target, rows_affected)
            VALUES ('delete', v_rec.tbl, v_count);
        END LOOP;
    END IF;

    IF NOT p_apply THEN
        INSERT INTO _purge_result (action, target, rows_affected)
        SELECT 'delete', p.tbl, count(*)
        FROM _purge_plan p
        GROUP BY p.tbl;
    END IF;

    RETURN QUERY
    SELECT r.action, r.target, sum(r.rows_affected)::BIGINT
    FROM _purge_result r
    GROUP BY r.action, r.target
    ORDER BY r.action, r.target;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_scan_dummy_user_refs(p_email_pattern TEXT DEFAULT 'dummy[_]user[_]%@example.com')
RETURNS TABLE (target TEXT, has_fk BOOLEAN, rows_affected BIGINT)
LANGUAGE plpgsql
AS $$
DECLARE
    v_rec RECORD;
    v_count BIGINT;
    v_ids UUID[];
BEGIN
    SELECT array_agg(u.id) INTO v_ids
    FROM public.users u
    WHERE u.email LIKE p_email_pattern;

    IF v_ids IS NULL THEN
        RETURN;
    END IF;

    FOR v_rec IN
        SELECT (c.oid::regclass)::TEXT AS tbl,
               a.attname AS col,
               EXISTS (
                   SELECT 1 FROM pg_constraint con
                   WHERE con.contype = 'f'
                       AND con.conrelid = c.oid
                       AND con.conkey[1] = a.attnum
               ) AS has_fk
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
        WHERE n.nspname = 'public'
            AND c.relkind = 'r'
            AND a.atttypid = 'uuid'::regtype
            AND a.attname <> 'id'
    LOOP
        EXECUTE format('SELECT count(*) FROM %s WHERE %I = ANY($1)', v_rec.tbl, v_rec.col)
        USING v_ids INTO v_count;

        IF v_count > 0 THEN
            target := v_rec.tbl || '.' || v_rec.col;
            has_fk := v_rec.has_fk;
            rows_affected := v_count;
            RETURN NEXT;
        END IF;
    END LOOP;
END;
$$;