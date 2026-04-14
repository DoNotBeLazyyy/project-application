import AlertModal from '@components/modal/AlertModal';
import CommonModal from '@components/modal/CommonModal';
import ConfirmModal from '@components/modal/ConfirmModal';
import DeleteModal from '@components/modal/DeleteModal';
import FilterModal from '@components/modal/FilterModal';
import TypedConfirmDeleteModal from '@components/modal/TypedConfirmDeleteModal';
import { Typography } from '@mui/material';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * ModalSamplePage
 *
 * A dedicated page demonstrating state management and usage of various specialized modals.
 *
 * @example
 * <ModalSamplePage />
 */
export default function ModalSamplePage() {
    const { t } = useTranslation(); // Translation hook
    const [isAlertOpen, setIsAlertOpen] = useState(false); // Alert modal visibility state
    const [isConfirmOpen, setIsConfirmOpen] = useState(false); // Confirm modal visibility state
    const [isDeleteOpen, setIsDeleteOpen] = useState(false); // Delete modal visibility state
    const [isModalOpen, setIsModalOpen] = useState(false); // Common modal visibility state
    const [isTypedDeleteOpen, setIsTypedDeleteOpen] = useState(false); // Typed delete modal visibility state
    const resolvedCommonModalCardProps = {
        cardHeaderProps: {
            subheader: 'Please confirm your action',
            title: 'Confirm Action'
        }
    }; // Resolved card properties for the common modal
    const resolvedTypedDeleteCardProps = {
        cardHeaderProps: {
            title: 'Delete Mandatory Deduction?',
            defaultActionProps: {
                onClick: handleCloseTypedDelete
            }
        }
    }; // Resolved card properties for the typed delete modal
    const resolvedTypedDeleteButtonProps = {
        confirmProps: {
            children: 'I understand, delete this mandatory deduction'
        }
    }; // Resolved button configuration for typed delete
    const typedDeleteContentMessage = 'We’re about to delete “SSS Pagibig” and all associated data including its pay rates. This may affect payroll generation. \n\nIf you’re certain, type sss-pagibig below to confirm. '; // Raw message string
    const resolvedTypedDeleteContent = {
        children: (
            <p className="text-(--mui-tokens-color-neutral-700) whitespace-pre-wrap">
                {typedDeleteContentMessage}
            </p>
        )
    }; // Resolved content attributes for typed delete
    const resolvedTypedDeleteHeader = {
        children: (
            <div className="flex flex-col pl-(--mui-tokens-spacing-4)">
                <span>
                    SSS Pag-ibig
                </span>
                <div className="flex gap-(--mui-tokens-spacing-3) items-center">
                    <div className="bg-[blue] h-[1rem] w-[1rem]" /> Philippines
                </div>
            </div>
        )
    }; // Resolved header attributes for typed delete

    /**
     * Closes the alert modal.
     *
     * @returns
     */
    function handleCloseAlert() {
        setIsAlertOpen(false);
    }

    /**
     * Opens the alert modal.
     *
     * @returns
     */
    function handleOpenAlert() {
        setIsAlertOpen(true);
    }

    /**
     * Closes the confirm modal.
     *
     * @returns
     */
    function handleCloseConfirm() {
        setIsConfirmOpen(false);
    }

    /**
     * Opens the confirm modal.
     *
     * @returns
     */
    function handleOpenConfirm() {
        setIsConfirmOpen(true);
    }

    /**
     * Closes the delete modal.
     *
     * @returns
     */
    function handleCloseDelete() {
        setIsDeleteOpen(false);
    }

    /**
     * Opens the delete modal.
     *
     * @returns
     */
    function handleOpenDelete() {
        setIsDeleteOpen(true);
    }

    /**
     * Closes the common modal.
     *
     * @returns
     */
    function handleCloseModal() {
        setIsModalOpen(false);
    }

    /**
     * Opens the common modal.
     *
     * @returns
     */
    function handleOpenModal() {
        setIsModalOpen(true);
    }

    /**
     * Closes the typed delete modal.
     *
     * @returns
     */
    function handleCloseTypedDelete() {
        setIsTypedDeleteOpen(false);
    }

    /**
     * Opens the typed delete modal.
     *
     * @returns
     */
    function handleOpenTypedDelete() {
        setIsTypedDeleteOpen(true);
    }

    return (
        <Box
            className="bg-[#F4F4F5] flex flex-wrap gap-[16px] items-center justify-center min-h-screen p-[40px]"
        >
            <Button
                disableElevation
                variant="contained"
                onClick={handleOpenModal}
            >
                Open Modal
            </Button>
            <Button
                disableElevation
                variant="contained"
                onClick={handleOpenDelete}
            >
                Open Delete Modal
            </Button>
            <Button
                disableElevation
                variant="contained"
                onClick={handleOpenConfirm}
            >
                Open Confirm Modal
            </Button>
            <Button
                disableElevation
                variant="contained"
                onClick={handleOpenAlert}
            >
                Open Alert Modal
            </Button>
            <Button
                disableElevation
                variant="contained"
                onClick={handleOpenTypedDelete}
            >
                Open Typed Delete Modal
            </Button>
            {isModalOpen && (
                <CommonModal
                    cardProps={resolvedCommonModalCardProps}
                    closeOnEscape
                    open={isModalOpen}
                    onClose={handleCloseModal}
                >
                    <div className="flex flex-col gap-[12px]" >
                        <Typography>
                            Are you sure you want to proceed with this action?
                        </Typography>

                        <Typography>
                            Clicking the backdrop or the &quot;X&quot; button will trigger the close event seamlessly.
                        </Typography>
                    </div>
                </CommonModal>
            )}
            {isConfirmOpen && (
                <ConfirmModal
                    mainContent={{
                        title: t('warning_main_label_placeholder')
                    }}
                    open={isConfirmOpen}
                    subContent={{
                        title: t('warning_sub_label_placeholder')
                    }}
                    onClose={handleCloseConfirm}
                />
            )}
            {isAlertOpen && (
                <AlertModal
                    mainContent={{
                        title: t('warning_main_label_placeholder')
                    }}
                    open={isAlertOpen}
                    subContent={{
                        title: t('warning_sub_label_placeholder')
                    }}
                    onClose={handleCloseAlert}
                />
            )}
            {isDeleteOpen && (
                <DeleteModal
                    mainContent={{
                        title: t('delete_main_label_placeholder')
                    }}
                    open={isDeleteOpen}
                    subContent={{
                        title: t('delete_sub_label_placeholder')
                    }}
                    onClose={handleCloseDelete}
                />
            )}
            {isTypedDeleteOpen && (
                <TypedConfirmDeleteModal
                    cardProps={resolvedTypedDeleteCardProps}
                    inputProps={{
                        label: t('confirm')
                    }}
                    modalButtonProps={resolvedTypedDeleteButtonProps}
                    modalContent={resolvedTypedDeleteContent}
                    modalHeader={resolvedTypedDeleteHeader}
                    open={isTypedDeleteOpen}
                    onClose={handleCloseTypedDelete}
                />
            )}
            <FilterModal open />
        </Box>
    );
}