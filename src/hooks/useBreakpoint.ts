import { DESKTOP_MEDIA_QUERY, MOBILE_MEDIA_QUERY, TABLET_MEDIA_QUERY } from '@constants/breakpoint.constant';
import { useCallback, useSyncExternalStore } from 'react';

interface UseBreakpointResult {
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
    const isMobile = useMediaQueryMatch(MOBILE_MEDIA_QUERY);
    const isTablet = useMediaQueryMatch(TABLET_MEDIA_QUERY);
    const isDesktop = useMediaQueryMatch(DESKTOP_MEDIA_QUERY);

    return { isDesktop, isMobile, isTablet };
}