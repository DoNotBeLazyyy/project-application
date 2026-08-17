import ValidCommonCheckbox from '@components/checkbox/ValidCommonCheckbox';
import ValidCommonMultiSelect from '@components/select/ValidCommonMultiSelect';
import ValidCommonSelect from '@components/select/ValidCommonSelect';
import { YEAR_LEVEL_OPTIONS } from '@constants/year-level.constant';
import { EligibleSectionFilterValues, EligibleSectionScope } from '@type/enrollment.type';
import { Control } from 'react-hook-form';

const SCOPE_OPTIONS: { label: string; value: EligibleSectionScope }[] = [
    { label: 'Recommended for this student', value: 'recommended' },
    { label: 'All curriculum courses', value: 'all' }
];

interface EligibleSectionFilterBarProps {
    control: Control<EligibleSectionFilterValues>;
    isScopeLocked: boolean;
}

export default function EligibleSectionFilterBar({
    control,
    isScopeLocked
}: EligibleSectionFilterBarProps) {
    return (
        <div className="border-(--mui-palette-divider) border-solid border rounded-lg flex flex-col gap-3 p-3">
            <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
                <div className="flex flex-col gap-1">
                    <span className="font-medium text-(--mui-palette-text-primary) text-xs">Course Scope</span>
                    <ValidCommonSelect
                        control={control}
                        hasHelper={false}
                        name="scope"
                        options={SCOPE_OPTIONS}
                        size="small"
                    />
                </div>
                <div className="flex flex-col gap-1">
                    <span className="font-medium text-(--mui-palette-text-primary) text-xs">Curriculum Year Level</span>
                    <ValidCommonMultiSelect
                        control={control}
                        disabled={isScopeLocked}
                        hasHelper={false}
                        name="year_levels"
                        options={YEAR_LEVEL_OPTIONS}
                        placeholder={isScopeLocked
                            ? 'Switch to all curriculum courses to filter'
                            : 'All year levels'}
                        size="small"
                    />
                </div>
            </div>
            <div className="flex flex-wrap gap-x-6 items-center">
                <ValidCommonCheckbox
                    control={control}
                    hasHelper={false}
                    label="Show full sections"
                    name="include_full"
                    size="small"
                />
                <ValidCommonCheckbox
                    control={control}
                    hasHelper={false}
                    label="Show sections with unmet prerequisites"
                    name="include_prerequisite_gaps"
                    size="small"
                />
                <ValidCommonCheckbox
                    control={control}
                    hasHelper={false}
                    label="Show conflicting schedules"
                    name="include_conflicts"
                    size="small"
                />
            </div>
        </div>
    );
}