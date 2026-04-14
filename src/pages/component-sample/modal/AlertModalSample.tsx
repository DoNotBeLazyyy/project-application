import CommonButton from '@components/button/CommonButton';
import AlertPromptModal from '@components/modal/AlertPromptModal';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * AlertPromptModalSample
 *
 * A demonstration component for the specialized AlertPromptModal, showcasing
 * warning-level transactional feedback.
 *
 * @example
 * <AlertPromptModalSample />
 */
export default function AlertPromptModalSample() {
    const { t } = useTranslation(); // Translation hook
    const [isOpen, setIsOpen] = useState(false); // Modal visibility state

    /**
     * Opens the alert modal.
     */
    function handleOpen() {
        setIsOpen(true);
    }

    /**
     * Closes the alert modal.
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
                Open Alert Modal
            </CommonButton>
            {isOpen && <AlertPromptModal
                mainContent={{ title: t('warning_main_label_placeholder') }}
                open={isOpen}
                subContent={{ title: t('warning_sub_label_placeholder') }}
                onClose={handleClose}
            />}
        </div>
    );
}