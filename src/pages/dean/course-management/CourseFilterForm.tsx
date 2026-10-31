import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import { useDepartmentOptions } from '@pages/admin/department-management/useDepartmentOptions';
import { useCourseTypeOptions } from '@pages/dean/course-management/type/useCourseTypeOptions';
import { useAppStore } from '@stores/app.store';
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
    const activeRole = useAppStore((state) => state.activeRole);
    const isDean = activeRole === 'Dean';

    const fields: FormFieldConfig<CourseFilterValues>[] = [
        ...(!isDean
            ? [{
                label: 'Departments',
                name: 'department_ids' as const,
                options: departmentOptions,
                type: 'multi-select' as const
            }]
            : []),
        {
            label: 'Course Types',
            name: 'course_type_ids',
            options: courseTypeOptions,
            type: 'multi-select'
        },
        {
            label: 'Status',
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