CREATE OR REPLACE FUNCTION public.fn_resolve_audience(p_audience public.announcement_audience_type, p_section_ids uuid[] DEFAULT NULL::uuid[])
    RETURNS SETOF uuid
    LANGUAGE sql
    STABLE
    SECURITY DEFINER
    SET search_path = public
    AS $$
    SELECT DISTINCT u.id
    FROM public.users u
    WHERE u.deleted_at IS NULL
      AND u.status = 'Active'
      AND (
          p_audience = 'Global'
          OR (
              p_audience IN ('Faculty', 'Student')
              AND EXISTS (
                  SELECT 1
                  FROM public.user_roles ur
                  INNER JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
                  WHERE ur.user_id = u.id
                    AND ur.deleted_at IS NULL
                    AND ur.revoked_at IS NULL
                    AND r.code = p_audience::text
              )
          )
          OR (
              p_audience = 'Section'
              AND p_section_ids IS NOT NULL
              AND (
                  EXISTS (
                      SELECT 1
                      FROM public.enrollments e
                      INNER JOIN public.students st ON st.id = e.student_id AND st.deleted_at IS NULL
                      WHERE st.user_id = u.id
                        AND e.section_id = ANY(p_section_ids)
                        AND e.status = 'Enrolled'
                        AND e.deleted_at IS NULL
                  )
                  OR EXISTS (
                      SELECT 1
                      FROM public.sections s
                      WHERE s.faculty_id = u.id
                        AND s.id = ANY(p_section_ids)
                        AND s.deleted_at IS NULL
                  )
              )
          )
      );
$$;

CREATE OR REPLACE FUNCTION public.fn_preview_audience(p_audience public.announcement_audience_type, p_section_ids uuid[] DEFAULT NULL::uuid[])
    RETURNS jsonb
    LANGUAGE plpgsql
    STABLE
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_recipient_count INTEGER;
BEGIN
    PERFORM public.fn_assert_role('Admin', 'Dean', 'Registrar', 'Faculty');

    IF p_audience = 'Section' AND (p_section_ids IS NULL OR array_length(p_section_ids, 1) IS NULL) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Select at least one section for a section-targeted audience.');
    END IF;

    SELECT count(*) INTO v_recipient_count
    FROM public.fn_resolve_audience(p_audience, p_section_ids);

    RETURN jsonb_build_object(
        'success', true,
        'audience', p_audience,
        'section_count', COALESCE(array_length(p_section_ids, 1), 0),
        'recipient_count', v_recipient_count
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_resolve_audience(public.announcement_audience_type, uuid[]) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_preview_audience(public.announcement_audience_type, uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.fn_preview_audience(public.announcement_audience_type, uuid[]) TO authenticated;