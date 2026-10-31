import { generateId } from '@utils/uuid.util';
import { create } from 'zustand';

type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
    id: string;
    message: string;
    variant: ToastVariant;
    createdAt?: number;
}

interface ToastStore {
    toasts: ToastItem[];
    showToast: (message: string, variant?: ToastVariant) => void;
    removeToast: (id: string) => void;
}

// One user action can reach the toast twice: the RPC wrapper shows the server's message and the page
// may confirm the same action in its own words. Treat those as one toast.
const SAME_ACTION_WINDOW_MS = 1500;

function normalizeMessage(message: string): string {
    return message.trim()
        .toLowerCase()
        .replace(/[.!\s]+$/, '');
}

export const useToastStore = create<ToastStore>(function(set) {
    return {
        toasts: [],
        showToast: function(message, variant = 'error') {
            try {
                const id = generateId();
                set(function(state) {
                    const now = Date.now();
                    const isDuplicate = state.toasts.some(function(t) {
                        if (t.variant !== variant) {
                            return false;
                        }
                        return normalizeMessage(t.message) === normalizeMessage(message)
                            || (variant === 'success' && now - (t.createdAt ?? 0) < SAME_ACTION_WINDOW_MS);
                    });
                    if (isDuplicate) {
                        return state;
                    }
                    const next = [
                        ...state.toasts.slice(-2),
                        {
                            createdAt: now, id, message, variant
                        }
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
            }
            catch {
                return;
            }
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