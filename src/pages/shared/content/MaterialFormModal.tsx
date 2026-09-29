import CommonButton from '@components/button/CommonButton';
import CommonInput from '@components/input/CommonInput';
import CommonModal from '@components/modal/CommonModal';
import CommonSelect from '@components/select/CommonSelect';
import CommonTextarea from '@components/textarea/CommonTextarea';
import { UploadSimpleIcon } from '@phosphor-icons/react';
import { createMaterial, MATERIAL_TYPE_OPTIONS, updateMaterial } from '@services/content.service';
import { uploadFile } from '@services/storage.service';
import { CourseMaterial, MaterialType } from '@type/content.type';
import { formatFileSize } from '@utils/file.util';
import { generateId } from '@utils/uuid.util';
import { ChangeEvent, useEffect, useRef, useState } from 'react';

interface MaterialFormModalProps {
    open: boolean;
    sectionId: string;
    moduleId: string;
    material: CourseMaterial | null;
    onClose: () => void;
    onSaved: () => void;
}

const QUICK_TEMPLATES: { label: string; type: MaterialType; title: string }[] = [
    { label: 'Course Syllabus', type: 'Document', title: 'Course Syllabus & Classroom Policies' },
    { label: 'Lecture Slides', type: 'Slide', title: 'Lecture Slides: ' },
    { label: 'Recorded Lecture', type: 'Video', title: 'Recorded Lecture: ' },
    { label: 'Reading Handout', type: 'File', title: 'Required Reading: ' },
    { label: 'Resource Link', type: 'Link', title: 'Reference Resource: ' }
];

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
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isEdit = material !== null;

    const isUnchanged = isEdit
        && title.trim() === (material?.title ?? '')
        && (description.trim() || null) === (material?.description ?? null)
        && (materialType !== 'Link' || (externalUrl.trim() || null) === (material?.external_url ?? null));

    useEffect(function() {
        if (!open) return;

        setTitle(material?.title ?? '');
        setDescription(material?.description ?? '');
        setMaterialType(material?.material_type ?? 'File');
        setExternalUrl(material?.external_url ?? '');
        setFile(null);

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }, [open, material]);

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
            onSaved();
            onClose();
        }
    }

    return (
        <CommonModal
            cardProps={{ className: 'flex flex-col gap-4 max-w-full p-4 sm:p-6 w-full sm:w-[32rem]' }}
            open={open}
            onClose={onClose}
        >
            <div className="flex flex-col gap-0.5">
                <h2 className="font-semibold text-(--mui-palette-text-primary) text-lg">
                    {isEdit
                        ? 'Edit Material'
                        : 'Upload Course Material'}
                </h2>
                <span className="text-(--mui-palette-text-secondary) text-xs">
                    Provide lecture slides, syllabus, reading handouts, or educational links.
                </span>
            </div>

            {!isEdit && (
                <div className="flex flex-col gap-1.5">
                    <span className="font-medium text-(--mui-palette-text-secondary) text-xs">
                        Quick Presets
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                        {QUICK_TEMPLATES.map((tmpl) => (
                            <button
                                className="bg-(--mui-palette-action-hover) border border-(--mui-palette-divider) cursor-pointer font-medium hover:border-(--mui-palette-primary-main) hover:text-(--mui-palette-primary-main) px-2.5 py-1 rounded-full text-(--mui-palette-text-primary) text-xs transition-colors"
                                key={tmpl.label}
                                type="button"
                                onClick={() => {
                                    setMaterialType(tmpl.type);
                                    setTitle(tmpl.title);
                                }}
                            >
                                + {tmpl.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {!isEdit && (
                <div className="flex flex-col gap-1">
                    <span className="font-medium text-(--mui-palette-text-primary) text-sm">
                        Material Type
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

            <div className="flex flex-col gap-1">
                <span className="font-medium text-(--mui-palette-text-primary) text-sm">
                    Title
                </span>
                <CommonInput
                    fullWidth
                    placeholder="e.g. Chapter 1: Introduction to Course Concepts"
                    size="small"
                    value={title}
                    onChange={function(e: ChangeEvent<HTMLInputElement>) {
                        setTitle(e.target.value);
                    }}
                />
            </div>

            <div className="flex flex-col gap-1">
                <span className="font-medium text-(--mui-palette-text-primary) text-sm">
                    Description & Objectives
                </span>
                <CommonTextarea
                    maxLength={1000}
                    placeholder="Optional description, syllabus breakdown, or learning objectives"
                    value={description}
                    onChange={function(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
                        setDescription(e.target.value);
                    }}
                />
            </div>

            {materialType === 'Link'
                ? (
                    <div className="flex flex-col gap-1">
                        <span className="font-medium text-(--mui-palette-text-primary) text-sm">
                            Resource URL
                        </span>
                        <CommonInput
                            fullWidth
                            placeholder="https://drive.google.com/..., https://youtu.be/..., or external resource"
                            size="small"
                            value={externalUrl}
                            onChange={function(e: ChangeEvent<HTMLInputElement>) {
                                setExternalUrl(e.target.value);
                            }}
                        />
                        <span className="text-(--mui-palette-text-disabled) text-[11px]">
                            Direct link to cloud storage, YouTube, or external reading reference.
                        </span>
                    </div>
                )
                : !isEdit && (
                    <div className="flex flex-col gap-1.5">
                        <span className="font-medium text-(--mui-palette-text-primary) text-sm">
                            File Attachment
                        </span>
                        <input
                            className="hidden"
                            ref={fileInputRef}
                            type="file"
                            onChange={handleFileChange}
                        />
                        <div className="flex flex-wrap gap-2 items-center">
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
                                    ? 'Change file'
                                    : 'Choose file'}
                            </CommonButton>
                            {file && (
                                <span className="font-medium max-w-xs text-(--mui-palette-text-primary) text-xs truncate">
                                    {file.name} ({formatFileSize(file.size)})
                                </span>
                            )}
                        </div>
                        <span className="text-(--mui-palette-text-disabled) text-[11px]">
                            Accepted formats: PDF, PPTX, DOCX, XLSX, MP4, MP3, PNG, JPG, ZIP (max 50MB)
                        </span>
                    </div>
                )}
            <div className="flex gap-2 justify-end">
                <CommonButton
                    color="inherit"
                    size="small"
                    variant="outlined"
                    onClick={onClose}
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
    );
}