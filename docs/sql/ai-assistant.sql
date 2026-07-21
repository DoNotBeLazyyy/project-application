CREATE OR REPLACE FUNCTION public.fn_get_assistant_context(
    p_active_role text,
    p_section_id uuid DEFAULT NULL::uuid,
    p_term_id uuid DEFAULT NULL::uuid
)
    RETURNS jsonb
    LANGUAGE plpgsql
    STABLE
    SECURITY INVOKER
    SET search_path = public
    AS $$
DECLARE
    v_roles TEXT[];
    v_role TEXT;
    v_insight JSONB;
    v_dashboard JSONB;
    v_section JSONB;
    v_profile JSONB;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: you must be signed in to use the assistant.'
            USING ERRCODE = '28000';
    END IF;

    v_roles := public.fn_current_user_role_codes();

    SELECT held.code
    INTO v_role
    FROM unnest(v_roles) AS held(code)
    WHERE lower(btrim(held.code)) = lower(btrim(coalesce(p_active_role, '')))
    LIMIT 1;

    IF v_role IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'You do not currently hold the selected role.'
        );
    END IF;

    SELECT jsonb_build_object(
               'full_name', btrim(coalesce(u.preferred_name, u.first_name) || ' ' || u.last_name),
               'email', u.email
           )
    INTO v_profile
    FROM public.users u
    WHERE u.id = auth.uid()
      AND u.deleted_at IS NULL;

    IF v_role = 'Student' THEN
        BEGIN
            v_insight := public.fn_get_student_insight(NULL, p_term_id);
        EXCEPTION
            WHEN OTHERS THEN
                v_insight := NULL;
        END;

        RETURN jsonb_build_object(
            'success', true,
            'mode', 'student_advising',
            'active_role', v_role,
            'profile', v_profile,
            'insight', v_insight
        );
    END IF;

    IF v_role = 'Faculty' THEN
        BEGIN
            v_dashboard := public.fn_get_faculty_dashboard(p_term_id);
        EXCEPTION
            WHEN OTHERS THEN
                v_dashboard := NULL;
        END;

        IF p_section_id IS NOT NULL THEN
            BEGIN
                v_section := public.fn_get_section_insight(p_section_id);
            EXCEPTION
                WHEN OTHERS THEN
                    v_section := NULL;
            END;
        END IF;

        RETURN jsonb_build_object(
            'success', true,
            'mode', 'faculty_advising',
            'active_role', v_role,
            'profile', v_profile,
            'dashboard', v_dashboard,
            'section', v_section
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'mode', 'howto',
        'active_role', v_role,
        'profile', v_profile
    );
END;
$$;

REVOKE ALL ON FUNCTION public.fn_get_assistant_context(text, uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_get_assistant_context(text, uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.fn_get_assistant_context(text, uuid, uuid) TO authenticated;
