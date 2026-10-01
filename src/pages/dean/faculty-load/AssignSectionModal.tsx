import CommonFormModal from '@components/modal/CommonFormModal';
import ValidCommonSelect from '@components/select/ValidCommonSelect';
import { assignSectionFaculty } from '@services/faculty-load.service';
import { getSections } from '@services/section.service';
import { useToastStore } from '@stores/toast.store';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

const ASSIGN_SECTION_FORM_ID = 'assign-section-to-faculty-form';

interface AssignSectionFormValues {
    section_id: string;
}

interface AssignSectionModalProps {
    open: boolean;
    facultyId: string;
    facultyName: string;
    currentAssignedSectionIds?: string[];
    onClose: () => void;
    onSuccess: () => void;
}

export default function AssignSectionModal({
    open,
    facultyId,
    facultyName,
    currentAssignedSectionIds = [],
    onClose,
    onSuccess
}: AssignSectionModalProps) {
    const { showToast } = useToastStore();
    const [sectionOptions, setSectionOptions] = useState<{ label: string; value: string }[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const { control, handleSubmit, reset } = useForm<AssignSectionFormValues>({
        defaultValues: { section_id: '' }
    });

    useEffect(() => {
        if (!open) return;

        async function fetchSections() {
            const res = await getSections();
            if (res.data) {
                const assignedSet = new Set(currentAssignedSectionIds);
                const options = res.data
                    .filter((s) => !assignedSet.has(s.id))
                    .map((s) => ({
                        label: `${s.label || s.section_code}`,
                        value: s.id
                    }));
                setSectionOptions(options);
            }
        }

        fetchSections();
        reset({ section_id: '' });
    }, [open, currentAssignedSectionIds, reset]);

    async function handleFormSubmit(values: AssignSectionFormValues) {
        if (!values.section_id || !facultyId) return;

        setIsLoading(true);
        try {
            const result = await assignSectionFaculty(values.section_id, facultyId);

            if (!result.error) {
                showToast(`Section assigned to ${facultyName} successfully.`, 'success');
                onSuccess();
                onClose();
            } else {
                showToast(result.error.message || 'Failed to assign section.', 'error');
            }
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <CommonFormModal
            cardProps={{
                cardHeaderProps: {
                    subheader: `Select an available course section offering to assign to ${facultyName}.`,
                    title: 'Assign Section to Faculty'
                }
            }}
            confirmText={isLoading ? 'Assigning...' : 'Assign Section'}
            formContent={
                <div className="flex flex-col gap-4 py-2">
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-(--mui-palette-text-primary)">
                            Select Section Offering
                        </label>
                        {sectionOptions.length === 0 ? (
                            <span className="text-xs text-(--mui-palette-text-secondary) italic p-2">
                                No unassigned sections found.
                            </span>
                        ) : (
                            <ValidCommonSelect<AssignSectionFormValues>
                                control={control}
                                name="section_id"
                                options={sectionOptions}
                            />
                        )}
                    </div>
                </div>
            }
            formId={ASSIGN_SECTION_FORM_ID}
            open={open}
            onClose={onClose}
            onSubmit={handleSubmit(handleFormSubmit)}
        />
    );
}
