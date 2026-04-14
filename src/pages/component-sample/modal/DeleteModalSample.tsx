import CommonButton from '@components/button/CommonButton';
import DeletePromptModal from '@components/modal/DeletePromptModal';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * DeletePromptModalSample
 *
 * A demonstration component for the specialized DeletePromptModal, showcasing
 * destructive action confirmation with error state styling.
 *
 * @example
 * <DeletePromptModalSample />
 */
export default function DeletePromptModalSample() {
    const { t } = useTranslation(); // Translation hook
    const [isOpen, setIsOpen] = useState(false); // Modal visibility state

    /**
     * Opens the delete modal.
     */
    function handleOpen() {
        setIsOpen(true);
    }

    /**
     * Closes the delete modal.
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
                Open Delete Modal
            </CommonButton>
            {isOpen && <DeletePromptModal
                mainContent={{ title: t('delete_main_label_placeholder') }}
                open={isOpen}
                subContent={{ title: t('delete_sub_label_placeholder') }}
                onClose={handleClose}
            />}
        </div>
    );
}