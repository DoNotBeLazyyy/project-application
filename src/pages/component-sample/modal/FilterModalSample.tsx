import CommonButton from '@components/button/CommonButton';
import FilterModal from '@components/modal/FilterModal';
import { useState } from 'react';

/**
 * FilterModalSample
 *
 * A demonstration component for the specialized FilterModal, showcasing
 * layout configuration for data refinement forms.
 *
 * @example
 * <FilterModalSample />
 */
export default function FilterModalSample() {
    const [isOpen, setIsOpen] = useState(false); // Modal visibility state

    /**
     * Opens the filter modal.
     */
    function handleOpen() {
        setIsOpen(true);
    }

    /**
     * Closes the filter modal.
     */
    function handleClose() {
        setIsOpen(false);
    }

    return (
        <div>
            <CommonButton onClick={handleOpen}>
                Open Filter Modal
            </CommonButton>
            {isOpen && <FilterModal
                open={isOpen}
                onClose={handleClose}
            />}
        </div>
    );
}