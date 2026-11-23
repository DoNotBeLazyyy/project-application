import { INSTITUTION_ADDRESS, INSTITUTION_CAMPUS, INSTITUTION_NAME } from '@constants/institution.constant';
import { CurriculumMapEntry, CurriculumMapGrouped } from '@type/curriculum-map.type';
import { classMerge } from '@utils/css.util';

interface CurriculumPrintSheetProps {
    grouped: CurriculumMapGrouped[];
    programLabel?: string;
    schoolYearLabel?: string;
}

type PrintTerm = CurriculumMapGrouped['terms'][number];

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

function formatUnits(value: number): string {
    return Number(value) > 0
        ? String(value)
        : '';
}

function stripSummerSuffix(label: string): string {
    return label.replace(/\s+—\s+SUMMER$/, '');
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
                    <col
                        style={{
                            width: isWide
                                ? '7%'
                                : '9%'
                        }}
                    />
                    <col
                        style={{
                            width: isWide
                                ? '13%'
                                : '16%'
                        }}
                    />
                    <col />
                    <col
                        style={{
                            width: isWide
                                ? '8%'
                                : '6%'
                        }}
                    />
                    <col
                        style={{
                            width: isWide
                                ? '8%'
                                : '6%'
                        }}
                    />
                    <col
                        style={{
                            width: isWide
                                ? '22%'
                                : '14%'
                        }}
                    />
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
                                <td className={CELL}>{entry.course_code}</td>
                                <td className={CELL}>{entry.course_title}</td>
                                <td className={`${CELL} text-center`}>{formatUnits(entry.lecture_units)}</td>
                                <td className={`${CELL} text-center`}>{formatUnits(entry.laboratory_units)}</td>
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
    grouped,
    programLabel,
    schoolYearLabel
}: CurriculumPrintSheetProps) {
    const electives = grouped
        .flatMap((group) => group.terms)
        .flatMap((term) => term.entries)
        .filter((entry) => entry.is_elective);
    const electiveUnits = electives.reduce((sum, entry) => sum + (Number(entry.total_units) || 0), 0);
    // "Elective 1", "Elective 2"... are slot placeholders; only real elective titles are listed
    const electiveTitles = Array.from(new Set(electives.map((entry) => entry.course_title)))
        .filter((title) => !/^elective\s*\d*$/i.test(title.trim()));

    return (
        <div className="curriculum-print-sheet flex flex-col gap-3 text-[8pt] text-black">
            <div className="flex flex-col items-center leading-snug text-center">
                <p className="font-semibold m-0 text-[9pt]">
                    {INSTITUTION_NAME}
                </p>
                <p className="italic m-0">
                    {INSTITUTION_CAMPUS}
                </p>
                <p className="italic m-0">
                    {INSTITUTION_ADDRESS}
                </p>
                <p className="font-semibold m-0 mt-3 text-[9pt]">
                    {programLabel}
                </p>
                {schoolYearLabel && (
                    <p className="m-0">
                        Effective SY {schoolYearLabel}
                    </p>
                )}
            </div>

            <div className="grid gap-x-16 gap-y-3 grid-cols-2 text-[9pt]">
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

            {electives.length > 0 && (
                <div className="border border-black break-inside-avoid flex flex-col gap-2 mt-3 mx-auto px-2 py-1.5 w-[70%]">
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