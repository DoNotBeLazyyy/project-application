import SectionScheduleConfig from '@pages/dean/section-management/SectionScheduleConfig';
import { SectionFormValues } from '@type/section.type';
import { Control } from 'react-hook-form';

interface Step2SectionScheduleProps {
    control: Control<SectionFormValues>;
    disabled?: boolean;
}

export default function Step2SectionSchedule({
    control,
    disabled
}: Step2SectionScheduleProps) {
    return (
        <div className="flex flex-col gap-4">
            <SectionScheduleConfig control={control} disabled={disabled} />
        </div>
    );
}