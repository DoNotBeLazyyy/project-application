import SectionGradingOverride from '@pages/dean/section-management/SectionGradingOverride';
import { SectionFormValues } from '@type/section.type';
import { Control } from 'react-hook-form';

interface Step2SectionGradingSchemaProps {
    control: Control<SectionFormValues>;
    currentSectionId?: string;
    disabled?: boolean;
}

export default function Step2SectionGradingSchema({
    control,
    currentSectionId,
    disabled
}: Step2SectionGradingSchemaProps) {
    return (
        <div className="flex flex-col gap-4">
            <div className="bg-white dark:bg-zinc-800/80 p-5 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-xs">
                <SectionGradingOverride
                    control={control}
                    currentSectionId={currentSectionId}
                    disabled={disabled}
                />
            </div>
        </div>
    );
}
