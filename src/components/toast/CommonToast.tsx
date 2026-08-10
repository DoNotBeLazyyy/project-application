import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import { XIcon } from '@phosphor-icons/react';
import { useToastStore } from '@stores/toast.store';
import { FORM_ERROR_EVENT, FormErrorEventDetail } from '@utils/form.util';
import { useEffect } from 'react';

export default function CommonToast() {
    const { toasts, removeToast } = useToastStore();
    const showToast = useToastStore((s) => s.showToast);

    useEffect(function() {
        function handleFormError(event: Event) {
            const detail = (event as CustomEvent<FormErrorEventDetail>).detail;

            if (detail?.message) {
                showToast(detail.message, 'warning');
            }
        }

        window.addEventListener(FORM_ERROR_EVENT, handleFormError);

        return function() {
            window.removeEventListener(FORM_ERROR_EVENT, handleFormError);
        };
    }, [showToast]);

    if (!toasts.length) {
        return null;
    }

    return (
        <div className="fixed flex flex-col gap-2 right-4 top-4 z-9999">
            {toasts.map(function(toast) {
                return (
                    <div
                        className="animate-fade-in bg-(--mui-palette-background-paper) border border-(--mui-palette-divider) flex gap-2 items-center max-w-min pr-2 rounded-lg shadow-lg"
                        key={toast.id}
                    >
                        <CommonBadgeStatus
                            label={toast.message}
                            size="large"
                            sx={{
                                height: 'auto !important',
                                padding: '0.5rem 1rem !important',
                                '& .MuiChip-label': {
                                    padding: '0 !important',
                                    whiteSpace: 'normal',
                                    wordBreak: 'break-word'
                                }
                            }}
                            variant={toast.variant}
                        />
                        <button
                            className="cursor-pointer hover:text-(--mui-palette-grey-600) shrink-0 text-(--mui-palette-grey-400)"
                            onClick={function() {
                                removeToast(toast.id);
                            }}
                        >
                            <XIcon size={14} weight="bold" />
                        </button>
                    </div>
                );
            })}
        </div>
    );
}