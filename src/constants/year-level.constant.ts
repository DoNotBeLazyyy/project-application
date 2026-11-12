import { CommonSelectOption } from '@components/select/CommonSelect';

// Year levels the system supports; curriculum maps and programs go up to 6th year
const YEAR_LEVEL_LABELS = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year', '6th Year'];

// Year level choices with number values, for fields saved as a number
export const YEAR_LEVEL_OPTIONS: CommonSelectOption[] = YEAR_LEVEL_LABELS.map((label, index) => ({
    label,
    value: index + 1
}));

// The same choices with text values, for forms and filters that keep values as text
export const YEAR_LEVEL_TEXT_OPTIONS: CommonSelectOption[] = YEAR_LEVEL_LABELS.map((label, index) => ({
    label,
    value: String(index + 1)
}));