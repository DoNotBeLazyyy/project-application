import { CommonLocales } from '@type/common/store.type';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface LocaleStoreProps {
    // Locale
    locale: CommonLocales;

    // Set handler to update the locale
    setLocale: (params: CommonLocales) => void;
}

export const useLocalesStore = create(
    persist<LocaleStoreProps>(
        (set) => ({
            locale: 'ko',
            setLocale: (locale) => set({ locale })
        }), {
            name: 'localesStorage',
            storage: createJSONStorage(() => localStorage)
        }
    )
);