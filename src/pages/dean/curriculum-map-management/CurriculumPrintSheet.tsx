import InstitutionLogo from '@components/logo/InstitutionLogo';
import { INSTITUTION_ADDRESS, INSTITUTION_CAMPUS, INSTITUTION_NAME } from '@constants/institution.constant';
import { CurriculumMapEntry, CurriculumMapGrouped } from '@type/curriculum-map.type';
import { classMerge } from '@utils/css.util';

interface CurriculumPrintSheetProps {
    electiveTracks?: string[];
    grouped: CurriculumMapGrouped[];
    programLabel?: string;
    schoolYearLabel?: string;
}

type PrintTerm = CurriculumMapGrouped['terms'][number];

const PAPER_STYLE = { backgroundColor: '#FFFFFF', color: '#000000' };

// Blank mark, Code, Description, Lec, Lab, Pre-req. (Description takes the rest)
const HALF_COLUMN_WIDTHS = ['3%', '17%', undefined, '7%', '7%', '14%'];
const WIDE_COLUMN_WIDTHS = ['3%', '13%', undefined, '7%', '7%', '20%'];

const CELL = 'border border-black px-1 py-px align-middle';
const HEAD_CELL = `${CELL} font-semibold text-center`;

function formatPrerequisites(entry: CurriculumMapEntry): string {
    const codes = (entry.prerequisites ?? [])
        .map((prerequisite) => prerequisite.code)
        .filter(Boolean);

    return codes.length > 0
        ? codes.join(', ')
        : 'None';
}

// Same source order as the on-screen table: the entry's per-type units first, then the course's
function getUnits(entry: CurriculumMapEntry, typeCodes: string[], fallback: number): string {
    const typeCode = typeCodes.find((code) => entry.type_units?.[code] !== undefined);
    const value = Number(typeCode
        ? entry.type_units?.[typeCode]
        : fallback);

    return value > 0
        ? String(value)
        : '';
}

function stripSummerSuffix(label: string): string {
    return label.replace(/\s+—\s+SUMMER$/, '');
}

// School-year labels read like "Academic Year 2026-2027"; the sheet prints only the year range
function formatSchoolYear(label: string): string {
    return label.match(/\d{4}\s*[-–]\s*\d{4}/)?.[0] ?? label;
}

function SignatureLine({ label }: { label: string }) {
    return (
        <div className="flex items-end gap-2">
            <span className="font-semibold whitespace-nowrap">
                {label}
            </span>
            <span className="border-b border-black flex-1 h-4" />
        </div>
    );
}

function TermTable({ term, isWide = false }: { term: PrintTerm; isWide?: boolean }) {
    return (
        <div className="flex flex-col">
            {!isWide && (
                <p className="font-semibold m-0 text-center uppercase">
                    {term.termTypeLabel}
                </p>
            )}
            <table className="border-collapse table-fixed w-full">
                <colgroup>
                    {(isWide
                        ? WIDE_COLUMN_WIDTHS
                        : HALF_COLUMN_WIDTHS).map((width, index) => (
                        <col
                            key={index}
                            style={{ width }}
                        />
                    ))}
                </colgroup>
                <thead>
                    <tr>
                        <th className={CELL} />
                        <th className={HEAD_CELL}>Code</th>
                        <th className={HEAD_CELL}>Description</th>
                        <th className={HEAD_CELL}>Lec</th>
                        <th className={HEAD_CELL}>Lab</th>
                        <th className={HEAD_CELL}>Pre-req.</th>
                    </tr>
                </thead>
                <tbody>
                    {term.entries.map(function(entry) {
                        const prerequisites = formatPrerequisites(entry);

                        return (
                            <tr key={entry.id}>
                                <td className={CELL} />
                                <td className={`${CELL} whitespace-nowrap`}>{entry.course_code}</td>
                                <td className={CELL}>{entry.course_title}</td>
                                <td className={`${CELL} text-center`}>{getUnits(entry, ['LEC', 'LECTURE'], entry.lecture_units)}</td>
                                <td className={`${CELL} text-center`}>{getUnits(entry, ['LAB', 'LABORATORY'], entry.laboratory_units)}</td>
                                <td
                                    className={
                                        classMerge(
                                            CELL,
                                            'text-center leading-tight',
                                            prerequisites.length > 10 && 'text-[6pt]'
                                        )
                                    }
                                >
                                    {prerequisites}
                                </td>
                            </tr>
                        );
                    })}
                    <tr>
                        <td
                            className={`${CELL} font-semibold text-right`}
                            colSpan={3}
                        >
                            Total Units
                        </td>
                        <td
                            className={`${CELL} text-center`}
                            colSpan={2}
                        >
                            {term.totalUnits}
                        </td>
                        <td className={CELL} />
                    </tr>
                </tbody>
            </table>
        </div>
    );
}

/**
 * The printed curriculum: the paper layout the campus uses, with each year's
 * semesters side by side, summer as one full-width table, and blank lines for
 * the evaluator. It shows only when printing; the screen keeps its own layout.
 *
 * Usage:
 *  <CurriculumPrintSheet grouped={grouped} programLabel="BS Computer Science" schoolYearLabel="2018-2019" />
 */
export default function CurriculumPrintSheet({
    electiveTracks = [],
    grouped,
    programLabel,
    schoolYearLabel
}: CurriculumPrintSheetProps) {
    const electives = grouped
        .flatMap((group) => group.terms)
        .flatMap((term) => term.entries)
        .filter((entry) => entry.is_elective);
    const electiveUnits = electives.reduce((sum, entry) => sum + (Number(entry.total_units) || 0), 0);
    // The program's saved tracks are listed; without them, real elective titles stand in
    // ("Elective 1", "Elective 2"... are slot placeholders, not names)
    const electiveTitles = electiveTracks.length > 0
        ? electiveTracks
        : Array.from(new Set(electives.map((entry) => entry.course_title)))
            .filter((title) => !/^elective\s*\d*$/i.test(title.trim()));

    return (
        <div
            className="curriculum-print-sheet flex flex-col gap-2 text-[8pt]"
            // Inline so dark mode's remapping of bg-white / text-black can't turn the paper dark
            style={PAPER_STYLE}
        >
            <div className="flex flex-col items-center leading-snug text-center">
                <InstitutionLogo
                    className="mb-1"
                    size={44}
                />
                <p className="font-semibold m-0 text-[9pt]">
                    {INSTITUTION_NAME}
                </p>
                <p className="italic m-0">
                    {INSTITUTION_CAMPUS}
                </p>
                <p className="italic m-0">
                    {INSTITUTION_ADDRESS}
                </p>
                <p className="font-semibold m-0 mt-2 text-[9pt]">
                    {programLabel}
                </p>
                {schoolYearLabel && (
                    <p className="m-0">
                        Effective SY {formatSchoolYear(schoolYearLabel)}
                    </p>
                )}
            </div>

            <div className="grid gap-x-16 gap-y-2 grid-cols-2 text-[9pt]">
                <SignatureLine label="STUDENT NO.:" />
                <SignatureLine label="DATE EVALUATED:" />
                <SignatureLine label="NAME:" />
                <SignatureLine label="EVALUATED BY:" />
            </div>

            {grouped.map(function(group) {
                return (
                    <section
                        className="break-inside-avoid flex flex-col gap-1"
                        key={group.key}
                    >
                        <p className="font-semibold m-0 text-center">
                            {group.isSummer
                                ? 'SUMMER'
                                : stripSummerSuffix(group.label)}
                        </p>
                        {group.isSummer
                            ? (
                                <div className="flex flex-col gap-2 mx-auto w-[82%]">
                                    {group.terms.map((term) => (
                                        <TermTable
                                            isWide
                                            key={term.termTypeId}
                                            term={term}
                                        />
                                    ))}
                                </div>
                            )
                            : (
                                <div className="grid gap-x-3 gap-y-2 grid-cols-2 items-start">
                                    {group.terms.map((term) => (
                                        <TermTable
                                            key={term.termTypeId}
                                            term={term}
                                        />
                                    ))}
                                </div>
                            )}
                    </section>
                );
            })}

            {(electives.length > 0 || electiveTracks.length > 0) && (
                <div className="border border-black break-inside-avoid flex flex-col gap-1 mt-2 mx-auto px-2 py-1 w-[70%]">
                    <p className="font-semibold italic m-0 underline">
                        ELECTIVES: ({electiveUnits} units)
                    </p>
                    {electiveTitles.length > 0 && (
                        <ul className="columns-2 gap-x-8 list-none m-0 p-0">
                            {electiveTitles.map((title) => (
                                <li key={title}>
                                    - {title}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}