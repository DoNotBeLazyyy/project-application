import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import CommonButton from '@components/button/CommonButton';
import CommonCard from '@components/card/CommonCard';
import CommonProgressBar from '@components/progress-bar/CommonProgressBar';
import CommonSelect from '@components/select/CommonSelect';
import CommonTabMenu from '@components/tab-menu/CommonTabMenu';
import InsightStatTile from '@pages/shared/analytics/InsightStatTile';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import {
    ArrowClockwiseIcon,
    ChatCircleTextIcon,
    CheckCircleIcon,
    FunnelIcon,
    ListChecksIcon,
    MagnifyingGlassIcon,
    QuotesIcon,
    StarIcon,
    TrendUpIcon,
    XIcon
} from '@phosphor-icons/react';
import { getFacultyEvaluationSummary } from '@services/faculty.service';
import { FacultyEvaluationSummary } from '@type/faculty.type';
import { formatShortDate } from '@utils/date.util';
import { SyntheticEvent, useEffect, useMemo, useState } from 'react';

type EvaluationSubTab = 'questions' | 'comments';

function formatRating(value: number | null): string {
    if (value === null || value === undefined) return '—';
    const formatted = Number(value).toFixed(2);
    return `${formatted} / 5.00`;
}

function resolveRatingVariant(rating: number | null): 'success' | 'warning' | 'error' | 'info' {
    if (rating === null || rating === undefined) return 'info';
    if (rating >= 4.5) return 'success';
    if (rating >= 3.5) return 'info';
    if (rating >= 2.5) return 'warning';
    return 'error';
}

function resolveRatingLabel(rating: number | null): string {
    if (rating === null || rating === undefined) return 'Unrated';
    if (rating >= 4.5) return 'Excellent';
    if (rating >= 4.0) return 'Very Good';
    if (rating >= 3.5) return 'Good';
    if (rating >= 2.5) return 'Satisfactory';
    return 'Needs Improvement';
}

const RATING_FILTER_OPTIONS = [
    { label: 'All Ratings', value: 'ALL' },
    { label: '5 Stars (4.5 – 5.0)', value: '5' },
    { label: '4 Stars & Above (4.0+)', value: '4PLUS' },
    { label: 'Below 4.0 Stars (< 4.0)', value: '3MINUS' },
    { label: 'Low Ratings (< 3.0)', value: 'LOW' }
];

export default function FacultyEvaluationsPage() {
    const [summary, setSummary] = useState<FacultyEvaluationSummary | null>(null);
    const [activeTab, setActiveTab] = useState<EvaluationSubTab>('questions');

    // Filter states
    const [selectedCourse, setSelectedCourse] = useState<string>('');
    const [selectedSection, setSelectedSection] = useState<string>('');
    const [selectedRating, setSelectedRating] = useState<string>('ALL');
    const [searchQuery, setSearchQuery] = useState<string>('');

    useEffect(function() {
        async function fetchSummary() {
            const result = await getFacultyEvaluationSummary();
            if (result.data) {
                setSummary(result.data);
            }
        }

        fetchSummary();
    }, []);

    function handleTabChange(_: SyntheticEvent, value: string) {
        setActiveTab(value as EvaluationSubTab);
    }

    function handleResetFilters() {
        setSelectedCourse('');
        setSelectedSection('');
        setSelectedRating('ALL');
        setSearchQuery('');
    }

    // Dynamic options
    const courseOptions = useMemo(() => {
        if (!summary?.sections) return [{ label: 'All Courses / Subjects', value: '' }];
        const uniqueCourses = new Map<string, string>();
        summary.sections.forEach((s) => {
            if (!uniqueCourses.has(s.course_code)) {
                uniqueCourses.set(s.course_code, `${s.course_code} - ${s.course_title}`);
            }
        });
        return [
            { label: 'All Courses / Subjects', value: '' },
            ...Array.from(uniqueCourses.entries()).map(([code, title]) => ({
                label: title,
                value: code
            }))
        ];
    }, [summary]);

    const sectionOptions = useMemo(() => {
        if (!summary?.sections) return [{ label: 'All Sections', value: '' }];
        let secs = summary.sections;
        if (selectedCourse) {
            secs = secs.filter((s) => s.course_code === selectedCourse);
        }
        return [
            { label: 'All Sections', value: '' },
            ...secs.map((s) => ({
                label: `${s.section_code} (${s.course_code})`,
                value: s.section_code
            }))
        ];
    }, [summary, selectedCourse]);

    // Filtered data sets
    const filteredSections = useMemo(() => {
        if (!summary?.sections) return [];
        return summary.sections.filter((sec) => {
            if (selectedCourse && sec.course_code !== selectedCourse) return false;
            if (selectedSection && sec.section_code !== selectedSection) return false;

            if (selectedRating !== 'ALL' && sec.avg_rating !== null) {
                const r = sec.avg_rating;
                if (selectedRating === '5' && r < 4.5) return false;
                if (selectedRating === '4PLUS' && r < 4.0) return false;
                if (selectedRating === '3MINUS' && r >= 4.0) return false;
                if (selectedRating === 'LOW' && r >= 3.0) return false;
            }

            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const matchCourse = sec.course_code.toLowerCase().includes(q);
                const matchSection = sec.section_code.toLowerCase().includes(q);
                const matchTitle = sec.course_title.toLowerCase().includes(q);
                if (!matchCourse && !matchSection && !matchTitle) return false;
            }

            return true;
        });
    }, [summary, selectedCourse, selectedSection, selectedRating, searchQuery]);

    const filteredComments = useMemo(() => {
        if (!summary?.comments) return [];
        return summary.comments.filter((comment) => {
            if (selectedCourse && comment.course_code !== selectedCourse) return false;
            if (selectedSection && comment.section_code !== selectedSection) return false;

            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const matchText = comment.response_text.toLowerCase().includes(q);
                const matchCourse = comment.course_code.toLowerCase().includes(q);
                const matchSection = comment.section_code.toLowerCase().includes(q);
                if (!matchText && !matchCourse && !matchSection) return false;
            }

            return true;
        });
    }, [summary, selectedCourse, selectedSection, searchQuery]);

    const filteredQuestions = useMemo(() => {
        if (!summary?.questions) return [];
        return summary.questions.filter((qItem) => {
            if (selectedRating !== 'ALL' && qItem.avg_rating !== null) {
                const r = qItem.avg_rating;
                if (selectedRating === '5' && r < 4.5) return false;
                if (selectedRating === '4PLUS' && r < 4.0) return false;
                if (selectedRating === '3MINUS' && r >= 4.0) return false;
                if (selectedRating === 'LOW' && r >= 3.0) return false;
            }

            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const matchText = qItem.question_text.toLowerCase().includes(q);
                const matchType = qItem.question_type.toLowerCase().includes(q);
                if (!matchText && !matchType) return false;
            }

            return true;
        });
    }, [summary, selectedRating, searchQuery]);

    const isFiltered = Boolean(selectedCourse || selectedSection || selectedRating !== 'ALL' || searchQuery.trim());

    // Highlight top & bottom questions
    const { topQuestionId, lowestQuestionId } = useMemo(() => {
        if (!summary?.questions || summary.questions.length < 2) return { topQuestionId: null, lowestQuestionId: null };
        let highest = -1;
        let lowest = 6;
        let topId: string | null = null;
        let lowId: string | null = null;

        summary.questions.forEach((q) => {
            if (q.avg_rating !== null) {
                if (q.avg_rating > highest) {
                    highest = q.avg_rating;
                    topId = q.question_id;
                }
                if (q.avg_rating < lowest) {
                    lowest = q.avg_rating;
                    lowId = q.question_id;
                }
            }
        });

        return { topQuestionId: topId, lowestQuestionId: lowId };
    }, [summary]);

    // Derived statistics
    const computedStats = useMemo(() => {
        if (!summary) {
            return {
                activeSectionsCount: 0,
                avgRating: null,
                dist: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
                highRatingsCount: 0,
                totalDistCount: 0,
                totalEvals: 0
            };
        }

        const dist = summary.rating_distribution ?? { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        const totalDistCount = dist[1] + dist[2] + dist[3] + dist[4] + dist[5];
        const highRatingsCount = dist[5] + dist[4];

        if (!isFiltered) {
            return {
                activeSectionsCount: summary.sections.length,
                avgRating: summary.overall_avg_rating,
                dist,
                highRatingsCount,
                totalDistCount,
                totalEvals: summary.total_evaluations_count
            };
        }

        let totalEvalsSum = 0;
        let weightedRatingSum = 0;
        filteredSections.forEach((sec) => {
            const count = sec.evaluations_count || 1;
            totalEvalsSum += count;
            if (sec.avg_rating !== null) {
                weightedRatingSum += sec.avg_rating * count;
            }
        });

        const avgRating = totalEvalsSum > 0 ? weightedRatingSum / totalEvalsSum : null;

        return {
            activeSectionsCount: filteredSections.length,
            avgRating,
            dist,
            highRatingsCount,
            totalDistCount,
            totalEvals: totalEvalsSum
        };
    }, [summary, isFiltered, filteredSections]);

    return (
        <CommonCard className="bg-(--mui-palette-background-paper) border border-(--mui-palette-divider) flex flex-col gap-6 min-h-full p-6 rounded-xl shadow-2xs w-full">
            {/* Page Header */}
            <div className="border-b border-(--mui-palette-divider) flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <h1 className="font-semibold text-(--mui-palette-text-primary) text-xl">
                            Student Evaluations
                        </h1>
                        {summary?.overall_avg_rating && (
                            <CommonBadgeStatus
                                label={resolveRatingLabel(computedStats.avgRating)}
                                variant={resolveRatingVariant(computedStats.avgRating)}
                            />
                        )}
                    </div>
                    <p className="m-0 text-(--mui-palette-text-secondary) text-sm">
                        Anonymous student performance ratings, itemized teaching feedback, and qualitative suggestions.
                    </p>
                </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="bg-(--mui-palette-background-default) border border-(--mui-palette-divider) flex flex-col gap-3 p-4 rounded-xl">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-(--mui-palette-text-primary) font-medium text-sm">
                        <FunnelIcon className="text-(--mui-palette-primary-main)" size={18} weight="bold" />
                        <span>Filter & Search Evaluations</span>
                    </div>
                    {isFiltered && (
                        <CommonButton
                            onClick={handleResetFilters}
                            size="small"
                            startIcon={<ArrowClockwiseIcon />}
                            variant="text"
                        >
                            Reset Filters
                        </CommonButton>
                    )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                    {/* Course Filter */}
                    <CommonSelect
                        fullWidth
                        label=""
                        options={courseOptions}
                        placeholder="Select Course / Subject"
                        size="small"
                        value={selectedCourse}
                        onChange={(e) => {
                            setSelectedCourse(e.target.value as string);
                            setSelectedSection('');
                        }}
                    />

                    {/* Section Filter */}
                    <CommonSelect
                        fullWidth
                        label=""
                        options={sectionOptions}
                        placeholder="Select Section"
                        size="small"
                        value={selectedSection}
                        onChange={(e) => setSelectedSection(e.target.value as string)}
                    />

                    {/* Rating Level Filter */}
                    <CommonSelect
                        fullWidth
                        label=""
                        options={RATING_FILTER_OPTIONS}
                        placeholder="Filter by Rating"
                        size="small"
                        value={selectedRating}
                        onChange={(e) => setSelectedRating(e.target.value as string)}
                    />

                    {/* Text Search Field */}
                    <TextField
                        fullWidth
                        placeholder="Search feedback, questions..."
                        size="small"
                        slotProps={{
                            input: {
                                endAdornment: searchQuery ? (
                                    <InputAdornment position="end">
                                        <IconButton size="small" onClick={() => setSearchQuery('')}>
                                            <XIcon size={14} />
                                        </IconButton>
                                    </InputAdornment>
                                ) : null,
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <MagnifyingGlassIcon className="text-(--mui-palette-text-secondary)" size={18} />
                                    </InputAdornment>
                                )
                            }
                        }}
                        value={searchQuery}
                        variant="outlined"
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {/* Active Filter Chips */}
                {isFiltered && (
                    <div className="flex flex-wrap gap-2 items-center pt-1 border-t border-(--mui-palette-divider)">
                        <span className="text-xs text-(--mui-palette-text-secondary) font-medium">Active Filters:</span>
                        {selectedCourse && (
                            <Chip
                                label={`Course: ${selectedCourse}`}
                                size="small"
                                onDelete={() => setSelectedCourse('')}
                            />
                        )}
                        {selectedSection && (
                            <Chip
                                label={`Section: ${selectedSection}`}
                                size="small"
                                onDelete={() => setSelectedSection('')}
                            />
                        )}
                        {selectedRating !== 'ALL' && (
                            <Chip
                                label={`Rating: ${RATING_FILTER_OPTIONS.find((r) => r.value === selectedRating)?.label}`}
                                size="small"
                                onDelete={() => setSelectedRating('ALL')}
                            />
                        )}
                        {searchQuery.trim() && (
                            <Chip
                                label={`Search: "${searchQuery}"`}
                                size="small"
                                onDelete={() => setSearchQuery('')}
                            />
                        )}
                    </div>
                )}
            </div>

            {/* Insight Overview Tiles */}
            <div className="gap-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
                <InsightStatTile
                    hint={isFiltered ? 'Filtered average rating' : 'Calculated from student surveys'}
                    label="Overall Rating"
                    value={formatRating(computedStats.avgRating)}
                />
                <InsightStatTile
                    hint={isFiltered ? 'Filtered submission count' : 'Submitted student evaluation forms'}
                    label="Evaluations Count"
                    value={String(computedStats.totalEvals)}
                />
                <InsightStatTile
                    hint="Ratings of 4.0 or higher"
                    label="5-Star & 4-Star Reviews"
                    value={`${computedStats.highRatingsCount} ratings`}
                />
                <InsightStatTile
                    hint={isFiltered ? 'Filtered sections count' : 'Evaluated teaching sections'}
                    label="Active Sections"
                    value={`${computedStats.activeSectionsCount} sections`}
                />
            </div>

            {/* Rating Distribution & Section Performance */}
            <div className="gap-4 grid grid-cols-1 xl:grid-cols-2">
                {/* Rating Distribution Card */}
                <CommonCard
                    cardHeaderProps={{
                        subheader: 'Breakdown of rating scores submitted by students across evaluated sections.',
                        title: 'Rating Distribution'
                    }}
                    className="flex flex-col"
                >
                    <div className="flex flex-col gap-3 p-4 pt-0">
                        {[5, 4, 3, 2, 1].map((stars) => {
                            const count = computedStats.dist[stars as 1 | 2 | 3 | 4 | 5] ?? 0;
                            const pct = computedStats.totalDistCount > 0
                                ? (count / computedStats.totalDistCount) * 100
                                : 0;
                            const isSelected = selectedRating === String(stars);

                            return (
                                <div
                                    className={`flex gap-3 items-center p-1.5 rounded-lg transition-colors cursor-pointer hover:bg-(--mui-palette-action-hover) ${isSelected ? 'bg-(--mui-palette-action-selected) font-semibold' : ''}`}
                                    key={stars}
                                    onClick={() => setSelectedRating(isSelected ? 'ALL' : String(stars))}
                                >
                                    <span className="flex font-medium gap-1 items-center shrink-0 text-(--mui-palette-text-primary) text-sm w-20">
                                        <StarIcon className="text-amber-500" size={16} weight="fill" />
                                        {stars} Stars
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <CommonProgressBar percentage={pct} type="bar" />
                                    </div>
                                    <span className="shrink-0 text-(--mui-palette-text-secondary) text-xs w-16 text-right font-mono">
                                        {count} ({pct.toFixed(0)}%)
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </CommonCard>

                {/* Section Performance Card */}
                <CommonCard
                    cardHeaderProps={{
                        subheader: `Average score by course section (${filteredSections.length} displayed).`,
                        title: 'Section Performance'
                    }}
                    className="flex flex-col"
                >
                    <div className="flex flex-col gap-2 p-4 pt-0 max-h-[320px] overflow-y-auto">
                        {filteredSections.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-8 text-center text-(--mui-palette-text-secondary)">
                                <FunnelIcon className="opacity-40 mb-2" size={32} />
                                <p className="m-0 text-sm font-medium">No sections match your filter criteria.</p>
                                <p className="m-0 text-xs text-(--mui-palette-text-secondary) mt-1">Try resetting or broadening your search filters.</p>
                            </div>
                        )}
                        {filteredSections.map((sec) => {
                            const isCurrentSelected = selectedSection === sec.section_code;
                            const scorePct = sec.avg_rating !== null ? (sec.avg_rating / 5) * 100 : 0;

                            return (
                                <div
                                    className={`border border-(--mui-palette-divider) flex flex-col gap-2 p-3 rounded-lg transition-colors hover:border-(--mui-palette-primary-main) ${isCurrentSelected ? 'bg-(--mui-palette-primary-50) border-(--mui-palette-primary-main)' : ''}`}
                                    key={sec.section_id}
                                >
                                    <div className="flex gap-3 items-center justify-between">
                                        <div className="flex flex-col gap-0.5 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-(--mui-palette-text-primary) text-sm truncate">
                                                    {sec.course_code} · {sec.section_code}
                                                </span>
                                                <Chip
                                                    className="h-5 text-[10px]"
                                                    label={`${sec.evaluations_count} eval(s)`}
                                                    size="small"
                                                    variant="outlined"
                                                />
                                            </div>
                                            <span className="text-(--mui-palette-text-secondary) text-xs truncate">
                                                {sec.course_title}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <CommonBadgeStatus
                                                label={formatRating(sec.avg_rating)}
                                                variant={resolveRatingVariant(sec.avg_rating)}
                                            />
                                            <Tooltip title={isCurrentSelected ? 'Clear Section Filter' : 'Filter by this section'}>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => setSelectedSection(isCurrentSelected ? '' : sec.section_code)}
                                                >
                                                    <FunnelIcon size={14} weight={isCurrentSelected ? 'fill' : 'regular'} />
                                                </IconButton>
                                            </Tooltip>
                                        </div>
                                    </div>
                                    <div className="w-full">
                                        <CommonProgressBar percentage={scorePct} type="bar" />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </CommonCard>
            </div>

            {/* Tabbed Question Breakdown & Student Comments */}
            <CommonCard className="flex flex-col gap-4 p-4">
                <CommonTabMenu
                    menuStyle="outline"
                    tabs={[
                        {
                            icon: <ListChecksIcon />,
                            label: `Question Breakdown (${filteredQuestions.length})`,
                            value: 'questions'
                        },
                        {
                            icon: <ChatCircleTextIcon />,
                            label: `Student Feedback (${filteredComments.length})`,
                            value: 'comments'
                        }
                    ]}
                    value={activeTab}
                    onChange={handleTabChange}
                />

                {/* Tab 1: Question Breakdown */}
                {activeTab === 'questions' && (
                    <div className="flex flex-col gap-3">
                        {filteredQuestions.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-12 text-center text-(--mui-palette-text-secondary)">
                                <ListChecksIcon className="opacity-40 mb-2" size={36} />
                                <p className="m-0 text-sm font-medium">No evaluation questions match your search or filter.</p>
                                {isFiltered && (
                                    <CommonButton
                                        className="mt-3"
                                        onClick={handleResetFilters}
                                        size="xsmall"
                                        startIcon={<ArrowClockwiseIcon />}
                                    >
                                        Reset Filters
                                    </CommonButton>
                                )}
                            </div>
                        )}

                        {filteredQuestions.map((q, idx) => {
                            const isTop = q.question_id === topQuestionId;
                            const isLowest = q.question_id === lowestQuestionId && summary?.questions && summary.questions.length > 2;
                            const scorePct = q.avg_rating !== null ? (q.avg_rating / 5) * 100 : 0;

                            return (
                                <div
                                    className="bg-(--mui-palette-background-paper) border border-(--mui-palette-divider) flex flex-col gap-3 p-4 rounded-xl shadow-2xs hover:shadow-xs transition-shadow"
                                    key={q.question_id}
                                >
                                    <div className="flex flex-wrap gap-2 items-start justify-between">
                                        <div className="flex flex-col gap-1 flex-1 min-w-[240px]">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="font-semibold text-(--mui-palette-primary-main) text-xs bg-(--mui-palette-primary-50) px-2 py-0.5 rounded-full border border-(--mui-palette-primary-200)">
                                                    Q{idx + 1} · {q.question_type}
                                                </span>
                                                {isTop && (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                                        <TrendUpIcon size={12} weight="bold" /> Highest Rated
                                                    </span>
                                                )}
                                                {isLowest && (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                                                        Area for Growth
                                                    </span>
                                                )}
                                            </div>
                                            <h3 className="font-medium text-(--mui-palette-text-primary) text-sm mt-1 m-0">
                                                {q.question_text}
                                            </h3>
                                        </div>

                                        <div className="flex items-center gap-3 shrink-0">
                                            <div className="flex flex-col items-end">
                                                <div className="flex items-center gap-1">
                                                    <StarIcon className="text-amber-500" size={16} weight="fill" />
                                                    <span className="font-bold text-base text-(--mui-palette-text-primary)">
                                                        {q.avg_rating !== null ? q.avg_rating.toFixed(2) : '—'}
                                                    </span>
                                                    <span className="text-xs text-(--mui-palette-text-secondary)">/ 5.00</span>
                                                </div>
                                                <span className="text-[11px] text-(--mui-palette-text-secondary)">
                                                    {q.responses_count} response(s)
                                                </span>
                                            </div>
                                            <CommonBadgeStatus
                                                label={resolveRatingLabel(q.avg_rating)}
                                                variant={resolveRatingVariant(q.avg_rating)}
                                            />
                                        </div>
                                    </div>

                                    {/* Progress bar visual indicator */}
                                    <div className="pt-1 w-full">
                                        <CommonProgressBar percentage={scorePct} type="bar" />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Tab 2: Student Feedback & Comments */}
                {activeTab === 'comments' && (
                    <div className="flex flex-col gap-3">
                        {filteredComments.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-12 text-center text-(--mui-palette-text-secondary)">
                                <ChatCircleTextIcon className="opacity-40 mb-2" size={36} />
                                <p className="m-0 text-sm font-medium">No student comments match your selected filters.</p>
                                {isFiltered && (
                                    <CommonButton
                                        className="mt-3"
                                        onClick={handleResetFilters}
                                        size="xsmall"
                                        startIcon={<ArrowClockwiseIcon />}
                                    >
                                        Clear Filters
                                    </CommonButton>
                                )}
                            </div>
                        )}

                        {filteredComments.map((comment) => (
                            <div
                                className="bg-(--mui-palette-background-default) border-l-4 border-l-(--mui-palette-primary-main) border border-(--mui-palette-divider) flex flex-col gap-2.5 p-4 rounded-r-xl shadow-2xs hover:bg-(--mui-palette-background-paper) transition-colors"
                                key={comment.response_id}
                            >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <Chip
                                            className="font-semibold text-xs"
                                            color="primary"
                                            label={`${comment.course_code} · ${comment.section_code}`}
                                            size="small"
                                            variant="outlined"
                                        />
                                        <span className="text-xs text-(--mui-palette-text-secondary) flex items-center gap-1">
                                            <CheckCircleIcon className="text-emerald-500" size={14} weight="fill" /> Verified Student Response
                                        </span>
                                    </div>
                                    <span className="text-(--mui-palette-text-secondary) text-xs">
                                        {formatShortDate(comment.created_at)}
                                    </span>
                                </div>
                                <div className="flex items-start gap-3 pt-1">
                                    <QuotesIcon className="text-(--mui-palette-primary-main) shrink-0 opacity-40 mt-0.5" size={24} weight="fill" />
                                    <p className="italic m-0 text-(--mui-palette-text-primary) text-sm leading-relaxed">
                                        &ldquo;{comment.response_text}&rdquo;
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CommonCard>
        </CommonCard>
    );
}