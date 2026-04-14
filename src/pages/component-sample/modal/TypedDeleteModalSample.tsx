import CommonButton from '@components/button/CommonButton';
import TypedConfirmDeletePromptModal from '@components/modal/TypedConfirmDeletePromptModal';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * TypedDeletePromptModalSample
 *
 * A demonstration component for the TypedConfirmDeletePromptModal, showcasing
 * high-friction destructive workflows requiring user confirmation input.
 *
 * @example
 * <TypedDeletePromptModalSample />
 */
export default function TypedDeletePromptModalSample() {
    const { t } = useTranslation(); // Translation hook
    const [isOpen, setIsOpen] = useState(false); // Modal visibility state

    /**
     * Opens the typed delete modal.
     */
    function handleOpen() {
        setIsOpen(true);
    }

    /**
     * Closes the typed delete modal.
     */
    function handleClose() {
        setIsOpen(false);
    }

    return (
        <div>
            <CommonButton
                variant="primary"
                onClick={handleOpen}
            >
                Open Typed Delete Modal
            </CommonButton>
            {isOpen && <TypedConfirmDeletePromptModal
                cardProps={{
                    cardHeaderProps: {
                        title: 'Delete Mandatory Deduction?'
                    },
                    defaultActionProps: {
                        onClick: handleClose
                    }
                }}
                inputProps={{
                    label: t('confirm')
                }}
                modalButtonProps={{
                    confirmProps: { children: 'I understand, delete this mandatory deduction' }
                }}
                modalContent={{
                    children: (
                        <p className="text-(--mui-tokens-color-neutral-700) tw_body_medium whitespace-pre-wrap">
                            {'We\'re about to delete "SSS Pagibig" and all associated data including its pay rates. This may affect payroll generation. \n\nIf you\'re certain, type sss-pagibig below to confirm.'}
                        </p>
                    )
                }}
                modalHeader={{
                    children: (
                        <div className="flex flex-col pl-(--mui-tokens-spacing-4)">
                            <span className="tw_body_medium_bold">
                                SSS Pag-ibig
                            </span>
                            <div className="flex gap-(--mui-tokens-spacing-3) items-center tw_body_small">
                                <div className="bg-[blue] h-4 w-4" />
                                Philippines
                            </div>
                        </div>
                    )
                }}
                open={isOpen}
                onClose={handleClose}
            />}
        </div>
    );
}