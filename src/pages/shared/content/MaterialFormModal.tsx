import CommonButton from '@components/button/CommonButton';
import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import FormLabel from '@components/form/FormLabel';
import CommonModal from '@components/modal/CommonModal';
import DiscardChangesPromptModal from '@components/modal/DiscardChangesPromptModal';
import DraftRecoveryPromptModal from '@components/modal/DraftRecoveryPromptModal';
import { useObjectDraft } from '@hooks/use-form-draft';
import { isBlankText, MATERIAL_URL_PATTERN } from '@pages/shared/content/content-form.constant';
import { UploadSimpleIcon } from '@phosphor-icons/react';
import { createMaterial, MATERIAL_TYPE_OPTIONS, updateMaterial } from '@services/content.service';
import { uploadFile } from '@services/storage.service';
import { CourseMaterial, MaterialType } from '@type/content.type';
import { generateId } from '@utils/uuid.util';
import {
    ChangeEvent, useEffect, useMemo, useRef, useState
} from 'react';
import { useForm, useWatch } from 'react-hook-form';

interface MaterialFormModalProps {
    open: boolean;
    sectionId: string;
    moduleId: string;
    material: CourseMaterial | null;
    onClose: VoidFunction;
    onSaved: VoidFunction;
}

interface MaterialFormValues {
    title: string;
    description: string;
    materialType: MaterialType;
    externalUrl: string;
}

function toFormValues(material: CourseMaterial | null): MaterialFormValues {
    return {
        description: material?.description ?? '',
        externalUrl: material?.external_url ?? '',
        materialType: material?.material_type ?? 'File',
        title: material?.title ?? ''
    };
}

export default function MaterialFormModal({
    open,
    sectionId,
    moduleId,
    material,
    onClose,
    onSaved
}: MaterialFormModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [fileError, setFileError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isDiscardOpen, setIsDiscardOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isEdit = material !== null;

    const defaultValues = useMemo(function() {
        return toFormValues(material);
    }, [material]);

    const { control, handleSubmit, reset, setValue } = useForm<MaterialFormValues>({ defaultValues });

    const watchedValues = useWatch({ control });
    const materialType = watchedValues.materialType ?? 'File';
    const isLink = materialType === 'Link';

    const currentValues = useMemo<MaterialFormValues>(function() {
        return {
            description: watchedValues.description ?? '',
            externalUrl: watchedValues.externalUrl ?? '',
            materialType: watchedValues.materialType ?? 'File',
            title: watchedValues.title ?? ''
        };
    }, [watchedValues]);

    const draftGuard = useObjectDraft({
        formId: material?.id
            ? `material-form-${moduleId}-${material.id}`
            : `material-form-${moduleId}-create`,
        values: currentValues,
        defaultValues,
        onRestore: function(restored) {
            setValue('title', restored.title ?? '');
            setValue('description', restored.description ?? '');
            setValue('materialType', restored.materialType ?? 'File');
            setValue('externalUrl', restored.externalUrl ?? '');
        },
        enabled: open
    });

    const hasRealChanges = draftGuard.hasRealChanges || (!isEdit && file !== null);

    const isUnchanged = isEdit
        && currentValues.title.trim() === (material?.title ?? '')
        && (currentValues.description.trim() || null) === (material?.description ?? null)
        && (!isLink || (currentValues.externalUrl.trim() || null) === (material?.external_url ?? null));

    useEffect(function() {
        if (!open) {
            setIsDiscardOpen(false);
            return;
        }

        reset(toFormValues(material));
        setFile(null);
        setFileError(null);

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }, [open, material, reset]);

    const fields: FormFieldConfig<MaterialFormValues>[] = [
        {
            placeholder: 'e.g. Course Syllabus or Week 1: Lecture Slides',
            gridCols: 2,
            label: 'Title',
            name: 'title',
            rules: {
                required: 'Title is required',
                validate: (value: unknown) => !isBlankText(value) || 'Title cannot be empty or whitespace only'
            },
            type: 'text'
        },
        {
            fieldProps: { maxLength: 1000 },
            placeholder: 'Brief description, learning outcomes, chapter coverage, or reading guide...',
            gridCols: 2,
            label: 'Description & Learning Objectives',
            name: 'description',
            type: 'text-area'
        },
        ...(isEdit
            ? []
            : [
                {
                    gridCols: 2,
                    label: 'Type',
                    name: 'materialType' as const,
                    options: MATERIAL_TYPE_OPTIONS,
                    rules: { required: 'Type is required' },
                    type: 'select' as const
                }
            ]),
        ...(isLink
            ? [
                {
                    placeholder: 'https://...',
                    gridCols: 2,
                    label: 'URL',
                    name: 'externalUrl' as const,
                    rules: {
                        pattern: MATERIAL_URL_PATTERN,
                        required: 'URL is required for link materials',
                        validate: (value: unknown) => !isBlankText(value) || 'URL is required for link materials'
                    },
                    type: 'text' as const
                }
            ]
            : [])
    ];

    function handleRequestClose() {
        if (isSaving) return;
        if (hasRealChanges) {
            setIsDiscardOpen(true);
            return;
        }
        draftGuard.clearDraft();
        onClose();
    }

    function handleConfirmDiscard() {
        draftGuard.clearDraft();
        setIsDiscardOpen(false);
        onClose();
    }

    function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
        const selected = e.target.files?.[0] ?? null;
        setFile(selected);
        if (selected) {
            setFileError(null);
        }
    }

    function finishSave() {
        draftGuard.clearDraft();
        onSaved();
        onClose();
    }

    async function handleValidSave(values: MaterialFormValues) {
        const title = values.title.trim();
        const description = values.description.trim() || null;
        const externalUrl = values.externalUrl.trim();

        if (!isEdit && !isLink && !file) {
            setFileError('Choose a file to upload');
            return;
        }

        setIsSaving(true);

        if (isEdit && material) {
            const result = await updateMaterial(
                material.id,
                title,
                description,
                isLink
                    ? externalUrl || null
                    : null
            );

            setIsSaving(false);

            if (!result.error) {
                finishSave();
            }

            return;
        }

        if (isLink) {
            const result = await createMaterial({
                description,
                externalUrl,
                materialType: values.materialType,
                moduleId,
                title
            });

            setIsSaving(false);

            if (!result.error) {
                finishSave();
            }

            return;
        }

        if (!file) {
            setIsSaving(false);
            return;
        }

        const path = `${sectionId}/${moduleId}/${generateId()}-${file.name}`;
        const uploadResult = await uploadFile({
            bucket: 'materials', file, path
        });

        if (uploadResult.error) {
            setIsSaving(false);
            return;
        }

        const result = await createMaterial({
            description,
            fileName: file.name,
            fileSizeBytes: file.size,
            fileUrl: path,
            materialType: values.materialType,
            mimeType: file.type || null,
            moduleId,
            title
        });

        setIsSaving(false);

        if (!result.error) {
            finishSave();
        }
    }

    function handleSave() {
        if (!isEdit && !isLink && !file) {
            setFileError('Choose a file to upload');
        }
        handleSubmit(handleValidSave)();
    }

    return (
        <>
            <CommonModal
                cardProps={{ className: 'flex flex-col gap-4 max-w-full p-4 sm:p-6 w-full sm:w-[32rem]' }}
                open={open}
                onClose={handleRequestClose}
            >
                <h2 className="font-semibold text-(--mui-palette-text-primary) text-lg">
                    {isEdit
                        ? 'Edit Material'
                        : 'Add Material'}
                </h2>
                <CommonForm
                    component="div"
                    containerClassName="grid grid-cols-1 md:grid-cols-2 gap-4"
                    control={control}
                    enableDraftRecovery={false}
                    fields={fields}
                />
                {!isLink && !isEdit && (
                    <div className="flex flex-col gap-1">
                        <FormLabel
                            errorMessage={fileError ?? undefined}
                            isRequired
                            label="File"
                        />
                        <input
                            className="hidden"
                            ref={fileInputRef}
                            type="file"
                            onChange={handleFileChange}
                        />
                        <CommonButton
                            color={fileError
                                ? 'error'
                                : 'inherit'}
                            startIcon={<UploadSimpleIcon size={16} />}
                            variant="outlined"
                            onClick={function() {
                                fileInputRef.current?.click();
                            }}
                        >
                            {file
                                ? file.name
                                : 'Choose file'}
                        </CommonButton>
                        {fileError && (
                            <span
                                className="text-(--mui-palette-error-main) text-xs"
                                role="alert"
                            >
                                {fileError}
                            </span>
                        )}
                    </div>
                )}
                <div className="flex gap-2 justify-end">
                    <CommonButton
                        color="inherit"
                        disabled={isSaving}
                        size="small"
                        variant="outlined"
                        onClick={handleRequestClose}
                    >
                        Cancel
                    </CommonButton>
                    <CommonButton
                        disabled={isSaving || isUnchanged}
                        loading={isSaving}
                        size="small"
                        variant="contained"
                        onClick={handleSave}
                    >
                        {isEdit
                            ? 'Save'
                            : 'Add'}
                    </CommonButton>
                </div>
            </CommonModal>

            <DiscardChangesPromptModal
                open={isDiscardOpen}
                onContinueEditing={() => setIsDiscardOpen(false)}
                onDiscard={handleConfirmDiscard}
            />

            <DraftRecoveryPromptModal
                open={draftGuard.isPromptOpen}
                onContinue={draftGuard.handleContinue}
                onDiscard={draftGuard.handleDiscard}
            />
        </>
    );
}