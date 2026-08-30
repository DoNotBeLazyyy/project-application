import { create } from 'zustand';

interface BreadcrumbStore {
    customLabels: Record<string, string>;
    setCustomLabel: (pathOrId: string, label: string) => void;
    clearCustomLabels: () => void;
}

export const useBreadcrumbStore = create<BreadcrumbStore>((set) => ({
    customLabels: {},
    setCustomLabel: (pathOrId, label) => set((state) => ({
        customLabels: {
            ...state.customLabels,
            [pathOrId]: label
        }
    })),
    clearCustomLabels: () => set({ customLabels: {} })
}));