import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import { useSectionOptions } from '@pages/dean/section-management/useSectionOptions';
import { getStudents } from '@services/student.service';
import { CommonSelectOption } from '@components/select/CommonSelect';
import { ComponentPropsForm } from '@type/common.type';
import { EnrollmentFormValues, EnrollmentStatus } from '@type/enrollment.type';
import { StudentOption } from '@type/student.type';
import { useEffect, useState } from 'react';
import { Control } from 'react-hook-form';

const STATUS_OPTIONS: { label: string; value: EnrollmentStatus }[] = [
    { label: 'Enrolled', value: 'Enrolled' },
    { label: 'Dropped', value: 'Dropped' },
    { label: 'Withdrawn', value: 'Withdrawn' },
    { label: 'Completed', value: 'Completed' },
    { label: 'Failed', value: 'Failed' },
    { label: 'Incomplete', value: 'Incomplete' }
];

interface EnrollmentFormProps extends ComponentPropsForm {
    control: Control<EnrollmentFormValues>;
    disabled?: boolean;
    isCreate?: boolean;
}

export default function EnrollmentForm({
    control,
    disabled,
    isCreate,
    ...formProps
}: EnrollmentFormProps) {
    const [studentOptions, setStudentOptions] = useState<CommonSelectOption[]>([]);
    const { sectionOptions } = useSectionOptions();

    useEffect(function() {
        async function fetchStudents() {
            const result = await getStudents();

            if (result.data) {
                setStudentOptions(
                    result.data.map((student: StudentOption) => ({
                        label: student.label,
                        value: student.id
                    }))
                );
            }
        }

        fetchStudents();
    }, []);

    const fields: FormFieldConfig<EnrollmentFormValues>[] = [
        {
            disabled,
            fieldProps: { helperText: 'Student to enroll in the section' },
            name: 'student_id',
            options: studentOptions,
            rules: disabled
                ? undefined
                : { required: 'Please select a student' },
            type: 'select'
        },
        {
            disabled,
            fieldProps: { helperText: 'Section the student will be enrolled into' },
            name: 'section_id',
            options: sectionOptions,
            rules: disabled
                ? undefined
                : { required: 'Please select a section' },
            type: 'select'
        },
        ...(!isCreate
            ? [{
                disabled,
                fieldProps: { helperText: 'Current status of this enrollment' },
                name: 'status' as const,
                options: STATUS_OPTIONS,
                rules: disabled
                    ? undefined
                    : { required: 'Please select a status' },
                type: 'select' as const
            }]
            : [])
    ];

    return (
        <CommonForm
            containerClassName="flex flex-col gap-4"
            control={control}
            fields={fields}
            formProps={formProps}
            hasHelper
        />
    );
}