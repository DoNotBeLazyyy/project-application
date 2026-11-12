import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import { ComponentPropsForm } from '@type/common.type';
import { CreateRoleFormValues } from '@type/role.type';
import { generateRoleCode } from '@utils/entity-code.util';
import { useEffect, useRef } from 'react';
import { Control, UseFormSetValue, useWatch } from 'react-hook-form';

// The server never changes the code of these roles (20261031020000_protect_builtin_roles)
const BUILT_IN_ROLE_CODES = ['Admin', 'Dean', 'Faculty', 'Registrar', 'Student'];

interface RoleFormProps extends ComponentPropsForm {
    control: Control<CreateRoleFormValues>;
    disabled?: boolean;
    isCreate?: boolean;
    setValue?: UseFormSetValue<CreateRoleFormValues>;
}

function getRoleFormFields(disabled?: boolean): FormFieldConfig<CreateRoleFormValues>[] {
    return [
        {
            disabled: true,
            fieldProps: { helperText: 'System-generated unique role code' },
            label: 'Role Code',
            name: 'code',
            type: 'text'
        },
        {
            disabled,
            fieldProps: { helperText: 'Display name shown across the system' },
            label: 'Role Name',
            name: 'label',
            rules: disabled
                ? undefined
                : {
                    required: 'Role label is required',
                    pattern: {
                        value: /^(?=.*[A-Za-z]).{2,}$/,
                        message: 'Must be at least 2 characters and contain a letter'
                    }
                },
            type: 'text'
        },
        {
            disabled,
            label: 'Description',
            name: 'description',
            type: 'text-area'
        }
    ];
}

export default function RoleForm({
    control,
    disabled,
    isCreate = false,
    setValue,
    ...formProps
}: RoleFormProps) {
    const fields = getRoleFormFields(disabled);
    const watchedLabel = useWatch({ control, name: 'label' });
    const watchedCode = useWatch({ control, name: 'code' });

    const initialLabelRef = useRef<string | null>(null);
    const initialCodeRef = useRef<string | null>(null);

    useEffect(() => {
        initialLabelRef.current = null;
        initialCodeRef.current = null;
    }, [isCreate]);

    useEffect(() => {
        if (!setValue || disabled) return;

        if (initialLabelRef.current === null) {
            initialLabelRef.current = watchedLabel || '';
            initialCodeRef.current = watchedCode || '';
            return;
        }

        if (isCreate) {
            const generated = generateRoleCode(watchedLabel || '');
            if (generated) {
                setValue('code', generated, { shouldValidate: true, shouldDirty: true });
            }
            else if (!watchedLabel?.trim()) {
                setValue('code', '', { shouldValidate: false, shouldDirty: false });
            }
        }
        else {
            const isBuiltInRole = BUILT_IN_ROLE_CODES.includes(initialCodeRef.current || '');
            // A built-in role keeps its real code when renamed, so show that code
            if (isBuiltInRole) {
                if (watchedCode !== initialCodeRef.current) {
                    setValue('code', initialCodeRef.current || '', { shouldValidate: true, shouldDirty: false });
                }
            }
            else if (watchedLabel !== initialLabelRef.current) {
                const generated = generateRoleCode(watchedLabel || '');
                if (generated) {
                    setValue('code', generated, { shouldValidate: true, shouldDirty: true });
                }
                else if (!watchedLabel?.trim()) {
                    setValue('code', '', { shouldValidate: false, shouldDirty: true });
                }
            }
            else if (initialCodeRef.current !== null && watchedCode !== initialCodeRef.current) {
                setValue('code', initialCodeRef.current, { shouldValidate: true, shouldDirty: false });
            }
        }
    }, [watchedLabel, disabled, isCreate, setValue, watchedCode]);

    return (
        <CommonForm
            control={control}
            fields={fields}
            formProps={formProps}
            hasHelper
        />
    );
}