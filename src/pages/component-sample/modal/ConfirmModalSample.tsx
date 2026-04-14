import CommonButton from '@components/button/CommonButton';
import ConfirmPromptModal from '@components/modal/ConfirmPromptModal';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * ConfirmPromptModalSample
 *
 * A demonstration component for the specialized ConfirmPromptModal, showcasing
 * success-themed confirmation workflows.
 *
 * @example
 * <ConfirmPromptModalSample />
 */
export default function ConfirmPromptModalSample() {
    const { t } = useTranslation(); // Translation hook
    const [isOpen, setIsOpen] = useState(false); // Modal visibility state

    /**
     * Opens the confirm modal.
     */
    function handleOpen() {
        setIsOpen(true);
    }

    /**
     * Closes the confirm modal.
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
                Open Confirm Modal
            </CommonButton>
            {isOpen && <ConfirmPromptModal
                mainContent={{ title: t('warning_main_label_placeholder') }}
                open={isOpen}
                subContent={{ title: t('warning_sub_label_placeholder') }}
                onClose={handleClose}
            />}
        </div>
    );
}