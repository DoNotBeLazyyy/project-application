INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "avatars_objects_select" ON storage.objects;
CREATE POLICY "avatars_objects_select"
    ON storage.objects
    FOR SELECT
    TO anon, authenticated
    USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_objects_insert" ON storage.objects;
CREATE POLICY "avatars_objects_insert"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "avatars_objects_update" ON storage.objects;
CREATE POLICY "avatars_objects_update"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
    )
    WITH CHECK (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "avatars_objects_delete" ON storage.objects;
CREATE POLICY "avatars_objects_delete"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE OR REPLACE FUNCTION public.fn_get_my_profile()
    RETURNS jsonb
    LANGUAGE plpgsql
    STABLE
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_result  JSONB;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: you must be signed in to view your profile.'
            USING ERRCODE = '28000';
    END IF;

    SELECT jsonb_build_object(
        'id', u.id,
        'first_name', u.first_name,
        'middle_name', COALESCE(u.middle_name, ''),
        'last_name', u.last_name,
        'suffix', COALESCE(u.suffix, ''),
        'preferred_name', COALESCE(u.preferred_name, ''),
        'email', u.email,
        'mobile_number', COALESCE(u.mobile_number, ''),
        'address_line1', COALESCE(u.address_line1, ''),
        'address_line2', COALESCE(u.address_line2, ''),
        'city', COALESCE(u.city, ''),
        'province', COALESCE(u.province, ''),
        'postal_code', COALESCE(u.postal_code, ''),
        'date_of_birth', u.date_of_birth,
        'gender', COALESCE(u.gender::TEXT, ''),
        'civil_status', COALESCE(u.civil_status::TEXT, ''),
        'nationality', COALESCE(u.nationality, ''),
        'avatar_url', u.avatar_url,
        'status', u.status,
        'role_labels', COALESCE((
            SELECT jsonb_agg(r.label ORDER BY r.label)
            FROM public.user_roles ur
            INNER JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
            WHERE ur.user_id = u.id
              AND ur.deleted_at IS NULL
              AND ur.revoked_at IS NULL
        ), '[]'::JSONB)
    )
    INTO v_result
    FROM public.users u
    WHERE u.id = v_user_id
      AND u.deleted_at IS NULL;

    IF v_result IS NULL THEN
        RAISE EXCEPTION 'Profile not found for the signed-in account.'
            USING ERRCODE = 'P0002';
    END IF;

    RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_update_my_avatar(p_avatar_url text)
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_url     TEXT := NULLIF(btrim(COALESCE(p_avatar_url, '')), '');
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'You must be signed in to update your photo.');
    END IF;

    IF v_url IS NOT NULL AND v_url !~* '^https?://' THEN
        RETURN jsonb_build_object('success', false, 'message', 'The photo location is not a valid URL.');
    END IF;

    UPDATE public.users
    SET avatar_url = v_url
    WHERE id = v_user_id
      AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Profile not found for the signed-in account.');
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', CASE
            WHEN v_url IS NULL THEN 'Your profile photo has been removed.'
            ELSE 'Your profile photo has been updated.'
        END
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_update_my_avatar(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.fn_update_my_avatar(text) TO authenticated;
