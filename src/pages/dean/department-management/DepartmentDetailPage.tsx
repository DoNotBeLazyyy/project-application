import EntityFormPage from '@components/entity-form/EntityFormPage';
import DepartmentForm from '@pages/dean/department-management/DepartmentForm';
import { createDepartment, getDepartmentById, updateDepartment } from '@services/department.service';
import { DepartmentFormValues } from '@type/department.type';
import { ServiceResult } from '@type/service.type';

const FORM_ID = 'department-form';

const DEFAULT_VALUES: DepartmentFormValues = {
    code: '',
    description: '',
    head_user_id: '',
    name: ''
};

async function fetchDepartment(id: string): Promise<ServiceResult<DepartmentFormValues>> {
    const result = await getDepartmentById(id);

    if (!result.data) {
        return result;
    }

    return {
        data: {
            code: result.data.code,
            description: result.data.description ?? '',
            head_user_id: result.data.head_user_id ?? '',
            name: result.data.name
        },
        error: null
    };
}

export default function DepartmentDetailPage() {
    return (
        <EntityFormPage<DepartmentFormValues>
            backTo="/dean/department-management"
            defaultValues={DEFAULT_VALUES}
            fetchById={fetchDepartment}
            formId={FORM_ID}
            renderForm={function({ control, disabled, id, mode, onSubmit }) {
                return (
                    <DepartmentForm
                        control={control}
                        disabled={disabled}
                        id={id}
                        isCodeDisabled={mode === 'edit'}
                        onSubmit={onSubmit}
                    />
                );
            }}
            subheader={{
                create: 'Fill in the details to create a new department.',
                edit: 'Update the details of this department.',
                view: 'Viewing department details.'
            }}
            title={{
                create: 'Create Department',
                edit: 'Edit Department',
                view: 'View Department'
            }}
            onCreate={createDepartment}
            onUpdate={updateDepartment}
        />
    );
}