import { CommonSelectOption } from '@components/select/CommonSelect';

export const PROFILE_FORM_ID = 'profile-details-form';

export const PASSWORD_FORM_ID = 'change-password-form';

export const GENDER_OPTIONS: CommonSelectOption[] = [
    { label: 'Male', value: 'Male' },
    { label: 'Female', value: 'Female' },
    { label: 'Prefer not to say', value: 'Prefer not to say' }
];

export const CIVIL_STATUS_OPTIONS: CommonSelectOption[] = [
    { label: 'Single', value: 'Single' },
    { label: 'Married', value: 'Married' },
    { label: 'Widowed', value: 'Widowed' },
    { label: 'Separated', value: 'Separated' }
];

export const MIN_PASSWORD_LENGTH = 8;