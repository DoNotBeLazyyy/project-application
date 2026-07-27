import CommonButton from '@components/button/CommonButton';
import CommonCard from '@components/card/CommonCard';
import ConfirmPromptModal from '@components/modal/ConfirmPromptModal';
import { ArrowLeftIcon, FloppyDiskIcon, PencilSimpleIcon } from '@phosphor-icons/react';
import { EntityFormMode, EntityFormModeText, EntityFormPageProps } from '@type/entity-form.type';
import { formErrors } from '@utils/form.util';
import { useEffect, useState } from 'react';
import { FieldValues, useForm } from 'react-hook-form';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

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
    onUpdate
}: EntityFormPageProps<TValues>) {
    const { id = '' } = useParams<{ id: string }>();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const isCreate = id === 'new';

    const [isEditing, setIsEditing] = useState(isCreate || searchParams.get('edit') === '1');
    const [isDiscardOpen, setIsDiscardOpen] = useState(false);

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
            const result = await load(id);

            if (active && result.data) {
                reset(result.data as TValues);
            }
        }

        loadEntity();

        return function() {
            active = false;
        };
    }, [id, isCreate, fetchById, reset]);

    async function handleValid(values: TValues) {
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
        }
    }

    function requestExit() {
        if (formState.isDirty) {
            setIsDiscardOpen(true);
            return;
        }

        exitEditing();
    }

    function exitEditing() {
        setIsDiscardOpen(false);

        if (isCreate || isEditing) {
            reset();
        }

        if (isCreate || !fetchById || !isEditing) {
            navigate(backTo);
            return;
        }

        setIsEditing(false);
    }

    const submitHandler = handleSubmit(handleValid, function(errors) {
        formErrors(errors, methods);
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
                        onClick={requestExit}
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
                                onClick={requestExit}
                            >
                                Cancel
                            </CommonButton>
                            <CommonButton
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
            <div className="flex-1 min-h-0 overflow-y-auto">
                {renderForm({
                    control,
                    disabled: isDisabled,
                    id: formId,
                    mode,
                    onSubmit: submitHandler
                })}
            </div>
            <ConfirmPromptModal
                formButtonsProps={{
                    cancelProps: {
                        onClick: function() {
                            setIsDiscardOpen(false);
                        }
                    },
                    confirmProps: {
                        children: 'Discard',
                        color: 'error',
                        onClick: exitEditing
                    }
                }}
                mainContent={{ title: 'Discard unsaved changes?' }}
                open={isDiscardOpen}
                subContent={{ title: 'Your changes will be lost. This cannot be undone.' }}
                onClose={function() {
                    setIsDiscardOpen(false);
                }}
            />
        </CommonCard>
    );
}