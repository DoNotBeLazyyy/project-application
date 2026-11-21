-- ====================================================================
-- Migration: 20261121300004_update_user_creates_student_record.sql
-- Audit 2026-11-21:
--   * #40 fn_update_user: adding the Student role in Edit User now creates the students row
--     (same student number rule as fn_provision_single_user), so the user shows up in
--     registrar lists right away. A soft-deleted student row for the user is restored instead
--     when its student number is still free.
-- Idempotent: CREATE OR REPLACE only. Signatures and return shapes unchanged.
-- ====================================================================
BEGIN;

CREATE OR REPLACE FUNCTION public.fn_update_user(p_user_id uuid, p_first_name text, p_last_name text, p_role_codes text[], p_email text DEFAULT NULL::text, p_department_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_trimmed_email TEXT;
    v_has_dept_role BOOLEAN;
    v_seq_num BIGINT;
    v_student_number TEXT;
    v_old_student_id UUID;
BEGIN
    PERFORM public.fn_assert_role('Admin');

    IF p_user_id = auth.uid() AND NOT ('Admin' = ANY (COALESCE(p_role_codes, ARRAY[]::TEXT[]))) THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'You cannot remove the Admin role from your own account.'
        );
    END IF;

    v_trimmed_email := NULLIF(btrim(p_email), '');
    IF v_trimmed_email IS NOT NULL THEN
        IF EXISTS (
            SELECT 1 FROM public.users
            WHERE lower(email) = lower(v_trimmed_email)
              AND id <> p_user_id
              AND deleted_at IS NULL
        ) OR EXISTS (
            SELECT 1 FROM auth.users
            WHERE lower(email) = lower(v_trimmed_email)
              AND id <> p_user_id
        ) THEN
            RETURN jsonb_build_object(
                'success', false,
                'message', 'The email address "' || v_trimmed_email || '" is already in use by another account.'
            );
        END IF;

        UPDATE auth.users
        SET email = v_trimmed_email,
            email_confirmed_at = COALESCE(email_confirmed_at, now()),
            updated_at = now()
        WHERE id = p_user_id;

        -- Update auth.identities identity_data (email is GENERATED)
        UPDATE auth.identities
        SET identity_data = jsonb_set(COALESCE(identity_data, '{}'::jsonb), '{email}', to_jsonb(v_trimmed_email)),
            updated_at = now()
        WHERE user_id = p_user_id;
    END IF;

    v_has_dept_role := ('Dean' = ANY(COALESCE(p_role_codes, ARRAY[]::TEXT[])))
                    OR ('Faculty' = ANY(COALESCE(p_role_codes, ARRAY[]::TEXT[])));

    UPDATE public.users
    SET first_name = btrim(p_first_name),
        last_name = btrim(p_last_name),
        email = COALESCE(v_trimmed_email, email),
        department_id = CASE
            WHEN v_has_dept_role THEN COALESCE(p_department_id, department_id)
            ELSE NULL
        END,
        updated_at = now(),
        updated_by = auth.uid()
    WHERE id = p_user_id
      AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'User not found.');
    END IF;

    DELETE FROM public.user_roles
    WHERE user_id = p_user_id;

    INSERT INTO public.user_roles (user_id, role_id, created_by, role_code)
    SELECT p_user_id, r.id, auth.uid(), r.code
    FROM public.roles r
    WHERE r.code = ANY(p_role_codes)
      AND r.deleted_at IS NULL;

    -- A user entering the Student role needs a students row, like fn_provision_single_user creates
    IF 'Student' = ANY(COALESCE(p_role_codes, ARRAY[]::TEXT[]))
       AND NOT EXISTS (
           SELECT 1 FROM public.students
           WHERE user_id = p_user_id AND deleted_at IS NULL
       ) THEN
        SELECT s.id INTO v_old_student_id
        FROM public.students s
        WHERE s.user_id = p_user_id
          AND s.deleted_at IS NOT NULL
          AND NOT EXISTS (
              SELECT 1 FROM public.students o
              WHERE o.student_number = s.student_number
                AND o.deleted_at IS NULL
          )
        ORDER BY s.deleted_at DESC
        LIMIT 1;

        IF v_old_student_id IS NOT NULL THEN
            UPDATE public.students
            SET deleted_at = NULL,
                deleted_by = NULL,
                updated_at = now(),
                updated_by = auth.uid()
            WHERE id = v_old_student_id;
        ELSE
            SELECT count(*) + 1 INTO v_seq_num FROM public.students;
            v_student_number := to_char(CURRENT_DATE, 'YYYY') || '-' || lpad(v_seq_num::text, 4, '0');
            WHILE EXISTS (SELECT 1 FROM public.students WHERE student_number = v_student_number) LOOP
                v_seq_num := v_seq_num + 1;
                v_student_number := to_char(CURRENT_DATE, 'YYYY') || '-' || lpad(v_seq_num::text, 4, '0');
            END LOOP;

            INSERT INTO public.students (
                user_id,
                student_number,
                year_level,
                status,
                admitted_at,
                created_by
            ) VALUES (
                p_user_id,
                v_student_number,
                1,
                'Active',
                CURRENT_DATE,
                auth.uid()
            )
            ON CONFLICT DO NOTHING;
        END IF;
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'User updated successfully.');
END;
$function$;

COMMIT;
