import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import { useCourseTypeOptions } from '@pages/dean/course-management/type/useCourseTypeOptions';
import { useDepartmentOptions } from '@pages/admin/department-management/useDepartmentOptions';
import { ComponentPropsForm } from '@type/common.type';
import { CourseFilterValues } from '@type/course/course.type';
import { Control } from 'react-hook-form';

const IS_ACTIVE_OPTIONS = [
    { label: 'All', value: 'All' },
    { label: 'Active', value: 'true' },
    { label: 'Inactive', value: 'false' }
];

interface CourseFilterFormProps extends ComponentPropsForm {
    control: Control<CourseFilterValues>;
}

export default function CourseFilterForm({
    control,
    ...formProps
}: CourseFilterFormProps) {
    const { departmentOptions } = useDepartmentOptions();
    const { courseTypeOptions } = useCourseTypeOptions();

    const fields: FormFieldConfig<CourseFilterValues>[] = [
        {
            name: 'department_ids',
            options: departmentOptions,
            type: 'multi-select'
        },
        {
            name: 'course_type_ids',
            options: courseTypeOptions,
            type: 'multi-select'
        },
        {
            name: 'is_active',
            options: IS_ACTIVE_OPTIONS,
            type: 'select'
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