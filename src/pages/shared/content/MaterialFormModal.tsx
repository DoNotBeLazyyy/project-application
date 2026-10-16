import CommonButton from '@components/button/CommonButton';
import CommonInput from '@components/input/CommonInput';
import CommonModal from '@components/modal/CommonModal';
import DiscardChangesPromptModal from '@components/modal/DiscardChangesPromptModal';
import DraftRecoveryPromptModal from '@components/modal/DraftRecoveryPromptModal';
import CommonSelect from '@components/select/CommonSelect';
import CommonTextarea from '@components/textarea/CommonTextarea';
import { useObjectDraft } from '@hooks/useFormDraft';
import { UploadSimpleIcon } from '@phosphor-icons/react';
import { createMaterial, MATERIAL_TYPE_OPTIONS, updateMaterial } from '@services/content.service';
import { uploadFile } from '@services/storage.service';
import { CourseMaterial, MaterialType } from '@type/content.type';
import { generateId } from '@utils/uuid.util';
import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';

interface MaterialFormModalProps {
    open: boolean;
    sectionId: string;
    moduleId: string;
    material: CourseMaterial | null;
    onClose: () => void;
    onSaved: () => void;
}

export default function MaterialFormModal({
    open,
    sectionId,
    moduleId,
    material,
    onClose,
    onSaved
}: MaterialFormModalProps) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [materialType, setMaterialType] = useState<MaterialType>('File');
    const [externalUrl, setExternalUrl] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isDiscardOpen, setIsDiscardOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isEdit = material !== null;

    const defaultValues = useMemo(() => ({
        title: material?.title ?? '',
        description: material?.description ?? '',
        materialType: material?.material_type ?? ('File' as MaterialType),
        externalUrl: material?.external_url ?? ''
    }), [material]);

    const currentValues = useMemo(() => ({
        title,
        description,
        materialType,
        externalUrl
    }), [title, description, materialType, externalUrl]);

    const draftGuard = useObjectDraft({
        formId: material?.id
            ? `material-form-${moduleId}-${material.id}`
            : `material-form-${moduleId}-create`,
        values: currentValues,
        defaultValues,
        onRestore: (restored) => {
            setTitle(restored.title ?? '');
            setDescription(restored.description ?? '');
            setMaterialType(restored.materialType ?? 'File');
            setExternalUrl(restored.externalUrl ?? '');
        },
        enabled: open
    });

    const hasRealChanges = draftGuard.hasRealChanges || (!isEdit && file !== null);

    const isUnchanged = isEdit
        && title.trim() === (material?.title ?? '')
        && (description.trim() || null) === (material?.description ?? null)
        && (materialType !== 'Link' || (externalUrl.trim() || null) === (material?.external_url ?? null));

    useEffect(function() {
        if (!open) {
            setIsDiscardOpen(false);
            return;
        }

        setTitle(material?.title ?? '');
        setDescription(material?.description ?? '');
        setMaterialType(material?.material_type ?? 'File');
        setExternalUrl(material?.external_url ?? '');
        setFile(null);

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }, [open, material]);

    function handleRequestClose() {
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
        setFile(e.target.files?.[0] ?? null);
    }

    async function handleSave() {
        if (!title.trim()) return;

        setIsSaving(true);

        if (isEdit && material) {
            const result = await updateMaterial(
                material.id,
                title.trim(),
                description.trim() || null,
                materialType === 'Link'
                    ? externalUrl.trim() || null
                    : null
            );

            setIsSaving(false);

            if (!result.error) {
                draftGuard.clearDraft();
                onSaved();
                onClose();
            }

            return;
        }

        if (materialType === 'Link') {
            if (!externalUrl.trim()) {
                setIsSaving(false);
                return;
            }

            const result = await createMaterial({
                description: description.trim() || null,
                externalUrl: externalUrl.trim(),
                materialType,
                moduleId,
                title: title.trim()
            });

            setIsSaving(false);

            if (!result.error) {
                draftGuard.clearDraft();
                onSaved();
                onClose();
            }

            return;
        }

        if (!file) {
            setIsSaving(false);
            return;
        }

        const path = `${sectionId}/${moduleId}/${generateId()}-${file.name}`;
        const uploadResult = await uploadFile({ bucket: 'materials', file, path });

        if (uploadResult.error) {
            setIsSaving(false);
            return;
        }

        const result = await createMaterial({
            description: description.trim() || null,
            fileName: file.name,
            fileSizeBytes: file.size,
            fileUrl: path,
            materialType,
            mimeType: file.type || null,
            moduleId,
            title: title.trim()
        });

        setIsSaving(false);

        if (!result.error) {
            draftGuard.clearDraft();
            onSaved();
            onClose();
        }
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
                <div className="flex flex-col gap-1">
                    <span className="font-medium text-(--mui-palette-text-primary) text-sm">
                        Title
                    </span>
                    <CommonInput
                        fullWidth
                        placeholder="e.g. Course Syllabus or Week 1: Lecture Slides"
                        size="small"
                        value={title}
                        onChange={function(e: ChangeEvent<HTMLInputElement>) {
                            setTitle(e.target.value);
                        }}
                    />
                </div>
                <div className="flex flex-col gap-1">
                    <span className="font-medium text-(--mui-palette-text-primary) text-sm">
                        Description &amp; Learning Objectives
                    </span>
                    <CommonTextarea
                        maxLength={1000}
                        placeholder="Brief description, learning outcomes, chapter coverage, or reading guide..."
                        value={description}
                        onChange={function(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
                            setDescription(e.target.value);
                        }}
                    />
                </div>
                {!isEdit && (
                    <div className="flex flex-col gap-1">
                        <span className="font-medium text-(--mui-palette-text-primary) text-sm">
                            Type
                        </span>
                        <CommonSelect
                            fullWidth
                            options={MATERIAL_TYPE_OPTIONS}
                            value={materialType}
                            onChange={function(e: ChangeEvent<HTMLInputElement>) {
                                setMaterialType(e.target.value as MaterialType);
                            }}
                        />
                    </div>
                )}
                {materialType === 'Link'
                    ? (
                        <div className="flex flex-col gap-1">
                            <span className="font-medium text-(--mui-palette-text-primary) text-sm">
                                URL
                            </span>
                            <CommonInput
                                fullWidth
                                placeholder="https://..."
                                size="small"
                                value={externalUrl}
                                onChange={function(e: ChangeEvent<HTMLInputElement>) {
                                    setExternalUrl(e.target.value);
                                }}
                            />
                        </div>
                    )
                    : !isEdit && (
                        <div className="flex flex-col gap-1">
                            <span className="font-medium text-(--mui-palette-text-primary) text-sm">
                                File
                            </span>
                            <input
                                className="hidden"
                                ref={fileInputRef}
                                type="file"
                                onChange={handleFileChange}
                            />
                            <CommonButton
                                color="inherit"
                                size="small"
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
                        </div>
                    )}
                <div className="flex gap-2 justify-end">
                    <CommonButton
                        color="inherit"
                        size="small"
                        variant="outlined"
                        onClick={handleRequestClose}
                    >
                        Cancel
                    </CommonButton>
                    <CommonButton
                        disabled={isSaving || !title.trim() || isUnchanged}
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