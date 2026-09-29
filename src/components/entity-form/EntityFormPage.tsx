import CommonButton from '@components/button/CommonButton';
import CommonCard from '@components/card/CommonCard';
import PageLoadingFallback from '@components/loading/PageLoadingFallback';
import UnsavedChangesPrompt from '@components/modal/UnsavedChangesPrompt';
import { useUnsavedChangesGuard } from '@hooks/useUnsavedChangesGuard';
import { ArrowLeftIcon, FloppyDiskIcon, PencilSimpleIcon } from '@phosphor-icons/react';
import { EntityFormMode, EntityFormModeText, EntityFormPageProps } from '@type/entity-form.type';
import { formErrors } from '@utils/form.util';
import { useEffect, useRef, useState } from 'react';
import { FieldValues, useForm } from 'react-hook-form';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';

function resolveModeText(text: EntityFormModeText | undefined, mode: EntityFormMode): string {
    if (!text) {
        return '';
    }

    if (typeof text === 'string') {
        return text;
    }

    return text[mode] ?? text.view ?? text.edit ?? text.create ?? '';
}

export default function EntityFormPage<TValues extends FieldValues>({
    backTo,
    canEdit = true,
    defaultValues,
    fetchById,
    formId,
    renderForm,
    subheader,
    title,
    onCreate,
    onUpdate,
    renderView
}: EntityFormPageProps<TValues>) {
    const { id = '' } = useParams<{ id: string }>();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const normalizedPath = pathname.replace(/\/+$/, '');
    const isCreate = id === 'new' || !id || normalizedPath.endsWith('/new');

    const [isEditing, setIsEditing] = useState(isCreate || searchParams.get('edit') === '1');
    const [isLoading, setIsLoading] = useState(!isCreate && Boolean(fetchById && id));
    const shouldExitAfterSave = useRef(false);

    const methods = useForm<TValues>({ defaultValues });
    const { control, formState, handleSubmit, reset } = methods;

    const mode: EntityFormMode = isCreate
        ? 'create'
        : isEditing
            ? 'edit'
            : 'view';
    const isDisabled = mode === 'view';

    useEffect(function() {
        if (isCreate || !fetchById || !id) {
            return;
        }

        let active = true;
        const load = fetchById;

        async function loadEntity() {
            setIsLoading(true);
            try {
                const result = await load(id);

                if (active && result.data) {
                    reset(result.data as TValues);
                }
            } finally {
                if (active) {
                    setIsLoading(false);
                }
            }
        }

        loadEntity();

        return function() {
            active = false;
        };
    }, [id, isCreate, fetchById, reset]);

    async function handleValid(values: TValues) {
        const exitAfterSave = shouldExitAfterSave.current;
        shouldExitAfterSave.current = false;

        if (isCreate) {
            const result = await onCreate?.(values);

            if (result && !result.error) {
                navigate(backTo);
            }

            return;
        }

        const result = await onUpdate?.(id, values);

        if (result && !result.error) {
            reset(values);
            setIsEditing(false);

            if (exitAfterSave) {
                navigate(backTo);
            }
        }
    }

    const submitHandler = handleSubmit(handleValid, function(errors) {
        shouldExitAfterSave.current = false;
        formErrors(errors, methods);
    });

    function navigateBack() {
        reset();
        navigate(backTo);
    }

    function exitEditing() {
        reset();

        if (isCreate || !fetchById) {
            navigate(backTo);
            return;
        }

        setIsEditing(false);
    }

    function saveThenNavigateBack() {
        shouldExitAfterSave.current = true;
        submitHandler();
    }

    const backGuard = useUnsavedChangesGuard({
        isDirty: formState.isDirty,
        onDiscard: navigateBack,
        onSave: saveThenNavigateBack
    });

    const cancelGuard = useUnsavedChangesGuard({
        isDirty: formState.isDirty,
        onDiscard: exitEditing,
        onSave: submitHandler
    });

    return (
        <CommonCard className="flex flex-col gap-4 h-full p-4 w-full">
            <div className="flex flex-wrap gap-4 items-start justify-between">
                <div className="flex gap-3 items-start">
                    <CommonButton
                        color="inherit"
                        size="small"
                        startIcon={<ArrowLeftIcon size={16} weight="bold" />}
                        variant="outlined"
                        onClick={backGuard.requestExit}
                    >
                        Back
                    </CommonButton>
                    <div className="flex flex-col gap-1">
                        <h1 className="font-semibold text-(--mui-palette-text-primary) text-xl">
                            {resolveModeText(title, mode)}
                        </h1>
                        {subheader && (
                            <p className="text-(--mui-palette-text-secondary) text-sm">
                                {resolveModeText(subheader, mode)}
                            </p>
                        )}
                    </div>
                </div>
                <div className="flex gap-2 items-center">
                    {mode === 'view' && canEdit && (
                        <CommonButton
                            size="small"
                            startIcon={<PencilSimpleIcon size={16} weight="bold" />}
                            variant="contained"
                            onClick={function() {
                                setIsEditing(true);
                            }}
                        >
                            Edit
                        </CommonButton>
                    )}
                    {mode !== 'view' && (
                        <>
                            <CommonButton
                                color="inherit"
                                size="small"
                                variant="outlined"
                                onClick={cancelGuard.requestExit}
                            >
                                Cancel
                            </CommonButton>
                            <CommonButton
                                disabled={!isCreate && !formState.isDirty}
                                form={formId}
                                size="small"
                                startIcon={<FloppyDiskIcon size={16} weight="bold" />}
                                type="submit"
                                variant="contained"
                            >
                                {isCreate
                                    ? 'Create'
                                    : 'Save'}
                            </CommonButton>
                        </>
                    )}
                </div>
            </div>
            <div className="flex-1 min-h-0 min-w-0 w-full max-w-full overflow-y-auto pr-4">
                {isLoading ? (
                    <PageLoadingFallback />
                ) : mode === 'view' && renderView ? (
                    renderView(methods.watch())
                ) : (
                    renderForm({
                        control,
                        disabled: isDisabled,
                        id: formId,
                        mode,
                        onSubmit: submitHandler
                    })
                )}
            </div>
            <UnsavedChangesPrompt
                open={backGuard.isPromptOpen}
                saveLabel={isCreate
                    ? 'Save and leave'
                    : 'Save changes'}
                subtitle="Save them before leaving this page, or discard them to leave without saving."
                onClose={backGuard.closePrompt}
                onDiscard={backGuard.confirmDiscard}
                onSave={backGuard.confirmSave}
            />
            <UnsavedChangesPrompt
                open={cancelGuard.isPromptOpen}
                subtitle="Save them, or discard them to revert this form."
                onClose={cancelGuard.closePrompt}
                onDiscard={cancelGuard.confirmDiscard}
                onSave={cancelGuard.confirmSave}
            />
        </CommonCard>
    );
}