import { ServiceResult } from '@type/service.type';
import { FormEventHandler, ReactNode } from 'react';
import { Control, DefaultValues, FieldValues } from 'react-hook-form';

export type EntityFormMode = 'view' | 'edit' | 'create';

export type EntityFormModeText = string | Partial<Record<EntityFormMode, string>>;

export interface EntityFormRenderParams<TValues extends FieldValues> {
    control: Control<TValues>;
    disabled: boolean;
    id: string;
    mode: EntityFormMode;
    onSubmit: FormEventHandler<HTMLFormElement>;
}

export interface EntityFormPageProps<TValues extends FieldValues> {
    backTo: string;
    defaultValues: DefaultValues<TValues>;
    formId: string;
    renderForm: (params: EntityFormRenderParams<TValues>) => ReactNode;
    title: EntityFormModeText;
    canEdit?: boolean;
    subheader?: EntityFormModeText;
    fetchById?: (id: string) => Promise<ServiceResult<TValues>>;
    onCreate?: (values: TValues) => Promise<ServiceResult<unknown>>;
    onUpdate?: (id: string, values: TValues) => Promise<ServiceResult<unknown>>;
}