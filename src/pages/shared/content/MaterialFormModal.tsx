import CommonButton from '@components/button/CommonButton';
import CommonInput from '@components/input/CommonInput';
import CommonModal from '@components/modal/CommonModal';
import CommonSelect from '@components/select/CommonSelect';
import CommonTextarea from '@components/textarea/CommonTextarea';
import { UploadSimpleIcon } from '@phosphor-icons/react';
import { createMaterial, MATERIAL_TYPE_OPTIONS, updateMaterial } from '@services/content.service';
import { uploadFile } from '@services/storage.service';
import { CourseMaterial, MaterialType } from '@type/content.type';
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
            cardProps={{ className: 'flex flex-col gap-4 p-6 w-[32rem]' }}
            open={open}
            onClose={onClose}
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
                    placeholder="Material title"
                    size="small"
                    value={title}
                    onChange={function(e: ChangeEvent<HTMLInputElement>) {
                        setTitle(e.target.value);
                    }}
                />
            </div>
            <div className="flex flex-col gap-1">
                <span className="font-medium text-(--mui-palette-text-primary) text-sm">
                    Description
                </span>
                <CommonTextarea
                    maxLength={1000}
                    placeholder="Optional description"
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
                    onClick={onClose}
                >
                    Cancel
                </CommonButton>
                <CommonButton
                    disabled={isSaving || !title.trim()}
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