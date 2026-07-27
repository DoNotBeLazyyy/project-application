import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import { CommonSelectOption } from '@components/select/CommonSelect';
import { YEAR_LEVEL_OPTIONS } from '@constants/year-level.constant';
import { getPrograms } from '@services/program/program.service';
import { ComponentPropsForm } from '@type/common.type';
import { EnrollmentState, EnrollmentStudentFilterValues, StudentStatus } from '@type/enrollment.type';
import { useEffect, useState } from 'react';
import { Control } from 'react-hook-form';

const STUDENT_STATUS_OPTIONS: { label: string; value: StudentStatus }[] = [
    { label: 'Active', value: 'Active' },
    { label: 'Inactive', value: 'Inactive' },
    { label: 'LOA', value: 'LOA' },
    { label: 'Graduated', value: 'Graduated' },
    { label: 'Expelled', value: 'Expelled' }
];

const ENROLLMENT_STATE_OPTIONS: { label: string; value: EnrollmentState }[] = [
    { label: 'Enrolled', value: 'Enrolled' },
    { label: 'Not Enrolled', value: 'Not Enrolled' }
];

interface EnrollmentStudentFilterFormProps extends ComponentPropsForm {
    control: Control<EnrollmentStudentFilterValues>;
}

export default function EnrollmentStudentFilterForm({
    control,
    ...formProps
}: EnrollmentStudentFilterFormProps) {
    const [programOptions, setProgramOptions] = useState<CommonSelectOption[]>([]);

    useEffect(function() {
        async function fetchPrograms() {
            const result = await getPrograms();

            if (result.data) {
                setProgramOptions(
                    result.data.map((program) => ({
                        label: program.label,
                        value: program.id
                    }))
                );
            }
        }

        fetchPrograms();
    }, []);

    const fields: FormFieldConfig<EnrollmentStudentFilterValues>[] = [
        {
            name: 'program_ids',
            options: programOptions,
            type: 'multi-select'
        },
        {
            name: 'year_levels',
            options: YEAR_LEVEL_OPTIONS,
            type: 'multi-select'
        },
        {
            name: 'statuses',
            options: STUDENT_STATUS_OPTIONS,
            type: 'multi-select'
        },
        {
            name: 'enrollment_states',
            options: ENROLLMENT_STATE_OPTIONS,
            type: 'multi-select'
        }
    ];

    return (
        <CommonForm
            containerClassName="flex flex-col gap-4"
            control={control}
            fields={fields}
            formProps={formProps}
        />
    );
}