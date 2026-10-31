import { BREADCRUMB_SEGMENT_LABELS } from '@constants/breadcrumb.constant';
import { useBreadcrumbStore } from '@stores/breadcrumb.store';
import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface BreadcrumbItem {
    href: string;
    // False for a path prefix that is not a page of its own; it renders as plain text
    isLinkable: boolean;
    isCurrent: boolean;
    isRoot: boolean;
    label: string;
}

// Tabs of a section / subject page that appear as their own path segment
const TAB_SEGMENTS = new Set(['assessments', 'rubrics']);

/**
 * Where a crumb for a path prefix should lead. "…/sections/:id/assessments" is a tab of the
 * section page, not a route, so it links to the tab; an assessment id under it, and a student's
 * "grade/:enrollmentId", have no page and get no link.
 */
function resolveCrumbHref(segments: string[], index: number, currentPath: string): string | null {
    const segment = segments[index];
    const prevSegment = segments[index - 1];
    const isLast = index === segments.length - 1;

    if (TAB_SEGMENTS.has(segment) && UUID_PATTERN.test(prevSegment ?? '') && !isLast) {
        const parentPath = currentPath.slice(0, currentPath.lastIndexOf('/'));
        return `${parentPath}?tab=${segment}`;
    }

    if (!isLast && UUID_PATTERN.test(segment) && TAB_SEGMENTS.has(prevSegment ?? '')) {
        return null;
    }

    if (!isLast && prevSegment === 'grade' && UUID_PATTERN.test(segment)) {
        return null;
    }

    return currentPath;
}

function formatFallbackSegment(segment: string, prevSegment?: string): string {
    if (UUID_PATTERN.test(segment) || /^\d+$/.test(segment)) {
        if (prevSegment === 'sections') {
            return 'Section Detail';
        }
        if (prevSegment === 'subjects') {
            return 'Subject Detail';
        }
        if (prevSegment === 'assessments') {
            return 'Assessment Detail';
        }
        if (prevSegment === 'faculty-load') {
            return 'Faculty Member';
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

            const href = resolveCrumbHref(segments, index, currentPath);

            return {
                href: href ?? currentPath,
                isLinkable: href !== null,
                isCurrent: isLast,
                isRoot: isFirst,
                label
            };
        });
    }, [pathname, customLabels]);
}