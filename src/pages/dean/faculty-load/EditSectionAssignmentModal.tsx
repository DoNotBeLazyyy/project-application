import CommonFormModal from '@components/modal/CommonFormModal';
import ValidCommonSelect from '@components/select/ValidCommonSelect';
import { assignSectionFaculty } from '@services/faculty-load.service';
import { getFacultyOptions } from '@services/section.service';
import { useToastStore } from '@stores/toast.store';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

const EDIT_ASSIGNMENT_FORM_ID = 'edit-section-assignment-form';

interface EditSectionAssignmentFormValues {
    faculty_id: string;
}

export interface SectionAssignmentTarget {
    section_id: string;
    section_code: string;
    course_code: string;
    course_title: string;
    current_faculty_id?: string | null;
    faculty_name?: string;
}

interface EditSectionAssignmentModalProps {
    open: boolean;
    section: SectionAssignmentTarget | null;
    onClose: () => void;
    onSuccess: () => void;
}

export default function EditSectionAssignmentModal({
    open,
    section,
    onClose,
    onSuccess
}: EditSectionAssignmentModalProps) {
    const { showToast } = useToastStore();
    const [facultyOptions, setFacultyOptions] = useState<{ label: string; value: string }[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const { control, handleSubmit, reset } = useForm<EditSectionAssignmentFormValues>({
        defaultValues: { faculty_id: '' }
    });

    useEffect(() => {
        if (!open) return;

        async function fetchFaculty() {
            const res = await getFacultyOptions();
            if (res.data) {
                const options = [
                    { label: '— Unassigned (No Faculty) —', value: '' },
                    ...res.data.map((f) => ({
                        label: `${f.full_name}`,
                        value: f.id
                    }))
                ];
                setFacultyOptions(options);
            }
        }

        fetchFaculty();
        reset({
            faculty_id: section?.current_faculty_id || ''
        });
    }, [open, section, reset]);

    async function handleFormSubmit(values: EditSectionAssignmentFormValues) {
        if (!section) return;

        setIsLoading(true);
        try {
            const result = await assignSectionFaculty(
                section.section_id,
                values.faculty_id || null
            );

            if (!result.error) {
                showToast('Section faculty assignment updated successfully.', 'success');
                onSuccess();
                onClose();
            } else {
                showToast(result.error.message || 'Failed to update section faculty assignment.', 'error');
            }
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <CommonFormModal
            cardProps={{
                cardHeaderProps: {
                    subheader: section
                        ? `Update instructor assignment for ${section.section_code} (${section.course_code} - ${section.course_title}).`
                        : 'Reassign this section to another instructor or unassign.',
                    title: 'Edit Section Faculty Assignment'
                }
            }}
            confirmText={isLoading ? 'Saving...' : 'Save Assignment'}
            formContent={
                <div className="flex flex-col gap-4 py-2">
                    <div className="p-3 rounded-lg bg-(--mui-palette-background-default)/60 border border-(--mui-palette-divider) flex flex-col gap-1 text-xs">
                        <div className="flex justify-between items-center">
                            <span className="text-(--mui-palette-text-secondary)">Section:</span>
                            <span className="font-semibold text-(--mui-palette-text-primary)">
                                {section?.section_code}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-(--mui-palette-text-secondary)">Course:</span>
                            <span className="font-medium text-(--mui-palette-text-primary)">
                                {section?.course_code} — {section?.course_title}
                            </span>
                        </div>
                        {section?.faculty_name && (
                            <div className="flex justify-between items-center">
                                <span className="text-(--mui-palette-text-secondary)">Current Faculty:</span>
                                <span className="font-medium text-(--mui-palette-text-primary)">
                                    {section.faculty_name}
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-(--mui-palette-text-primary)">
                            Assign Instructor
                        </label>
                        <ValidCommonSelect<EditSectionAssignmentFormValues>
                            control={control}
                            name="faculty_id"
                            options={facultyOptions}
                        />
                    </div>
                </div>
            }
            formId={EDIT_ASSIGNMENT_FORM_ID}
            open={open}
            onClose={onClose}
            onSubmit={handleSubmit(handleFormSubmit)}
        />
    );
}
