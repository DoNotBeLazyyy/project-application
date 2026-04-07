import { TimeoutNull } from '@type/common.type';
import { create } from 'zustand';

export interface LoadingStoreProps {
    // Loading status
    isLoading: boolean;

    // Loading count
    loadingCount: number;

    // Hide loading
    hide: VoidFunction;

    // Show loading
    show: VoidFunction;

    // Change loading status
    setIsLoading: (isLoading: boolean) => void;
}

let hideTimeout: TimeoutNull = null;

export const useLoadingStore = create<LoadingStoreProps>((set, get) => ({
    isLoading: false,
    loadingCount: 0,
    show: () => {
        if (hideTimeout) {
            clearTimeout(hideTimeout);

            hideTimeout = null;
        }
        else {
            const nextCount = get().loadingCount + 1;

            set({
                loadingCount: nextCount,
                isLoading: true
            });
        }
    },
    hide: () => {
        const nextCount = Math.max(get().loadingCount - 1, 0);

        if (nextCount === 0) {
            hideTimeout = setTimeout(() => {
                set({
                    loadingCount: 0,
                    isLoading: false
                });

                hideTimeout = null;
            }, 100);
        }
        else {
            set({ loadingCount: nextCount });
        }
    },
    setIsLoading: (value) => set({ isLoading: value })
}));