import {
    COMPACT_MEDIA_QUERY, DESKTOP_MEDIA_QUERY, HOVER_MEDIA_QUERY, MOBILE_MEDIA_QUERY, TABLET_MEDIA_QUERY
} from '@constants/breakpoint.constant';
import { useCallback, useSyncExternalStore } from 'react';

interface UseBreakpointResult {
    hasHover: boolean;
    isCompact: boolean;
    isDesktop: boolean;
    isMobile: boolean;
    isTablet: boolean;
}

function returnFalse(): boolean {
    return false;
}

function useMediaQueryMatch(query: string): boolean {
    const subscribe = useCallback(function(onStoreChange: () => void) {
        const mediaQueryList = window.matchMedia(query);

        mediaQueryList.addEventListener('change', onStoreChange);

        return function() {
            mediaQueryList.removeEventListener('change', onStoreChange);
        };
    }, [query]);
    const getSnapshot = useCallback(function() {
        return window.matchMedia(query).matches;
    }, [query]);

    return useSyncExternalStore(subscribe, getSnapshot, returnFalse);
}

export default function useBreakpoint(): UseBreakpointResult {
    const isCompact = useMediaQueryMatch(COMPACT_MEDIA_QUERY);
    const isMobile = useMediaQueryMatch(MOBILE_MEDIA_QUERY);
    const isTablet = useMediaQueryMatch(TABLET_MEDIA_QUERY);
    const isDesktop = useMediaQueryMatch(DESKTOP_MEDIA_QUERY);
    const hasHover = useMediaQueryMatch(HOVER_MEDIA_QUERY);

    return {
        hasHover, isCompact, isDesktop, isMobile, isTablet
    };
}