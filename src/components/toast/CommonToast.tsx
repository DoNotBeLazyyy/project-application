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
        <div className="fixed flex flex-col gap-2 top-4 right-4 left-4 sm:left-auto max-w-full sm:max-w-md z-9999 items-end pointer-events-none">
            {toasts.map(function(toast) {
                return (
                    <div
                        className="animate-fade-in bg-(--mui-palette-background-paper) border border-(--mui-palette-divider) flex gap-2 items-center justify-between pointer-events-auto pr-2 rounded-lg shadow-lg w-full sm:w-auto max-w-full overflow-hidden"
                        key={toast.id}
                    >
                        <CommonBadgeStatus
                            label={toast.message}
                            size="large"
                            sx={{
                                height: 'auto !important',
                                minWidth: 0,
                                flex: '1 1 auto',
                                maxWidth: '100%',
                                padding: '0.5rem 0.75rem !important',
                                '& .MuiChip-label': {
                                    padding: '0 !important',
                                    whiteSpace: 'normal',
                                    wordBreak: 'break-word',
                                    overflowWrap: 'anywhere'
                                }
                            }}
                            variant={toast.variant}
                        />
                        <button
                            aria-label="Dismiss toast"
                            className="cursor-pointer hover:text-(--mui-palette-grey-600) shrink-0 text-(--mui-palette-grey-400) p-1 rounded focus:outline-none"
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