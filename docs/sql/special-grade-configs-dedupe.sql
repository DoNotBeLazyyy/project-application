SELECT id, code, label, description, created_at
FROM public.special_grade_configs
WHERE deleted_at IS NULL
AND (
    lower(btrim(code)) IN (
        SELECT lower(btrim(code))
        FROM public.special_grade_configs
        WHERE deleted_at IS NULL
        GROUP BY lower(btrim(code))
        HAVING COUNT(*) > 1
    )
    OR lower(btrim(label)) IN (
        SELECT lower(btrim(label))
        FROM public.special_grade_configs
        WHERE deleted_at IS NULL
        GROUP BY lower(btrim(label))
        HAVING COUNT(*) > 1
    )
    OR (
        btrim(coalesce(description, '')) <> ''
        AND lower(btrim(description)) IN (
            SELECT lower(btrim(description))
            FROM public.special_grade_configs
            WHERE deleted_at IS NULL AND btrim(coalesce(description, '')) <> ''
            GROUP BY lower(btrim(description))
            HAVING COUNT(*) > 1
        )
    )
)
ORDER BY lower(btrim(label)), lower(btrim(code)), created_at;

WITH ranked AS (
    SELECT
        id,
        row_number() OVER (PARTITION BY lower(btrim(code)) ORDER BY created_at) AS code_rank,
        row_number() OVER (PARTITION BY lower(btrim(label)) ORDER BY created_at) AS label_rank,
        CASE
            WHEN btrim(coalesce(description, '')) = '' THEN 1
            ELSE row_number() OVER (
                PARTITION BY lower(btrim(description))
                ORDER BY created_at
            )
        END AS description_rank
    FROM public.special_grade_configs
    WHERE deleted_at IS NULL
)
UPDATE public.special_grade_configs sgc
SET deleted_at = now(), deleted_by = auth.uid()
FROM ranked r
WHERE sgc.id = r.id
AND (r.code_rank > 1 OR r.label_rank > 1 OR r.description_rank > 1);
