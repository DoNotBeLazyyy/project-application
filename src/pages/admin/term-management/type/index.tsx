import CommonCard from '@components/card/CommonCard';
import CommonFormModal from '@components/modal/CommonFormModal';
import DeletePromptModal from '@components/modal/DeletePromptModal';
import TableCardActionMenu from '@components/table-card/TableCardActionMenu';
import { SxProps, Theme } from '@mui/material';
import TermTypeForm from '@pages/admin/term-management/type/TermTypeForm';
import TermTypeRow, { TERM_TYPE_GRID_CLASS } from '@pages/admin/term-management/type/TermTypeRow';
import { useTermTypeComposer } from '@pages/admin/term-management/type/useTermTypeComposer';
import {
    ArrowCounterClockwiseIcon,
    FloppyDiskIcon,
    PlusIcon
} from '@phosphor-icons/react';
import { TermTypeFormValues } from '@type/term/term-type.type';
import { formErrors } from '@utils/form.util';
import { useEffect } from 'react';
import { FieldErrors, useForm } from 'react-hook-form';

const CREATE_FORM_ID = 'create-term-type-form';
const UPDATE_FORM_ID = 'update-term-type-form';

const COLUMN_HEAD_CLASS = 'font-bold text-(--mui-palette-text-secondary) text-[10.5px] tracking-[0.1em] uppercase';

const INFO_CONTENT = 'Manage the chronological sequence of term types (e.g. 1st Semester, 2nd Semester, Summer) used across academic calendar schedules, curriculum maps, student batch progression, and transcripts.';

const HEADER_SX: SxProps<Theme> = {
    borderBottom: '1px solid var(--mui-palette-grey-100)',
    boxShadow: '0 10px 10px -10px rgb(15 23 42 / 0.18)',
    gap: 'var(--mui-tokens-spacing-5)',
    pb: 2.5,
    position: 'relative',
    zIndex: 1,
    '&& .MuiCardHeader-action': {
        display: 'flex',
        flexBasis: 'auto',
        flexGrow: 1,
        justifyContent: 'flex-end',
        marginLeft: 'auto'
    }
};

const DEFAULT_FORM_VALUES: TermTypeFormValues = {
    code: '',
    description: '',
    label: '',
    sequence: ''
};

/**
 * TermTypeManagement
 *
 * Sequential editor for academic term types. Replaces the generic card grid with
 * an ordered chronological rail and one-click up/down buttons matching the Grading Period UI.
 */
export default function TermTypeManagement() {
    const {
        handleCloseCreate,
        handleCloseDelete,
        handleCloseEdit,
        handleConfirmDelete,
        handleCreateSubmit,
        handleMove,
        handleOpenCreate,
        handleOpenDelete,
        handleOpenEdit,
        handleReset,
        handleSaveOrder,
        handleUpdateSubmit,
        isCreateOpen,
        isDeleteOpen,
        isDirty,
        isLoading,
        isSaving,
        isUpdateOpen,
        selectedItem,
        termTypes
    } = useTermTypeComposer();

    const createMethods = useForm<TermTypeFormValues>({
        defaultValues: DEFAULT_FORM_VALUES
    });

    const updateMethods = useForm<TermTypeFormValues>({
        defaultValues: DEFAULT_FORM_VALUES
    });

    useEffect(function() {
        if (selectedItem) {
            updateMethods.reset({
                code: selectedItem.code,
                description: selectedItem.description ?? '',
                label: selectedItem.label,
                sequence: String(selectedItem.sequence)
            });
        }
    }, [selectedItem, updateMethods]);

    function handleCreateError(errors: FieldErrors<TermTypeFormValues>) {
        formErrors(errors, createMethods);
    }

    function handleUpdateError(errors: FieldErrors<TermTypeFormValues>) {
        formErrors(errors, updateMethods);
    }

    return (
        <div className="flex flex-1 flex-col h-full min-h-0 w-full">
            <CommonCard
                cardHeaderProps={{
                    action: (
                        <div className="flex gap-(--mui-tokens-spacing-3) items-center justify-end w-full">
                            <TableCardActionMenu
                                extraOptions={[
                                    {
                                        children: 'Add Term Type',
                                        disabled: isLoading || isSaving,
                                        icon: <PlusIcon size={20} weight="bold" />,
                                        key: 'add-term-type',
                                        onClick: function() {
                                            createMethods.reset(DEFAULT_FORM_VALUES);
                                            handleOpenCreate();
                                        }
                                    },
                                    ...(isDirty
                                        ? [
                                            {
                                                children: isSaving
                                                    ? 'Saving...'
                                                    : 'Save Order',
                                                disabled: isSaving,
                                                icon: <FloppyDiskIcon size={20} weight="bold" />,
                                                key: 'save-order',
                                                onClick: handleSaveOrder
                                            },
                                            {
                                                children: 'Cancel',
                                                disabled: isSaving,
                                                icon: <ArrowCounterClockwiseIcon size={20} weight="bold" />,
                                                key: 'cancel',
                                                onClick: handleReset
                                            }
                                        ]
                                        : [])
                                ]}
                                inlineActionLimit={0}
                            />
                        </div>
                    ),
                    className: '@container shrink-0',
                    sx: HEADER_SX,
                    title: 'Term Type Management'
                }}
                className="flex flex-1 flex-col h-full min-h-0 w-full"
                infoContent={INFO_CONTENT}
            >
                {isLoading
                    ? (
                        <div className="flex items-center justify-center py-16">
                            <span className="text-(--mui-palette-text-secondary) text-sm">Loading...</span>
                        </div>
                    )
                    : (
                        <div className="flex flex-1 flex-col gap-4 min-h-0 p-4">
                            <div className="flex flex-col min-h-0 min-w-0 overflow-auto">
                                {termTypes.length > 0 && (
                                    <div className={`${TERM_TYPE_GRID_CLASS} bg-(--mui-palette-background-paper) pb-2 sticky top-0 z-10`}>
                                        <span className={COLUMN_HEAD_CLASS}>#</span>
                                        <span className={COLUMN_HEAD_CLASS}>Term Type</span>
                                        <span className={COLUMN_HEAD_CLASS}>Code</span>
                                        <span className={COLUMN_HEAD_CLASS}>Description</span>
                                        <span className={`${COLUMN_HEAD_CLASS} justify-self-end`}>Actions</span>
                                    </div>
                                )}

                                {termTypes.map((item, index) => (
                                    <TermTypeRow
                                        canMoveDown={index < termTypes.length - 1}
                                        canMoveUp={index > 0}
                                        disabled={isSaving}
                                        index={index}
                                        key={item.id}
                                        row={item}
                                        onDelete={handleOpenDelete}
                                        onEdit={handleOpenEdit}
                                        onMove={function(direction) {
                                            handleMove(index, direction);
                                        }}
                                    />
                                ))}

                                {termTypes.length === 0 && (
                                    <p className="py-12 text-(--mui-palette-text-secondary) text-center text-sm">
                                        No term types configured yet. Click &quot;Add Term Type&quot; to create the first term.
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
            </CommonCard>

            {/* Create Modal */}
            <CommonFormModal
                cardProps={{
                    cardHeaderProps: {
                        subheader: 'Add a new academic term type to the sequence ladder.',
                        title: 'Create Term Type'
                    }
                }}
                confirmText="Create Term Type"
                formContent={(
                    <TermTypeForm
                        control={createMethods.control}
                        id={CREATE_FORM_ID}
                        onSubmit={createMethods.handleSubmit(handleCreateSubmit, handleCreateError)}
                    />
                )}
                formId={CREATE_FORM_ID}
                open={isCreateOpen}
                sx={{
                    '& .MuiDialog-paper': {
                        height: 'auto',
                        margin: 'auto',
                        maxHeight: { sm: '85%', xs: '90%' },
                        maxWidth: '680px',
                        overflow: 'hidden',
                        width: { md: '680px', sm: '640px', xs: '92%' }
                    }
                }}
                onClose={handleCloseCreate}
            />

            {/* Edit Modal */}
            <CommonFormModal
                cardProps={{
                    cardHeaderProps: {
                        subheader: selectedItem
                            ? `Update the details of ${selectedItem.label}.`
                            : 'Update term type details.',
                        title: 'Edit Term Type'
                    }
                }}
                confirmText="Save Changes"
                formContent={(
                    <TermTypeForm
                        control={updateMethods.control}
                        id={UPDATE_FORM_ID}
                        onSubmit={updateMethods.handleSubmit(handleUpdateSubmit, handleUpdateError)}
                    />
                )}
                formId={UPDATE_FORM_ID}
                open={isUpdateOpen}
                sx={{
                    '& .MuiDialog-paper': {
                        height: 'auto',
                        margin: 'auto',
                        maxHeight: { sm: '85%', xs: '90%' },
                        maxWidth: '680px',
                        overflow: 'hidden',
                        width: { md: '680px', sm: '640px', xs: '92%' }
                    }
                }}
                onClose={handleCloseEdit}
            />

            {/* Delete Prompt Modal */}
            <DeletePromptModal
                formButtonsProps={{
                    confirmProps: {
                        onClick: handleConfirmDelete
                    }
                }}
                mainContent={{
                    title: selectedItem
                        ? `Delete ${selectedItem.label}?`
                        : 'Delete this term type?'
                }}
                open={isDeleteOpen}
                subContent={{ title: 'This will remove the term type from the sequence ladder. This action cannot be undone.' }}
                onClose={handleCloseDelete}
            />
        </div>
    );
}