DO $$
DECLARE
    v_student_id   uuid;
    v_faculty_id   uuid;
    v_term_id      uuid;
    v_template_id  uuid;
    v_section_id   uuid;
    v_enrollment_id uuid;
    v_period_id    uuid;
    v_assessment_id uuid;
    v_q1 uuid;
    v_q2 uuid;
    v_c1a uuid;
    v_c2a uuid;
    v_submission_id uuid;
    r RECORD;
    p RECORD;
    v_grade numeric;
    v_transmuted numeric;
BEGIN
    SELECT s.id INTO v_student_id
    FROM public.students s
    JOIN public.users u ON u.id = s.user_id
    WHERE u.email = 'crowsnight379@gmail.com' AND s.deleted_at IS NULL
    LIMIT 1;

    IF v_student_id IS NULL THEN
        RAISE EXCEPTION 'Student crowsnight379@gmail.com not found';
    END IF;

    SELECT id INTO v_faculty_id FROM public.users
    WHERE deleted_at IS NULL AND id IN (
        SELECT faculty_id FROM public.sections WHERE section_code = 'CS210-A' AND deleted_at IS NULL
    )
    LIMIT 1;

    SELECT term_id INTO v_term_id FROM public.sections
    WHERE section_code = 'CS210-A' AND deleted_at IS NULL LIMIT 1;

    SELECT id INTO v_template_id FROM public.evaluation_templates
    WHERE deleted_at IS NULL LIMIT 1;

    FOR r IN
        SELECT * FROM (VALUES
            ('CS210-A', 'Monday'::public.day_of_week_type, 'Wednesday'::public.day_of_week_type, TIME '08:00', TIME '09:30', 'Room 101', 90, 88, 91, 89),
            ('CS211-A', 'Monday'::public.day_of_week_type, 'Wednesday'::public.day_of_week_type, TIME '09:30', TIME '11:00', 'Room 102', 87, 90, 85, 88),
            ('CS221-A', 'Tuesday'::public.day_of_week_type, 'Thursday'::public.day_of_week_type, TIME '08:00', TIME '09:30', 'Room 201', 92, 89, 90, 93),
            ('CS222-A', 'Tuesday'::public.day_of_week_type, 'Thursday'::public.day_of_week_type, TIME '09:30', TIME '11:00', 'Room 202', 85, 86, 88, 84),
            ('CS312-A', 'Friday'::public.day_of_week_type, 'Friday'::public.day_of_week_type, TIME '13:00', TIME '16:00', 'Room 301', 91, 93, 90, 94)
        ) AS t(code, day1, day2, ts, te, room, g1, g2, g3, g4)
    LOOP
        SELECT id INTO v_section_id FROM public.sections
        WHERE section_code = r.code AND deleted_at IS NULL LIMIT 1;
        CONTINUE WHEN v_section_id IS NULL;

        SELECT id INTO v_enrollment_id FROM public.enrollments
        WHERE student_id = v_student_id AND section_id = v_section_id AND deleted_at IS NULL LIMIT 1;
        CONTINUE WHEN v_enrollment_id IS NULL;

        INSERT INTO public.section_schedules (section_id, day_of_week, time_start, time_end, room, created_by)
        SELECT v_section_id, r.day1, r.ts, r.te, r.room, v_faculty_id
        WHERE NOT EXISTS (
            SELECT 1 FROM public.section_schedules
            WHERE section_id = v_section_id AND day_of_week = r.day1 AND time_start = r.ts AND deleted_at IS NULL
        );

        IF r.day2 <> r.day1 THEN
            INSERT INTO public.section_schedules (section_id, day_of_week, time_start, time_end, room, created_by)
            SELECT v_section_id, r.day2, r.ts, r.te, r.room, v_faculty_id
            WHERE NOT EXISTS (
                SELECT 1 FROM public.section_schedules
                WHERE section_id = v_section_id AND day_of_week = r.day2 AND time_start = r.ts AND deleted_at IS NULL
            );
        END IF;

        FOR p IN
            SELECT gp.id, gp.sequence,
                CASE gp.sequence WHEN 1 THEN r.g1 WHEN 2 THEN r.g2 WHEN 3 THEN r.g3 ELSE r.g4 END AS grade
            FROM public.grading_periods gp
            WHERE gp.term_id = v_term_id AND gp.deleted_at IS NULL
        LOOP
            v_grade := p.grade;
            v_transmuted := CASE
                WHEN v_grade >= 97 THEN 1.00
                WHEN v_grade >= 94 THEN 1.25
                WHEN v_grade >= 91 THEN 1.50
                WHEN v_grade >= 88 THEN 1.75
                WHEN v_grade >= 85 THEN 2.00
                WHEN v_grade >= 82 THEN 2.25
                WHEN v_grade >= 79 THEN 2.50
                WHEN v_grade >= 76 THEN 2.75
                WHEN v_grade >= 75 THEN 3.00
                ELSE 5.00 END;

            INSERT INTO public.section_final_grades
                (enrollment_id, grading_period_id, raw_grade, final_grade, transmuted_grade,
                 status, approved_by, approved_at, released_at, created_by)
            SELECT v_enrollment_id, p.id, v_grade, v_grade, v_transmuted,
                   'Released'::public.grade_status_type, v_faculty_id, now(), now(), v_faculty_id
            WHERE NOT EXISTS (
                SELECT 1 FROM public.section_final_grades
                WHERE enrollment_id = v_enrollment_id AND grading_period_id = p.id AND deleted_at IS NULL
            );

            IF v_template_id IS NOT NULL THEN
                INSERT INTO public.evaluation_period_locks
                    (enrollment_id, grading_period_id, template_id, is_completed, completed_at, created_by)
                SELECT v_enrollment_id, p.id, v_template_id, true, now(), v_faculty_id
                WHERE NOT EXISTS (
                    SELECT 1 FROM public.evaluation_period_locks
                    WHERE enrollment_id = v_enrollment_id AND grading_period_id = p.id AND deleted_at IS NULL
                );
            END IF;
        END LOOP;

        SELECT id INTO v_assessment_id FROM public.assessment_items
        WHERE section_id = v_section_id AND title = 'Quiz 1: Fundamentals' AND deleted_at IS NULL LIMIT 1;

        IF v_assessment_id IS NULL THEN
            INSERT INTO public.assessment_items
                (section_id, title, description, assessment_type, total_points, max_attempts,
                 is_published, published_at, opens_at, due_at, closes_at, show_all_questions, created_by)
            VALUES
                (v_section_id, 'Quiz 1: Fundamentals', 'Introductory quiz covering the first module.',
                 'Quiz'::public.assessment_type, 20, 1, true, now(),
                 now() - interval '7 days', now() + interval '7 days', now() + interval '14 days', true, v_faculty_id)
            RETURNING id INTO v_assessment_id;

            INSERT INTO public.assessment_questions
                (assessment_item_id, question_text, question_type, points, sequence, created_by)
            VALUES (v_assessment_id, 'Which data structure uses FIFO ordering?',
                'Multiple Choice'::public.question_type, 10, 1, v_faculty_id)
            RETURNING id INTO v_q1;

            INSERT INTO public.assessment_question_choices (question_id, choice_text, is_correct, sequence, created_by)
            VALUES (v_q1, 'Queue', true, 1, v_faculty_id) RETURNING id INTO v_c1a;
            INSERT INTO public.assessment_question_choices (question_id, choice_text, is_correct, sequence, created_by)
            VALUES (v_q1, 'Stack', false, 2, v_faculty_id);
            INSERT INTO public.assessment_question_choices (question_id, choice_text, is_correct, sequence, created_by)
            VALUES (v_q1, 'Tree', false, 3, v_faculty_id);

            INSERT INTO public.assessment_questions
                (assessment_item_id, question_text, question_type, points, sequence, created_by)
            VALUES (v_assessment_id, 'Big-O of binary search on a sorted array?',
                'Multiple Choice'::public.question_type, 10, 2, v_faculty_id)
            RETURNING id INTO v_q2;

            INSERT INTO public.assessment_question_choices (question_id, choice_text, is_correct, sequence, created_by)
            VALUES (v_q2, 'O(log n)', true, 1, v_faculty_id) RETURNING id INTO v_c2a;
            INSERT INTO public.assessment_question_choices (question_id, choice_text, is_correct, sequence, created_by)
            VALUES (v_q2, 'O(n)', false, 2, v_faculty_id);
            INSERT INTO public.assessment_question_choices (question_id, choice_text, is_correct, sequence, created_by)
            VALUES (v_q2, 'O(n log n)', false, 3, v_faculty_id);

            INSERT INTO public.assessment_submissions
                (assessment_item_id, enrollment_id, attempt_number, status, started_at, submitted_at,
                 raw_score, final_score, graded_at, graded_by, is_late, created_by)
            VALUES (v_assessment_id, v_enrollment_id, 1, 'Graded'::public.submission_status_type,
                now() - interval '3 days', now() - interval '3 days' + interval '18 minutes',
                20, 20, now() - interval '2 days', v_faculty_id, false, v_faculty_id)
            RETURNING id INTO v_submission_id;

            INSERT INTO public.student_answers
                (submission_id, question_id, choice_id, points_earned, is_correct, created_by)
            VALUES
                (v_submission_id, v_q1, v_c1a, 10, true, v_faculty_id),
                (v_submission_id, v_q2, v_c2a, 10, true, v_faculty_id);
        END IF;

        RAISE NOTICE 'Seeded %: schedule, grades, quiz + graded submission', r.code;
    END LOOP;

    IF v_template_id IS NULL THEN
        RAISE NOTICE 'No evaluation_templates found: grades are Released and show on the Grades page, but the Subject Detail Grades tab stays gated behind evaluation until a template + completed lock exist.';
    END IF;

    RAISE NOTICE 'Done seeding for crowsnight379@gmail.com';
END $$;
