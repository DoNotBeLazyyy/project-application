import { HtmlDivElementNull } from '@type/common.type';
import { create } from 'zustand';

interface LayoutStore {
    // Content div reference
    divRef: HtmlDivElementNull;

    // Main div reference
    overflowDivRef: HtmlDivElementNull;

    // Check whether content div is fully visible
    isDivFullyVisible: () => boolean;

    // Update content div reference
    setDivRef: (ref: HtmlDivElementNull) => void;

    // To hide/show overdlow
    setOverflow: () => void;

    // Update overflow div reference
    setOverflowDivRef: (ref: HtmlDivElementNull) => void;
}

export const useLayoutStore = create<LayoutStore>((set, get) => ({
    divRef: null,
    overflowDivRef: null,
    isDivFullyVisible: () => {
        const divRef = get().divRef;

        if (!divRef) {
            return false;
        }

        const rect = divRef.getBoundingClientRect();

        return (
            rect.top >= 0
            && rect.left >= 0
            && rect.bottom <= window.innerHeight
            && rect.right <= window.innerWidth
        );
    },
    setDivRef: (ref) => set({ divRef: ref }),
    setOverflow: () => {
        const overflowEl = get().overflowDivRef;

        if (!overflowEl) {
            return;
        }

        const isVisible = get()
            .isDivFullyVisible();

        overflowEl.style.overflow = isVisible
            ? 'hidden'
            : 'auto';
    },
    setOverflowDivRef: (ref) => set({ overflowDivRef: ref })
}));