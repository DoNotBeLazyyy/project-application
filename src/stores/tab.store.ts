import { create } from 'zustand';

interface TabStoreProps {
    // Whether the global loading indicator is visible
    activeTab: number;

    // Manually sets the loading status (bypassing counter logic)
    setActiveTab: (activeTab: number) => void;
}

export const useTabStore = create<TabStoreProps>((set) => ({
    activeTab: 0,
    setActiveTab: (value) => set({ activeTab: value })
}));