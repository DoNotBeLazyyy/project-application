import CommonButton from '@components/button/CommonButton';
import CommonModal from '@components/modal/CommonModal';
import CommonSelect, { CommonSelectOption } from '@components/select/CommonSelect';
import { CopyIcon } from '@phosphor-icons/react';
import { createCurriculumMapEntry, getCurriculumMap } from '@services/curriculum-map.service';
import { useState } from 'react';

export interface CurriculumVersionOption {
    schoolYearId: string | null;
    label: string;
    count: number;
}

interface CloneCurriculumModalProps {
    existingVersions: CurriculumVersionOption[];
    onClose: () => void;
    onSuccess: (targetSchoolYearId: string) => void;
    open: boolean;
    programCode: string;
    programId: string;
    schoolYearOptions: CommonSelectOption[];
}

export default function CloneCurriculumModal({
    existingVersions,
    onClose,
    onSuccess,
    open,
    programCode,
    programId,
    schoolYearOptions
}: CloneCurriculumModalProps) {
    const [sourceVersionId, setSourceVersionId] = useState<string>(
        existingVersions[0]
            ? (existingVersions[0].schoolYearId ?? 'baseline')
            : 'blank'
    );
    const [targetSchoolYearId, setTargetSchoolYearId] = useState<string>(
        schoolYearOptions[0]?.value ? String(schoolYearOptions[0].value) : ''
    );
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const sourceOptions: CommonSelectOption[] = [
        ...existingVersions.map((v) => ({
            label: `Clone from ${v.label} (${v.count} courses)`,
            value: v.schoolYearId ?? 'baseline'
        })),
        {
            label: 'Start with Blank Curriculum (0 courses)',
            value: 'blank'
        }
    ];

    async function handleConfirm() {
        if (!targetSchoolYearId) {
            setError('Please select a target academic year.');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            if (sourceVersionId !== 'blank') {
                const sourceSY = sourceVersionId === 'baseline' ? undefined : sourceVersionId;
                const result = await getCurriculumMap(programId, sourceSY);

                if (result.data && result.data.length > 0) {
                    const entriesToCopy = sourceVersionId === 'baseline'
                        ? result.data.filter((entry) => !entry.school_year_id)
                        : result.data.filter((entry) => entry.school_year_id === sourceVersionId);

                    await Promise.allSettled(
                        entriesToCopy.map((entry) =>
                            createCurriculumMapEntry(
                                programId,
                                {
                                    course_id: entry.course_id,
                                    is_elective: entry.is_elective,
                                    sequence: String(entry.sequence),
                                    term_type_id: entry.term_type_id,
                                    year_level: String(entry.year_level)
                                },
                                targetSchoolYearId
                            )
                        )
                    );
                }
            }

            onSuccess(targetSchoolYearId);
            onClose();
        } catch {
            setError('An error occurred while establishing the curriculum revision.');
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <CommonModal
            cardProps={{
                cardHeaderProps: {
                    subheader: `Establish a new curriculum revision for ${programCode} tracked per academic year.`,
                    title: 'New Curriculum Revision'
                }
            }}
            maxWidth="sm"
            open={open}
            onClose={onClose}
        >
            <div className="flex flex-col gap-4">
                <div className="border border-(--mui-palette-divider) flex flex-col gap-1.5 p-3 rounded-lg bg-(--mui-palette-background-default)/50 text-xs text-(--mui-palette-text-secondary)">
                    <div className="flex items-center gap-1.5 font-medium text-(--mui-palette-text-primary)">
                        <CopyIcon size={16} />
                        <span>Curriculum Versioning & History</span>
                    </div>
                    <p className="m-0">
                        Each academic year maintains its own independent curriculum map. Revisions allow
                        cohort tracking (e.g. 10 subjects in 2024–2025 vs. 8 subjects in 2025–2026).
                        Changes made in the new revision will not affect past cohorts.
                    </p>
                </div>

                <div className="flex flex-col gap-1">
                    <span className="font-medium text-xs text-(--mui-palette-text-secondary)">
                        Target Academic Year *
                    </span>
                    <CommonSelect
                        options={schoolYearOptions}
                        size="medium"
                        value={targetSchoolYearId}
                        onChange={(e) => setTargetSchoolYearId(String(e.target.value))}
                    />
                </div>

                <div className="flex flex-col gap-1">
                    <span className="font-medium text-xs text-(--mui-palette-text-secondary)">
                        Starting Curriculum Template
                    </span>
                    <CommonSelect
                        options={sourceOptions}
                        size="medium"
                        value={sourceVersionId}
                        onChange={(e) => setSourceVersionId(String(e.target.value))}
                    />
                </div>

                {error && (
                    <div className="text-xs text-(--mui-palette-error-main) font-medium">
                        {error}
                    </div>
                )}

                <div className="flex gap-2 justify-end pt-2">
                    <CommonButton
                        color="inherit"
                        disabled={isLoading}
                        size="small"
                        variant="outlined"
                        onClick={onClose}
                    >
                        Cancel
                    </CommonButton>
                    <CommonButton
                        disabled={isLoading || !targetSchoolYearId}
                        size="small"
                        variant="contained"
                        onClick={handleConfirm}
                    >
                        {isLoading ? 'Creating Revision...' : 'Create Revision'}
                    </CommonButton>
                </div>
            </div>
        </CommonModal>
    );
}
