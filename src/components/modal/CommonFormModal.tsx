import CommonActionModal, { CommonActionModalProps } from '@components/modal/CommonActionModal';
import DiscardChangesPromptModal from '@components/modal/DiscardChangesPromptModal';
import {
    FormDraftModalContext,
    FormDraftModalRegistration,
    getFormDraftByFormId
} from '@hooks/useFormDraft';
import { classMerge } from '@utils/css.util';
import { normalizeSx } from '@utils/theme.util';
import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';

export interface CommonFormModalProps extends CommonActionModalProps {
    confirmText?: string;
    formContent?: ReactNode;
    formId?: string;
    isDirty?: boolean;
    isLoading?: boolean;
    onConfirmClose?: () => boolean;
    onReset?: () => void;
    requireRealChanges?: boolean;
}

export default function CommonFormModal({
    cardProps,
    confirmText = 'Save',
    containerClassName,
    formContent,
    formId,
    formButtonsProps,
    fullScreen,
    hideCancel = false,
    isDirty,
    isLoading,
    requireRealChanges,
    sx,
    onClose,
    onConfirmClose: _onConfirmClose,
    onReset,
    ...props
}: CommonFormModalProps) {
    const { cancelProps, confirmProps, resetProps } = formButtonsProps ?? {};

    const [isDiscardPromptOpen, setIsDiscardPromptOpen] = useState(false);
    const [, setDraftVersion] = useState(0);
    const registeredDraftsRef = useRef<Map<string, FormDraftModalRegistration>>(new Map());
    const clearCallbacksRef = useRef<Map<string, () => void>>(new Map());

    const draftContextValue = useMemo(() => ({
        registerDraft(id: string, entry: FormDraftModalRegistration) {
            const prev = registeredDraftsRef.current.get(id);
            registeredDraftsRef.current.set(id, entry);
            clearCallbacksRef.current.set(id, entry.clearDraft);
            if (!prev || prev.hasRealChanges !== entry.hasRealChanges) {
                setDraftVersion((v) => v + 1);
            }
        },
        unregisterDraft(id: string) {
            if (registeredDraftsRef.current.has(id)) {
                registeredDraftsRef.current.delete(id);
                setDraftVersion((v) => v + 1);
            }
        }
    }), []);

    const clearAllDrafts = useCallback(() => {
        registeredDraftsRef.current.forEach((entry) => entry.clearDraft());
        clearCallbacksRef.current.forEach((clearFn) => clearFn());
        if (formId) {
            getFormDraftByFormId(formId)?.clearDraft();
        }
    }, [formId]);

    const prevOpenRef = useRef(Boolean(props.open));
    useEffect(() => {
        if (prevOpenRef.current && !props.open) {
            clearAllDrafts();
            clearCallbacksRef.current.clear();
            setIsDiscardPromptOpen(false);
        }
        prevOpenRef.current = Boolean(props.open);
    }, [props.open, clearAllDrafts]);

    const formIdDraft = formId ? getFormDraftByFormId(formId) : undefined;
    const registeredList = Array.from(registeredDraftsRef.current.values());
    const hasDraftRegistrations = registeredList.length > 0 || Boolean(formIdDraft);
    const hasRegisteredRealChanges = registeredList.some((d) => d.hasRealChanges) || Boolean(formIdDraft?.hasRealChanges);

    const isFilterOrSortModal = Boolean(onReset) || Boolean(formId && /filter|sort/i.test(formId));
    const hasRealChanges = !hideCancel && !isFilterOrSortModal && (
        hasDraftRegistrations
            ? hasRegisteredRealChanges
            : (_onConfirmClose ? !_onConfirmClose() : Boolean(isDirty))
    );

    const isConfirmDisabledByDirty = hasDraftRegistrations
        ? (requireRealChanges || isDirty !== undefined) && !hasRegisteredRealChanges
        : isDirty !== undefined
            ? isDirty === false
            : Boolean(requireRealChanges);

    function handleCloseModal() {
        if (isLoading || confirmProps?.loading) {
            return;
        }
        if (hasRealChanges) {
            setIsDiscardPromptOpen(true);
            return;
        }
        clearAllDrafts();
        onClose?.({}, 'escapeKeyDown');
    }

    function handleContinueEditing() {
        setIsDiscardPromptOpen(false);
    }

    function handleDiscardChanges() {
        setIsDiscardPromptOpen(false);
        clearAllDrafts();
        onClose?.({}, 'escapeKeyDown');
    }

    return (
        <FormDraftModalContext.Provider value={draftContextValue}>
            <CommonActionModal
                {...props}
                cardProps={{
                    ...cardProps,
                    // Header close (X). A page-supplied header action still wins.
                    defaultActionProps: cardProps?.cardHeaderProps?.action
                        ? undefined
                        : { onClick: handleCloseModal, ...cardProps?.defaultActionProps }
                }}
                containerClassName={
                    classMerge(
                        'w-full',
                        containerClassName
                    )
                }
                formButtonsProps={{
                    ...formButtonsProps,
                    cancelProps: hideCancel
                        ? undefined
                        : {
                            color: 'secondary',
                            variant: 'outlined',
                            onClick: handleCloseModal,
                            ...cancelProps
                        },
                    confirmProps: {
                        children: confirmText,
                        disabled: isConfirmDisabledByDirty || Boolean(isLoading) || Boolean(confirmProps?.disabled) || Boolean(confirmProps?.loading),
                        loading: Boolean(isLoading) || Boolean(confirmProps?.loading),
                        form: formId,
                        type: formId
                            ? 'submit'
                            : 'button',
                        ...confirmProps
                    },
                    resetProps: onReset
                        ? {
                            children: 'Reset',
                            color: 'secondary',
                            variant: 'outlined',
                            onClick: onReset,
                            ...resetProps
                        }
                        : resetProps
                }}
                fullScreen={fullScreen}
                hideCancel={hideCancel}
                sx={[
                    {
                        '& .MuiDialog-paper:not(.MuiDialog-paperFullScreen)': {
                            borderRadius: 'var(--mui-tokens-radius-lg)',
                            height: 'auto',
                            margin: { xs: '1rem', sm: 'auto' },
                            maxHeight: { xs: 'calc(100% - 2rem)', sm: '85%' },
                            maxWidth: { xs: 'calc(100% - 2rem)', sm: '60%' },
                            overflow: 'hidden',
                            width: { xs: 'calc(100% - 2rem)', sm: '60%' }
                        }
                    },
                    ...normalizeSx(sx)
                ]}
            >
                {formContent}
            </CommonActionModal>
            <DiscardChangesPromptModal
                open={isDiscardPromptOpen}
                onContinueEditing={handleContinueEditing}
                onDiscard={handleDiscardChanges}
            />
        </FormDraftModalContext.Provider>
    );
}