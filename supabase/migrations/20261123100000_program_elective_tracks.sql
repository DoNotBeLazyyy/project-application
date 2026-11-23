-- Elective tracks per program
--  The printed curriculum ends with an ELECTIVES box that names the program's elective tracks
--  (e.g. "Systems Fundamentals", "Intelligent Systems"). Each program now stores that list.
--  fn_get_program_elective_tracks: anyone signed in can read it (the curriculum is shown read-only
--      to other roles too).
--  fn_set_program_elective_tracks: Dean (own department only) or Admin. Blank names are dropped,
--      duplicates removed, order kept.

BEGIN;

ALTER TABLE public.programs
    ADD COLUMN IF NOT EXISTS elective_tracks text[] NOT NULL DEFAULT '{}'::text[];

CREATE OR REPLACE FUNCTION public.fn_get_program_elective_tracks(p_program_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN '[]'::jsonb;
    END IF;

    RETURN COALESCE((
        SELECT to_jsonb(p.elective_tracks)
        FROM public.programs p
        WHERE p.id = p_program_id
          AND p.deleted_at IS NULL
    ), '[]'::jsonb);
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_set_program_elective_tracks(p_program_id uuid, p_tracks text[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_dean_department_id uuid := public.fn_get_dean_department_id();
    v_department_id uuid;
    v_tracks text[];
BEGIN
    PERFORM public.fn_assert_role('Dean', 'Admin');

    SELECT department_id INTO v_department_id
    FROM public.programs
    WHERE id = p_program_id
      AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Program not found.');
    END IF;

    IF v_dean_department_id IS NOT NULL AND v_department_id IS DISTINCT FROM v_dean_department_id THEN
        RETURN jsonb_build_object('success', false, 'message', 'You can only manage programs in your own department.');
    END IF;

    SELECT COALESCE(array_agg(t.name ORDER BY t.first_position), '{}'::text[])
    INTO v_tracks
    FROM (
        SELECT btrim(raw.name) AS name, min(raw.position) AS first_position
        FROM unnest(COALESCE(p_tracks, '{}'::text[])) WITH ORDINALITY AS raw(name, position)
        WHERE btrim(COALESCE(raw.name, '')) <> ''
        GROUP BY btrim(raw.name)
    ) t;

    IF EXISTS (SELECT 1 FROM unnest(v_tracks) AS n WHERE length(n) > 100) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Each elective track name must be 100 characters or fewer.');
    END IF;

    IF COALESCE(array_length(v_tracks, 1), 0) > 20 THEN
        RETURN jsonb_build_object('success', false, 'message', 'A program can list up to 20 elective tracks.');
    END IF;

    UPDATE public.programs
    SET elective_tracks = v_tracks,
        updated_at = now()
    WHERE id = p_program_id;

    RETURN jsonb_build_object('success', true, 'message', 'Elective tracks saved.');
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_get_program_elective_tracks(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_set_program_elective_tracks(uuid, text[]) TO authenticated;

COMMIT;
