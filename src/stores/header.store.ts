import { create } from 'zustand';

interface HeaderStoreProps {
    // Title
    title: string;

    // Set handler to update the title
    setTitle: (title: string) => void;
}

export const useHeaderStore = create<HeaderStoreProps>((set) => ({
    title: '',
    setTitle: (title) => set({ title })
}));