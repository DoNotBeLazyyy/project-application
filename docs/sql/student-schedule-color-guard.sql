CREATE OR REPLACE FUNCTION public.fn_is_readable_hex_color(p_color text)
    RETURNS boolean
    LANGUAGE plpgsql
    IMMUTABLE
    SET search_path = public
    AS $$
DECLARE
    v_hex TEXT;
    v_index INT;
    v_channel NUMERIC;
    v_channels NUMERIC[] := ARRAY[]::NUMERIC[];
    v_luminance NUMERIC;
BEGIN
    IF p_color IS NULL THEN
        RETURN FALSE;
    END IF;

    v_hex := lower(replace(btrim(p_color), '#', ''));

    IF v_hex !~ '^[0-9a-f]{6}$' THEN
        RETURN FALSE;
    END IF;

    FOR v_index IN 0..2 LOOP
        v_channel := (('x' || substr(v_hex, v_index * 2 + 1, 2))::bit(8)::int) / 255.0;

        IF v_channel <= 0.03928 THEN
            v_channel := v_channel / 12.92;
        ELSE
            v_channel := power((v_channel + 0.055) / 1.055, 2.4);
        END IF;

        v_channels := array_append(v_channels, v_channel);
    END LOOP;

    v_luminance := 0.2126 * v_channels[1] + 0.7152 * v_channels[2] + 0.0722 * v_channels[3];

    RETURN v_luminance >= 0.05 AND v_luminance <= 0.62;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_is_readable_hex_color(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.fn_is_readable_hex_color(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.fn_upsert_student_section_color(p_section_id uuid, p_color text)
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_student_id UUID;
    v_color TEXT;
BEGIN
    SELECT id INTO v_student_id
    FROM public.students
    WHERE user_id = auth.uid() AND deleted_at IS NULL
    LIMIT 1;

    IF v_student_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student profile not found.');
    END IF;

    v_color := '#' || lower(replace(btrim(coalesce(p_color, '')), '#', ''));

    IF NOT public.fn_is_readable_hex_color(v_color) THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Pick a color that is not white, black, or too close to either. It would be unreadable on the schedule.'
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.enrollments e
        WHERE e.student_id = v_student_id
          AND e.section_id = p_section_id
          AND e.deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'You are not enrolled in this section.');
    END IF;

    INSERT INTO public.student_section_colors (
        student_id,
        section_id,
        color,
        created_by
    ) VALUES (
        v_student_id,
        p_section_id,
        v_color,
        auth.uid()
    )
    ON CONFLICT (student_id, section_id) WHERE deleted_at IS NULL
    DO UPDATE SET
        color = v_color,
        updated_at = now(),
        updated_by = auth.uid();

    RETURN jsonb_build_object('success', true, 'message', 'Color saved successfully.');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_upsert_student_section_color(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.fn_upsert_student_section_color(uuid, text) TO authenticated;

WITH palette AS (
    SELECT ARRAY[
        '#3b6fb6', '#2f7fa8', '#2e8b8b', '#3f8f5b',
        '#6e8f2e', '#c08a17', '#c96a21', '#c0453f',
        '#b23a6b', '#8b5cc7', '#5b62c4', '#5f6b7a'
    ] AS colors
),
unreadable AS (
    SELECT
        c.id,
        row_number() OVER (PARTITION BY c.student_id ORDER BY c.created_at) AS position
    FROM public.student_section_colors c
    WHERE c.deleted_at IS NULL
      AND NOT public.fn_is_readable_hex_color(c.color)
)
UPDATE public.student_section_colors target
SET color = (SELECT colors[((unreadable.position - 1) % 12) + 1] FROM palette),
    updated_at = now()
FROM unreadable
WHERE target.id = unreadable.id;