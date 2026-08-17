CREATE OR REPLACE FUNCTION public.fn_bulk_provision_users(p_users jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_entry          JSONB;
    v_provisioned    INTEGER := 0;
    v_errors         TEXT[]  := ARRAY[]::TEXT[];
    v_failed_ids     UUID[]  := ARRAY[]::UUID[];
    v_result         JSONB;
BEGIN
    PERFORM public.fn_assert_role('Admin');

    FOR v_entry IN SELECT * FROM jsonb_array_elements(p_users)
    LOOP
        v_result := public.fn_provision_single_user(
            (v_entry->>'auth_id')::UUID,
            v_entry->>'email',
            v_entry->>'first_name',
            v_entry->>'last_name',
            v_entry->>'role_code'
        );

        IF (v_result->>'success')::BOOLEAN THEN
            v_provisioned := v_provisioned + 1;
        ELSE
            v_errors := array_append(v_errors, v_entry->>'email' || ': ' || (v_result->>'message'));
            v_failed_ids := array_append(v_failed_ids, (v_entry->>'auth_id')::UUID);
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'success',           array_length(v_errors, 1) IS NULL,
        'provisioned_count', v_provisioned,
        'errors',            to_jsonb(v_errors),
        'failed_auth_ids',   to_jsonb(v_failed_ids)
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_bulk_provision_users(jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.fn_bulk_provision_users(jsonb) TO authenticated;