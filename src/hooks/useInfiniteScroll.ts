import {
    RefObject, useCallback, useEffect, useRef, useState
} from 'react';

export interface InfiniteScroll {
    hasMore: boolean;
    sentinelRef: RefObject<HTMLDivElement | null>;
    visibleCount: number;
    reset: () => void;
    revealThrough: (index: number) => void;
}

export function useInfiniteScroll(totalCount: number, step: number): InfiniteScroll {
    const sentinelRef = useRef<HTMLDivElement | null>(null);
    const [visibleCount, setVisibleCount] = useState(step);

    const hasMore = visibleCount < totalCount;

    useEffect(function() {
        const sentinel = sentinelRef.current;

        if (!sentinel || !hasMore) {
            return;
        }

        const observer = new IntersectionObserver(function(entries) {
            const isVisible = entries.some(function(entry) {
                return entry.isIntersecting;
            });

            if (!isVisible) {
                return;
            }

            setVisibleCount(function(previous) {
                return previous + step;
            });
        }, { rootMargin: '160px' });

        observer.observe(sentinel);

        return function() {
            observer.disconnect();
        };
    }, [hasMore, step, totalCount]);

    const reset = useCallback(function() {
        setVisibleCount(step);
    }, [step]);

    const revealThrough = useCallback(function(index: number) {
        setVisibleCount(function(previous) {
            return Math.max(previous, Math.ceil((index + 1) / step) * step);
        });
    }, [step]);

    return {
        hasMore,
        sentinelRef,
        visibleCount,
        reset,
        revealThrough
    };
}