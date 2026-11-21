-- ====================================================================
-- Migration: 20261121300010_admin_dashboard_counts.sql
-- Audit 2026-11-21 (Tier 2 admin dashboard):
--   * fn_get_admin_dashboard_stats: Active Students and Active Faculty counted Invited and
--     Inactive accounts; they now count only users whose account is Active.
--   * Active Terms was always 0 for years made in the wizard (their terms stay Upcoming).
--     A term now also counts when today (Manila) falls inside its dates, unless it is Closed
--     or Cancelled.
-- Idempotent: CREATE OR REPLACE only. Signatures and return shapes unchanged.
-- ====================================================================
BEGIN;

CREATE OR REPLACE FUNCTION public.fn_get_admin_dashboard_stats()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_is_admin           BOOLEAN;
    v_total_students     INTEGER;
    v_total_faculty      INTEGER;
    v_total_programs     INTEGER;
    v_active_terms       INTEGER;
    v_active_enrollments INTEGER;
    v_pending_clearances INTEGER;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles ur
        JOIN public.roles r ON r.id = ur.role_id
        WHERE ur.user_id = auth.uid()
        AND r.code = 'Admin'
        AND ur.revoked_at IS NULL
        AND ur.deleted_at IS NULL
    ) INTO v_is_admin;

    IF NOT v_is_admin THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unauthorized.');
    END IF;

    -- Only accounts that are Active (not Invited or Inactive)
    SELECT COUNT(*) INTO v_total_students
    FROM public.students s
    JOIN public.users u ON u.id = s.user_id AND u.deleted_at IS NULL AND u.status = 'Active'
    WHERE s.status = 'Active' AND s.deleted_at IS NULL;

    SELECT COUNT(DISTINCT ur.user_id) INTO v_total_faculty
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    JOIN public.users u ON u.id = ur.user_id
    WHERE r.code = 'Faculty'
    AND ur.revoked_at IS NULL
    AND ur.deleted_at IS NULL
    AND u.deleted_at IS NULL
    AND u.status = 'Active';

    SELECT COUNT(*) INTO v_total_programs
    FROM public.programs
    WHERE deleted_at IS NULL;

    -- Wizard-made terms keep the Upcoming status, so today's date also makes a term active
    SELECT COUNT(*) INTO v_active_terms
    FROM public.terms
    WHERE deleted_at IS NULL
    AND (
        status IN ('Enrollment Open', 'Ongoing', 'Grading Period')
        OR (
            COALESCE(status, '') NOT IN ('Closed', 'Cancelled')
            AND (now() AT TIME ZONE 'Asia/Manila')::date BETWEEN start_date AND end_date
        )
    );

    SELECT COUNT(*) INTO v_active_enrollments
    FROM public.enrollments
    WHERE status = 'Enrolled' AND deleted_at IS NULL;

    SELECT COUNT(*) INTO v_pending_clearances
    FROM public.student_clearances
    WHERE status = 'Pending' AND deleted_at IS NULL;

    RETURN jsonb_build_object(
        'total_students', v_total_students,
        'total_faculty', v_total_faculty,
        'total_programs', v_total_programs,
        'active_terms', v_active_terms,
        'active_enrollments', v_active_enrollments,
        'pending_clearances', v_pending_clearances
    );
END;
$function$;

COMMIT;
