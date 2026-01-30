import translationEN from '@locales/en/index';
import translationKO from '@locales/ko/index';
import { useLocalesStore } from '@stores/locale.store';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const { locale } = useLocalesStore.getState();

const resources = {
    en: {
        translation: translationEN
    },
    ko: {
        translation: translationKO
    }
};

export default i18n.use(initReactI18next)
    .init({
        debug: true,
        interpolation: {
            escapeValue: false
        },
        lng: locale || 'ko',
        resources
    });