import { create } from 'zustand';

type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
    id: string;
    message: string;
    variant: ToastVariant;
}

interface ToastStore {
    toasts: ToastItem[];
    showToast: (message: string, variant?: ToastVariant) => void;
    removeToast: (id: string) => void;
}

export const useToastStore = create<ToastStore>(function(set) {
    return {
        toasts: [],
        showToast: function(message, variant = 'error') {
            const id = crypto.randomUUID();
            set(function(state) {
                const next = [
                    ...state.toasts.slice(-2),
                    { id, message, variant }
                ];
                return { toasts: next };
            });
            setTimeout(function() {
                set(function(state) {
                    return {
                        toasts: state.toasts.filter(function(t) {
                            return t.id !== id;
                        })
                    };
                });
            }, 4000);
        },
        removeToast: function(id) {
            set(function(state) {
                return {
                    toasts: state.toasts.filter(function(t) {
                        return t.id !== id;
                    })
                };
            });
        }
    };
});