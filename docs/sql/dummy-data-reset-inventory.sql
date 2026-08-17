SELECT
    COALESCE(pu.id, au.id) AS user_id,
    COALESCE(pu.email, au.email) AS email,
    pu.last_name,
    pu.first_name,
    pu.status,
    pu.deleted_at,
    (COALESCE(pu.email, au.email) ILIKE '%dummy%') AS looks_dummy,
    CASE
        WHEN pu.id IS NULL THEN 'auth_only'
        WHEN au.id IS NULL THEN 'profile_only'
        ELSE 'linked'
    END AS link_state,
    au.email_confirmed_at,
    au.last_sign_in_at,
    rl.roles,
    COALESCE(st.student_rows, 0) AS student_rows,
    COALESCE(sec.sections_taught, 0) AS sections_taught,
    COALESCE(enr.enrollments, 0) AS enrollments,
    pu.created_at
FROM public.users pu
FULL OUTER JOIN auth.users au ON au.id = pu.id
LEFT JOIN LATERAL (
    SELECT string_agg(DISTINCT COALESCE(r.code, ur.role_code), ', ') AS roles
    FROM public.user_roles ur
    LEFT JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = pu.id
        AND ur.deleted_at IS NULL
        AND ur.revoked_at IS NULL
) rl ON TRUE
LEFT JOIN LATERAL (
    SELECT count(*) AS student_rows
    FROM public.students s
    WHERE s.user_id = pu.id
) st ON TRUE
LEFT JOIN LATERAL (
    SELECT count(*) AS sections_taught
    FROM public.sections sc
    WHERE sc.faculty_id = pu.id
) sec ON TRUE
LEFT JOIN LATERAL (
    SELECT count(*) AS enrollments
    FROM public.enrollments e
    JOIN public.students s ON s.id = e.student_id
    WHERE s.user_id = pu.id
) enr ON TRUE
ORDER BY looks_dummy, link_state, COALESCE(pu.email, au.email);

SELECT
    (COALESCE(pu.email, au.email) ILIKE '%dummy%') AS looks_dummy,
    CASE
        WHEN pu.id IS NULL THEN 'auth_only'
        WHEN au.id IS NULL THEN 'profile_only'
        ELSE 'linked'
    END AS link_state,
    count(*) AS accounts
FROM public.users pu
FULL OUTER JOIN auth.users au ON au.id = pu.id
GROUP BY 1, 2
ORDER BY 1, 2;

SELECT
    r.id AS role_id,
    r.code,
    r.label,
    r.deleted_at,
    count(ur.id) FILTER (WHERE ur.deleted_at IS NULL) AS active_assignments
FROM public.roles r
LEFT JOIN public.user_roles ur ON ur.role_id = r.id
GROUP BY r.id, r.code, r.label, r.deleted_at
ORDER BY r.code;

SELECT
    ur.role_code,
    count(*) AS rows_with_orphan_role_code
FROM public.user_roles ur
LEFT JOIN public.roles r ON r.id = ur.role_id
WHERE r.id IS NULL
GROUP BY ur.role_code
ORDER BY ur.role_code;
