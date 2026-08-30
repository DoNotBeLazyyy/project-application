import { RefObject, useEffect, useState } from 'react';

interface UseLastVisibleRowParams {
    /** The element that scrolls — the grid's `overflow-y` container. */
    root: RefObject<HTMLElement | null>;
    /** Current number of rows; the observer re-attaches whenever this changes. */
    rowCount: number;
    /** Skip all work (e.g. table view, or infinite scroll disabled). */
    enabled: boolean;
    /** Attribute on each row wrapper holding its 0-based index. */
    rowAttribute?: string;
}

/**
 * Tracks which row is currently the last one visible inside `root`, so a
 * "Showing N of Total" label can reflect the user's actual scroll position
 * rather than how many rows have been fetched.
 *
 * Returns the 1-based index of that row (0 before anything has been measured).
 */
export function useLastVisibleRow({
    root,
    rowCount,
    enabled,
    rowAttribute = 'data-row-index'
}: UseLastVisibleRowParams): number {
    const [lastVisibleRow, setLastVisibleRow] = useState(0);

    useEffect(function() {
        const rootEl = root.current;

        if (!rootEl || !enabled || rowCount === 0) {
            setLastVisibleRow(0);
            return;
        }

        const visible = new Set<number>();

        const observer = new IntersectionObserver(
            function(entries) {
                for (const entry of entries) {
                    const raw = entry.target.getAttribute(rowAttribute);
                    const index = raw === null
                        ? Number.NaN
                        : Number(raw);

                    if (Number.isNaN(index)) {
                        continue;
                    }

                    if (entry.isIntersecting) {
                        visible.add(index);
                    }
                    else {
                        visible.delete(index);
                    }
                }

                setLastVisibleRow(visible.size === 0
                    ? 0
                    : Math.max(...visible) + 1);
            },
            { root: rootEl }
        );

        rootEl.querySelectorAll(`[${rowAttribute}]`)
            .forEach(function(el) {
                observer.observe(el);
            });

        return function() {
            observer.disconnect();
        };
    }, [root, rowCount, enabled, rowAttribute]);

    return lastVisibleRow;
}