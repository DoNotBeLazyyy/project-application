import { TimeoutNull } from '@type/common.type';
import { create } from 'zustand';

const HIDE_DELAY_MS = 100;
const STALL_TIMEOUT_MS = 20000;

export interface LoadingStoreProps {
    // Loading status
    isLoading: boolean;

    // Loading count
    loadingCount: number;

    // Hide loading
    hide: VoidFunction;

    // Force loading back to idle
    reset: VoidFunction;

    // Show loading
    show: VoidFunction;

    // Change loading status
    setIsLoading: (isLoading: boolean) => void;
}

let hideTimeout: TimeoutNull = null;
let stallTimeout: TimeoutNull = null;

function clearHideTimeout(): void {
    if (hideTimeout) {
        clearTimeout(hideTimeout);

        hideTimeout = null;
    }
}

function clearStallTimeout(): void {
    if (stallTimeout) {
        clearTimeout(stallTimeout);

        stallTimeout = null;
    }
}

export const useLoadingStore = create<LoadingStoreProps>((set, get) => ({
    isLoading: false,
    loadingCount: 0,
    show: () => {
        clearHideTimeout();
        clearStallTimeout();

        stallTimeout = setTimeout(() => {
            stallTimeout = null;

            clearHideTimeout();

            set({ loadingCount: 0, isLoading: false });
        }, STALL_TIMEOUT_MS);

        set({
            loadingCount: get().loadingCount + 1,
            isLoading: true
        });
    },
    hide: () => {
        const nextCount = Math.max(get().loadingCount - 1, 0);

        clearHideTimeout();

        set({ loadingCount: nextCount });

        if (nextCount === 0) {
            clearStallTimeout();

            hideTimeout = setTimeout(() => {
                hideTimeout = null;

                set({ isLoading: false });
            }, HIDE_DELAY_MS);
        }
    },
    reset: () => {
        clearHideTimeout();
        clearStallTimeout();

        set({ loadingCount: 0, isLoading: false });
    },
    setIsLoading: (value) => set({ isLoading: value })
}));