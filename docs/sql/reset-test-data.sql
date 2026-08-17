CREATE OR REPLACE FUNCTION public.fn_reset_test_data(p_apply BOOLEAN DEFAULT FALSE)
RETURNS TABLE (seq INT, step TEXT, target TEXT, rows_affected BIGINT)
LANGUAGE plpgsql
AS $$
DECLARE
    c_keep_emails TEXT[] := ARRAY[
        'juliustolentino.diamond@gmail.com',
        'juliustolentino0101@gmail.com',
        'juliusexample@gmail.com',
        'hbaki386@gmail.com',
        'crowsnight379@gmail.com',
        'julius.iveinc@gmail.com',
        'redep1892@gmail.com',
        'lmstest.mel01@gmail.com'
    ];
    c_keep_roles TEXT[] := ARRAY['Admin', 'Dean', 'Faculty', 'Registrar', 'Student'];
    c_keep_tables TEXT[] := ARRAY['users', 'user_roles', 'roles', 'course_types', 'term_types', 'system_settings'];
    v_keep_ids UUID[];
    v_keep_count INT;
    v_expected_count INT := array_length(c_keep_emails, 1);
    v_tables TEXT;
    v_count BIGINT;
    v_rec RECORD;
BEGIN
    CREATE TEMP TABLE IF NOT EXISTS _reset_result (
        seq INT NOT NULL,
        step TEXT NOT NULL,
        target TEXT NOT NULL,
        rows_affected BIGINT NOT NULL
    ) ON COMMIT DROP;

    DELETE FROM _reset_result;

    SELECT array_agg(u.id), count(*)
    INTO v_keep_ids, v_keep_count
    FROM public.users u
    WHERE u.email = ANY(c_keep_emails);

    IF v_keep_count IS NULL OR v_keep_count <> v_expected_count THEN
        RAISE EXCEPTION 'fn_reset_test_data aborted: expected % keep accounts, matched %', v_expected_count, COALESCE(v_keep_count, 0);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.users u
        JOIN public.user_roles ur ON ur.user_id = u.id AND ur.deleted_at IS NULL
        JOIN public.roles r ON r.id = ur.role_id
        WHERE u.email = ANY(c_keep_emails)
            AND r.code = 'Admin'
    ) THEN
        RAISE EXCEPTION 'fn_reset_test_data aborted: no surviving account holds the Admin role';
    END IF;

    INSERT INTO _reset_result (seq, step, target, rows_affected)
    VALUES (0, 'preserve', 'public.users', v_keep_count);

    SELECT string_agg(format('public.%I', t.tablename), ', ' ORDER BY t.tablename)
    INTO v_tables
    FROM pg_tables t
    WHERE t.schemaname = 'public'
        AND NOT (t.tablename = ANY(c_keep_tables));

    FOR v_rec IN
        SELECT t.tablename
        FROM pg_tables t
        WHERE t.schemaname = 'public'
            AND NOT (t.tablename = ANY(c_keep_tables))
        ORDER BY t.tablename
    LOOP
        EXECUTE format('SELECT count(*) FROM public.%I', v_rec.tablename) INTO v_count;

        IF v_count > 0 THEN
            INSERT INTO _reset_result (seq, step, target, rows_affected)
            VALUES (1, 'truncate', 'public.' || v_rec.tablename, v_count);
        END IF;
    END LOOP;

    IF p_apply AND v_tables IS NOT NULL THEN
        EXECUTE format('TRUNCATE TABLE %s', v_tables);
    END IF;

    IF p_apply THEN
        DELETE FROM public.user_roles ur
        WHERE NOT (ur.user_id = ANY(v_keep_ids));
        GET DIAGNOSTICS v_count = ROW_COUNT;
    END IF;

    IF NOT p_apply THEN
        SELECT count(*) INTO v_count
        FROM public.user_roles ur
        WHERE NOT (ur.user_id = ANY(v_keep_ids));
    END IF;

    IF v_count > 0 THEN
        INSERT INTO _reset_result (seq, step, target, rows_affected)
        VALUES (2, 'delete', 'public.user_roles', v_count);
    END IF;

    IF p_apply THEN
        DELETE FROM public.user_roles ur
        USING public.roles r
        WHERE r.id = ur.role_id
            AND ur.user_id = ANY(v_keep_ids)
            AND NOT (r.code = ANY(c_keep_roles));
        GET DIAGNOSTICS v_count = ROW_COUNT;
    END IF;

    IF NOT p_apply THEN
        SELECT count(*) INTO v_count
        FROM public.user_roles ur
        JOIN public.roles r ON r.id = ur.role_id
        WHERE ur.user_id = ANY(v_keep_ids)
            AND NOT (r.code = ANY(c_keep_roles));
    END IF;

    IF v_count > 0 THEN
        INSERT INTO _reset_result (seq, step, target, rows_affected)
        VALUES (3, 'delete', 'public.user_roles (non-canonical role)', v_count);
    END IF;

    IF p_apply THEN
        DELETE FROM public.users u
        WHERE NOT (u.id = ANY(v_keep_ids));
        GET DIAGNOSTICS v_count = ROW_COUNT;
    END IF;

    IF NOT p_apply THEN
        SELECT count(*) INTO v_count
        FROM public.users u
        WHERE NOT (u.id = ANY(v_keep_ids));
    END IF;

    IF v_count > 0 THEN
        INSERT INTO _reset_result (seq, step, target, rows_affected)
        VALUES (4, 'delete', 'public.users', v_count);
    END IF;

    IF p_apply THEN
        DELETE FROM auth.users au
        WHERE NOT (au.id = ANY(v_keep_ids));
        GET DIAGNOSTICS v_count = ROW_COUNT;
    END IF;

    IF NOT p_apply THEN
        SELECT count(*) INTO v_count
        FROM auth.users au
        WHERE NOT (au.id = ANY(v_keep_ids));
    END IF;

    IF v_count > 0 THEN
        INSERT INTO _reset_result (seq, step, target, rows_affected)
        VALUES (5, 'delete', 'auth.users', v_count);
    END IF;

    IF p_apply THEN
        DELETE FROM public.roles r
        WHERE NOT (r.code = ANY(c_keep_roles));
        GET DIAGNOSTICS v_count = ROW_COUNT;
    END IF;

    IF NOT p_apply THEN
        SELECT count(*) INTO v_count
        FROM public.roles r
        WHERE NOT (r.code = ANY(c_keep_roles));
    END IF;

    IF v_count > 0 THEN
        INSERT INTO _reset_result (seq, step, target, rows_affected)
        VALUES (6, 'delete', 'public.roles', v_count);
    END IF;

    IF p_apply THEN
        INSERT INTO public.grade_transmutation_tables (
            label, min_percentage, max_percentage, transmuted_grade, description
        )
        VALUES
            ('Default', 98, 100, 1.00, 'Excellent'),
            ('Default', 95, 97, 1.25, 'Superior'),
            ('Default', 92, 94, 1.50, 'Very Good'),
            ('Default', 89, 91, 1.75, 'Good'),
            ('Default', 86, 88, 2.00, 'Meritorious'),
            ('Default', 83, 85, 2.25, 'Very Satisfactory'),
            ('Default', 80, 82, 2.50, 'Satisfactory'),
            ('Default', 77, 79, 2.75, 'Fairly Satisfactory'),
            ('Default', 75, 76, 3.00, 'Passing'),
            ('Default', 0, 74, 5.00, 'Failed');
        GET DIAGNOSTICS v_count = ROW_COUNT;
    ELSE
        v_count := 10;
    END IF;

    INSERT INTO _reset_result (seq, step, target, rows_affected)
    VALUES (7, 'reseed', 'public.grade_transmutation_tables (Default ladder)', v_count);

    RETURN QUERY
    SELECT r.seq, r.step, r.target, r.rows_affected
    FROM _reset_result r
    ORDER BY r.seq, r.target;
END;
$$;
