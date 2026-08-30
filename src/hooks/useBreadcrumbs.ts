import { BREADCRUMB_SEGMENT_LABELS } from '@constants/breadcrumb.constant';
import { useBreadcrumbStore } from '@stores/breadcrumb.store';
import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface BreadcrumbItem {
    href: string;
    isCurrent: boolean;
    isRoot: boolean;
    label: string;
}

function formatFallbackSegment(segment: string, prevSegment?: string): string {
    if (UUID_PATTERN.test(segment) || /^\d+$/.test(segment)) {
        if (prevSegment === 'sections') {
            return 'Section Detail';
        }
        if (prevSegment === 'assessments') {
            return 'Assessment Detail';
        }
        if (prevSegment === 'faculty-load') {
            return 'Faculty Member';
        }
        if (prevSegment === 'student-management') {
            return 'Student Detail';
        }
        if (prevSegment === 'rubrics') {
            return 'Rubric Detail';
        }
        if (prevSegment === 'evaluations') {
            return 'Evaluation Detail';
        }
        return 'Detail';
    }

    return segment
        .split('-')
        .map((word) => word.charAt(0)
            .toUpperCase() + word.slice(1))
        .join(' ');
}

export default function useBreadcrumbs(): BreadcrumbItem[] {
    const { pathname } = useLocation();
    const customLabels = useBreadcrumbStore((state) => state.customLabels);

    return useMemo(() => {
        const segments = pathname.split('/')
            .filter(Boolean);

        if (segments.length === 0) {
            return [];
        }

        let currentPath = '';

        return segments.map((segment, index) => {
            currentPath += `/${segment}`;
            const isLast = index === segments.length - 1;
            const isFirst = index === 0;
            const prevSegment = index > 0
                ? segments[index - 1]
                : undefined;

            // 1. Direct custom override from store (by path or by segment)
            let label = customLabels[currentPath] || customLabels[segment];

            // 2. Dictionary lookup
            if (!label) {
                label = BREADCRUMB_SEGMENT_LABELS[segment.toLowerCase()];
            }

            // 3. Fallback formatting
            if (!label) {
                label = formatFallbackSegment(segment, prevSegment);
            }

            return {
                href: currentPath,
                isCurrent: isLast,
                isRoot: isFirst,
                label
            };
        });
    }, [pathname, customLabels]);
}