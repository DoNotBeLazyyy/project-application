import { CommonSelectOption } from '@components/select/CommonSelect';
import { listMyEvaluations } from '@services/evaluation.service';
import { MyEvaluationRow } from '@type/evaluation.type';
import { useEffect, useMemo, useState } from 'react';

const TARGET_FETCH_SIZE = 200;

export function toTargetKey(enrollmentId: string, gradingPeriodId: string): string {
    return `${enrollmentId}|${gradingPeriodId}`;
}

export function toTargetPath(enrollmentId: string, gradingPeriodId: string): string {
    return `/student/evaluations/${enrollmentId}/${gradingPeriodId}`;
}

export function toTargetLabel(target: MyEvaluationRow): string {
    const base = `${target.faculty_name} — ${target.course_code} (${target.section_code}) · ${target.grading_period_name}`;

    return target.is_completed
        ? `${base} · Completed`
        : base;
}

export function useEvaluationTargets(refreshKey = 0) {
    const [targets, setTargets] = useState<MyEvaluationRow[]>([]);

    useEffect(function() {
        let active = true;

        async function fetchTargets() {
            const result = await listMyEvaluations(1, TARGET_FETCH_SIZE, '', [], '');

            if (active && result.data) {
                setTargets(result.data.content);
            }
        }

        fetchTargets();

        return function() {
            active = false;
        };
    }, [refreshKey]);

    const targetOptions = useMemo<CommonSelectOption[]>(function() {
        return targets.map(function(target) {
            return {
                label: toTargetLabel(target),
                value: toTargetKey(target.enrollment_id, target.grading_period_id)
            };
        });
    }, [targets]);

    const pendingCount = useMemo(function() {
        return targets.filter(function(target) {
            return !target.is_completed;
        }).length;
    }, [targets]);

    return { pendingCount, targetOptions, targets };
}