import CommonButton from '@components/button/CommonButton';
import CommonModal from '@components/modal/CommonModal';
import { CheckCircleIcon, CircleIcon } from '@phosphor-icons/react';
import { listMyTeachingSections } from '@services/content.service';
import { TeachingSection } from '@type/content.type';
import { ServiceResult } from '@type/service.type';
import { useEffect, useState } from 'react';

interface DuplicateToSectionsModalProps {
    entityLabel: string;
    entityTitle: string;
    open: boolean;
    sectionId: string;
    onClose: () => void;
    onConfirm: (sectionIds: string[]) => Promise<ServiceResult<null>>;
    onDuplicated: () => void;
}

export default function DuplicateToSectionsModal({
    entityLabel,
    entityTitle,
    open,
    sectionId,
    onClose,
    onConfirm,
    onDuplicated
}: DuplicateToSectionsModalProps) {
    const [sections, setSections] = useState<TeachingSection[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(function() {
        if (!open) return;

        setSelectedIds([]);
        loadSections();
    }, [open, sectionId]);

    async function loadSections() {
        const result = await listMyTeachingSections(sectionId);

        if (result.data) {
            setSections(result.data);
        }
    }

    function toggleSection(id: string) {
        setSelectedIds(function(prev) {
            return prev.includes(id)
                ? prev.filter((current) => current !== id)
                : [...prev, id];
        });
    }

    async function handleConfirm() {
        if (selectedIds.length === 0) return;

        setIsSaving(true);
        const result = await onConfirm(selectedIds);
        setIsSaving(false);

        if (!result.error) {
            onDuplicated();
            onClose();
        }
    }

    return (
        <CommonModal
            cardProps={{ className: 'flex flex-col gap-4 p-6 w-[34rem]' }}
            open={open}
            onClose={onClose}
        >
            <div className="flex flex-col gap-1">
                <h2 className="font-semibold text-(--mui-palette-text-primary) text-lg">
                    Copy {entityLabel} to Other Sections
                </h2>
                <p className="text-(--mui-palette-text-secondary) text-sm">
                    “{entityTitle}” will be copied as an independent, unpublished draft into each
                    section you select.
                </p>
            </div>
            <div className="flex flex-col gap-1 max-h-80 overflow-y-auto">
                {sections.length === 0 && (
                    <p className="py-6 text-(--mui-palette-text-secondary) text-center text-sm">
                        You are not assigned to any other section.
                    </p>
                )}
                {sections.map(function(section) {
                    const isSelected = selectedIds.includes(section.id);

                    return (
                        <button
                            className="flex gap-3 items-center rounded-md border border-(--mui-palette-divider) px-3 py-2 text-left"
                            key={section.id}
                            type="button"
                            onClick={function() {
                                toggleSection(section.id);
                            }}
                        >
                            {isSelected
                                ? <CheckCircleIcon className="text-(--mui-palette-primary-main) shrink-0" size={20} weight="fill" />
                                : <CircleIcon className="text-(--mui-palette-text-disabled) shrink-0" size={20} />}
                            <div className="flex flex-col">
                                <span className="text-(--mui-palette-text-primary) text-sm">
                                    {section.course_code} — {section.section_code}
                                </span>
                                <span className="text-(--mui-palette-text-secondary) text-xs">
                                    {section.course_title} · {section.term_label}
                                </span>
                            </div>
                        </button>
                    );
                })}
            </div>
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
                    disabled={isSaving || selectedIds.length === 0}
                    size="small"
                    variant="contained"
                    onClick={handleConfirm}
                >
                    Copy to {selectedIds.length} Section{selectedIds.length === 1
                        ? ''
                        : 's'}
                </CommonButton>
            </div>
        </CommonModal>
    );
}