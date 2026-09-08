import CommonCard from '@components/card/CommonCard';
import CommonInput from '@components/input/CommonInput';
import TableCardActionMenu from '@components/table-card/TableCardActionMenu';
import { InputAdornment, SxProps, Theme } from '@mui/material';
import AcademicThresholdRow, {
    ACADEMIC_THRESHOLD_GRID_CLASS,
    AcademicThresholdDraft
} from '@pages/admin/academic-threshold-management/AcademicThresholdRow';
import {
    ArrowCounterClockwiseIcon,
    ArrowsClockwiseIcon,
    FloppyDiskIcon,
    MagnifyingGlassIcon,
    WarningCircleIcon
} from '@phosphor-icons/react';
import { getAcademicThresholds, updateAcademicThresholds } from '@services/academic-threshold.service';
import { useToastStore } from '@stores/toast.store';
import { AcademicThreshold, AcademicThresholdCategory } from '@type/academic-threshold.type';
import { useCallback, useEffect, useMemo, useState } from 'react';

const COLUMN_HEAD_CLASS = 'font-bold text-(--mui-palette-text-secondary) text-[10.5px] tracking-[0.1em] uppercase';

const INFO_CONTENT =
    'Academic thresholds define the cutoff criteria for Latin Honors, Academic Scholarships, and Deans List / Academic Standing. Configure the GWA range, minimum individual subject grade requirements (subject floor), and discount percentages. Students who meet the GWA cutoff but have any individual subject grade worse than the subject floor will not receive the honor or scholarship.';

const HEADER_SX: SxProps<Theme> = {
    borderBottom: '1px solid var(--mui-palette-grey-100)',
    boxShadow: '0 10px 10px -10px rgb(15 23 42 / 0.18)',
    gap: 'var(--mui-tokens-spacing-5)',
    pb: 2.5,
    position: 'relative',
    zIndex: 1,
    '&& .MuiCardHeader-action': {
        display: 'flex',
        flexBasis: 'auto',
        flexGrow: 1,
        justifyContent: 'flex-end',
        marginLeft: 'auto'
    }
};

const CATEGORIES: ('All' | AcademicThresholdCategory)[] = ['All', 'Honor', 'Scholarship', 'Standing'];

function toDraft(item: AcademicThreshold): AcademicThresholdDraft {
    return {
        category: item.category,
        code: item.code,
        id: item.id,
        is_active: item.is_active ?? true,
        label: item.label,
        max_gwa: item.max_gwa !== null && item.max_gwa !== undefined
            ? String(item.max_gwa)
            : '',
        min_gwa: item.min_gwa !== null && item.min_gwa !== undefined
            ? String(item.min_gwa)
            : '',
        min_subject_grade: item.min_subject_grade !== null && item.min_subject_grade !== undefined
            ? String(item.min_subject_grade)
            : '',
        requires_no_failing: item.requires_no_failing ?? false,
        scholarship_discount_pct: item.scholarship_discount_pct !== null && item.scholarship_discount_pct !== undefined
            ? String(item.scholarship_discount_pct)
            : '',
        sort_order: item.sort_order ?? 0
    };
}

function checkIsDirty(drafts: AcademicThresholdDraft[], initials: AcademicThreshold[]): boolean {
    if (drafts.length !== initials.length) {
        return true;
    }

    for (const d of drafts) {
        const orig = initials.find((i) => i.id === d.id);
        if (!orig) {
            return true;
        }

        const origMinGwa = orig.min_gwa !== null && orig.min_gwa !== undefined
            ? String(orig.min_gwa)
            : '';
        const origMaxGwa = orig.max_gwa !== null && orig.max_gwa !== undefined
            ? String(orig.max_gwa)
            : '';
        const origMinSubj = orig.min_subject_grade !== null && orig.min_subject_grade !== undefined
            ? String(orig.min_subject_grade)
            : '';
        const origDiscount = orig.scholarship_discount_pct !== null && orig.scholarship_discount_pct !== undefined
            ? String(orig.scholarship_discount_pct)
            : '';
        const origNoFailing = orig.requires_no_failing ?? false;
        const origActive = orig.is_active ?? true;

        if (d.min_gwa !== origMinGwa) {
            return true;
        }
        if (d.max_gwa !== origMaxGwa) {
            return true;
        }
        if (d.min_subject_grade !== origMinSubj) {
            return true;
        }
        if (d.scholarship_discount_pct !== origDiscount) {
            return true;
        }
        if (d.requires_no_failing !== origNoFailing) {
            return true;
        }
        if (d.is_active !== origActive) {
            return true;
        }
    }

    return false;
}

function validateDrafts(drafts: AcademicThresholdDraft[]): string[] {
    const blockers: string[] = [];

    for (const draft of drafts) {
        const name = draft.label || draft.code;

        if (!draft.max_gwa.trim()) {
            blockers.push(`${name}: Maximum GWA is required.`);
        } else {
            const maxVal = Number(draft.max_gwa);
            if (Number.isNaN(maxVal) || maxVal < 1.0 || maxVal > 5.0) {
                blockers.push(`${name}: Maximum GWA must be between 1.00 and 5.00.`);
            }
        }

        if (draft.min_gwa.trim()) {
            const minVal = Number(draft.min_gwa);
            if (Number.isNaN(minVal) || minVal < 1.0 || minVal > 5.0) {
                blockers.push(`${name}: Minimum GWA must be between 1.00 and 5.00.`);
            } else if (draft.max_gwa.trim()) {
                const maxVal = Number(draft.max_gwa);
                if (!Number.isNaN(maxVal) && minVal > maxVal) {
                    blockers.push(`${name}: Minimum GWA (${minVal}) cannot be greater than Maximum GWA (${maxVal}).`);
                }
            }
        }

        if (draft.category !== 'Standing' && draft.min_subject_grade.trim()) {
            const floorVal = Number(draft.min_subject_grade);
            if (Number.isNaN(floorVal) || floorVal < 1.0 || floorVal > 5.0) {
                blockers.push(`${name}: Minimum subject grade must be between 1.00 and 5.00.`);
            }
        }

        if (draft.category === 'Scholarship' && draft.scholarship_discount_pct.trim()) {
            const discVal = Number(draft.scholarship_discount_pct);
            if (Number.isNaN(discVal) || discVal < 0 || discVal > 100) {
                blockers.push(`${name}: Discount percentage must be between 0% and 100%.`);
            }
        }
    }

    return blockers;
}

export default function AcademicThresholdManagement() {
    const [initialThresholds, setInitialThresholds] = useState<AcademicThreshold[]>([]);
    const [drafts, setDrafts] = useState<AcademicThresholdDraft[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [selectedCategory, setSelectedCategory] = useState<'All' | AcademicThresholdCategory>('All');

    const fetchThresholds = useCallback(async function() {
        setIsLoading(true);
        const result = await getAcademicThresholds();
        if (result.data) {
            setInitialThresholds(result.data);
            setDrafts(result.data.map(toDraft));
        }
        setIsLoading(false);
    }, []);

    useEffect(() => {
        fetchThresholds();
    }, [fetchThresholds]);

    const isDirty = useMemo(() => {
        return checkIsDirty(drafts, initialThresholds);
    }, [drafts, initialThresholds]);

    const blockers = useMemo(() => {
        return validateDrafts(drafts);
    }, [drafts]);

    const canSave = isDirty && blockers.length === 0 && !isSaving && !isLoading;

    function handleRowChange(id: string, patch: Partial<AcademicThresholdDraft>) {
        setDrafts((prev) =>
            prev.map((item) =>
                item.id === id
                    ? { ...item, ...patch }
                    : item));
    }

    function handleReset() {
        setDrafts(initialThresholds.map(toDraft));
    }

    async function handleSave() {
        if (!canSave) {
            return;
        }

        setIsSaving(true);
        const payload = drafts.map((d) => ({
            id: d.id,
            is_active: d.is_active,
            max_gwa: d.max_gwa.trim(),
            min_gwa: d.min_gwa.trim() === ''
                ? ''
                : d.min_gwa.trim(),
            min_subject_grade: d.category === 'Standing'
                ? ''
                : (d.min_subject_grade.trim() === ''
                    ? ''
                    : d.min_subject_grade.trim()),
            requires_no_failing: d.category === 'Standing'
                ? false
                : d.requires_no_failing,
            scholarship_discount_pct: d.category === 'Scholarship'
                ? (d.scholarship_discount_pct.trim() === ''
                    ? ''
                    : d.scholarship_discount_pct.trim())
                : ''
        }));

        const result = await updateAcademicThresholds(payload);
        setIsSaving(false);

        if (!result.error) {
            useToastStore.getState()
                .showToast('Academic thresholds updated successfully.', 'success');
            await fetchThresholds();
        }
    }

    const filteredDrafts = useMemo(() => {
        let list = [...drafts];

        if (selectedCategory !== 'All') {
            list = list.filter((item) => item.category === selectedCategory);
        }

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            list = list.filter((item) =>
                item.label.toLowerCase().includes(query)
                || item.code.toLowerCase().includes(query)
                || item.category.toLowerCase().includes(query));
        }

        return list;
    }, [drafts, selectedCategory, searchQuery]);

    const subheader = isLoading
        ? 'Loading...'
        : `${drafts.length} threshold tier${drafts.length === 1
            ? ''
            : 's'}${isDirty
            ? ' · unsaved changes'
            : ''}`;

    return (
        <CommonCard
            cardHeaderProps={{
                action: (
                    <div className="flex gap-(--mui-tokens-spacing-3) items-center justify-end w-full">
                        <TableCardActionMenu
                            extraOptions={[
                                {
                                    children: 'Reload',
                                    disabled: isLoading || isSaving,
                                    icon: <ArrowsClockwiseIcon size={20} weight="bold" />,
                                    key: 'reload',
                                    onClick: fetchThresholds
                                },
                                {
                                    children: 'Cancel',
                                    disabled: !isDirty || isSaving,
                                    icon: <ArrowCounterClockwiseIcon size={20} weight="bold" />,
                                    key: 'cancel',
                                    onClick: handleReset
                                },
                                {
                                    children: isSaving
                                        ? 'Saving...'
                                        : 'Save',
                                    disabled: !canSave,
                                    icon: <FloppyDiskIcon size={20} weight="bold" />,
                                    key: 'save',
                                    onClick: handleSave
                                }
                            ]}
                            inlineActionLimit={0}
                        />
                    </div>
                ),
                className: '@container shrink-0',
                subheader,
                sx: HEADER_SX,
                title: 'Academic Thresholds'
            }}
            className="flex flex-1 flex-col h-full min-h-0 w-full"
            infoContent={INFO_CONTENT}
        >
            {isLoading
                ? (
                    <div className="flex items-center justify-center py-16">
                        <span className="text-(--mui-palette-text-secondary) text-sm">Loading academic thresholds...</span>
                    </div>
                )
                : (
                    <div className="flex flex-1 flex-col gap-4 min-h-0 p-4">
                        {/* Filter toolbar: Search and Category Pills */}
                        <div className="flex flex-wrap gap-3 items-center justify-between">
                            <div className="flex flex-wrap gap-1.5 items-center">
                                {CATEGORIES.map((cat) => {
                                    const isSelected = selectedCategory === cat;
                                    const count = cat === 'All'
                                        ? drafts.length
                                        : drafts.filter((d) => d.category === cat).length;

                                    return (
                                        <button
                                            className={`cursor-pointer flex font-semibold gap-1.5 items-center px-3 py-1.5 rounded-(--mui-tokens-radius-full) text-xs transition-colors ${
                                                isSelected
                                                    ? 'bg-(--mui-tokens-color-brand-900) text-(--mui-tokens-color-common-white)'
                                                    : 'bg-(--mui-palette-grey-100) hover:bg-(--mui-palette-grey-200) text-(--mui-palette-text-secondary)'
                                            }`}
                                            key={cat}
                                            type="button"
                                            onClick={function() {
                                                setSelectedCategory(cat);
                                            }}
                                        >
                                            <span>{cat}</span>
                                            <span
                                                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                                                    isSelected
                                                        ? 'bg-white/20 text-white'
                                                        : 'bg-black/5 text-(--mui-palette-text-secondary)'
                                                }`}
                                            >
                                                {count}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="max-w-xs w-full">
                                <CommonInput
                                    hasClearButton
                                    placeholder="Search by label or code..."
                                    size="small"
                                    slotProps={{
                                        input: {
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <MagnifyingGlassIcon size={16} />
                                                </InputAdornment>
                                            )
                                        }
                                    }}
                                    value={searchQuery}
                                    onChange={function(e) {
                                        setSearchQuery(e.target.value);
                                    }}
                                />
                            </div>
                        </div>

                        {/* Blocker alert box */}
                        {isDirty && blockers.length > 0 && (
                            <div className="bg-amber-50 border border-amber-200 flex flex-col gap-1 p-3 rounded-(--mui-tokens-radius-md) text-amber-900 text-xs">
                                <div className="flex font-semibold gap-1.5 items-center">
                                    <WarningCircleIcon size={16} weight="bold" />
                                    <span>Please fix the following validation issues before saving:</span>
                                </div>
                                <ul className="flex flex-col gap-0.5 list-disc ml-5 mt-1 text-amber-800">
                                    {blockers.map((b) => (
                                        <li key={b}>{b}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Sticky row composer table */}
                        <div className="flex flex-col flex-1 min-h-0 min-w-0 overflow-auto">
                            {filteredDrafts.length > 0 && (
                                <div className={`${ACADEMIC_THRESHOLD_GRID_CLASS} bg-(--mui-palette-background-paper) pb-2 sticky top-0 z-10`}>
                                    <span className={COLUMN_HEAD_CLASS}>#</span>
                                    <span className={COLUMN_HEAD_CLASS}>Threshold</span>
                                    <span className={`${COLUMN_HEAD_CLASS} text-center`}>Min GWA</span>
                                    <span className={`${COLUMN_HEAD_CLASS} text-center`}>Max GWA</span>
                                    <span className={`${COLUMN_HEAD_CLASS} text-center`}>Min Subj Grade</span>
                                    <span className={`${COLUMN_HEAD_CLASS} text-center`}>Discount %</span>
                                    <span className={`${COLUMN_HEAD_CLASS} text-center`}>No Failing</span>
                                    <span className={`${COLUMN_HEAD_CLASS} text-center`}>Status</span>
                                </div>
                            )}

                            {filteredDrafts.map((threshold, index) => (
                                <AcademicThresholdRow
                                    disabled={isSaving}
                                    index={index}
                                    key={threshold.id}
                                    threshold={threshold}
                                    onChange={function(patch) {
                                        handleRowChange(threshold.id, patch);
                                    }}
                                />
                            ))}

                            {filteredDrafts.length === 0 && (
                                <p className="py-12 text-(--mui-palette-text-secondary) text-center text-sm">
                                    No academic thresholds match your filter or search query.
                                </p>
                            )}
                        </div>
                    </div>
                )}
        </CommonCard>
    );
}