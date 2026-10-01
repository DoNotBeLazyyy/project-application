export type StudentStatus = 'Active' | 'Inactive' | 'Suspended' | 'Graduated' | 'On Leave';
export type SectionStatus = 'Open' | 'Closed' | 'Cancelled';
export type EnrollmentStatus = 'Enrolled' | 'Dropped' | 'Withdrawn' | 'Completed';

export interface PrerequisiteRequirement {
    kind: 'standing' | 'course';
    prerequisiteCourseId?: string;
    prerequisiteCourseCode?: string;
    requiredYearLevel?: number;
    minimumGrade?: number; // e.g. 3.00
    isMandatory: boolean;
}

export interface StudentProfile {
    id: string;
    studentNumber: string;
    name: string;
    status: StudentStatus;
    programId: string | null;
    yearLevel: number;
    completedCourses: {
        courseId: string;
        courseCode: string;
        finalGrade: number; // e.g. 1.75
    }[];
    enrolledSections: {
        sectionId: string;
        sectionCode: string;
        courseId: string;
        courseCode: string;
        termId: string;
        schedules: {
            dayOfWeek: string;
            timeStart: string; // "08:00" (24h) or "08:00 AM"
            timeEnd: string; // "10:00" (24h) or "10:00 AM"
        }[];
    }[];
}

export interface SectionDetails {
    id: string;
    sectionCode: string;
    courseId: string;
    courseCode: string;
    termId: string;
    enrollmentStartDate?: string | null;
    enrollmentEndDate?: string | null;
    status: SectionStatus;
    maxSlots: number;
    currentSlotsTaken: number;
    schedules: {
        dayOfWeek: string;
        timeStart: string;
        timeEnd: string;
    }[];
    curriculumProgramIds: string[]; // Program IDs where this course is part of curriculum
    prerequisites: PrerequisiteRequirement[];
}

export interface EnrollmentClearanceOutcome {
    canEnroll: boolean;
    errorCode?: 'STUDENT_NOT_FOUND' | 'STUDENT_INACTIVE' | 'NO_PROGRAM' | 'SECTION_UNAVAILABLE' | 'ENROLLMENT_WINDOW_CLOSED' | 'NOT_IN_CURRICULUM' | 'ALREADY_TAKEN' | 'SECTION_FULL' | 'PREREQUISITE_UNMET' | 'SCHEDULE_CONFLICT';
    message: string;
    unmetPrerequisites?: string[];
    conflictingSections?: string[];
}

function parseTimeToMinutes(timeStr: string): number {
    const cleaned = timeStr.trim()
        .toUpperCase();
    const isPM = cleaned.includes('PM');
    const isAM = cleaned.includes('AM');
    const timeParts = cleaned.replace(/[AP]M/g, '')
        .trim()
        .split(':');

    let hours = parseInt(timeParts[0], 10);
    const minutes = parseInt(timeParts[1] || '0', 10);

    if (isPM && hours < 12) hours += 12;
    if (isAM && hours === 12) hours = 0;

    return hours * 60 + minutes;
}

export function checkScheduleOverlap(
    schedA: { dayOfWeek: string; timeStart: string; timeEnd: string },
    schedB: { dayOfWeek: string; timeStart: string; timeEnd: string }
): boolean {
    if (schedA.dayOfWeek.toLowerCase() !== schedB.dayOfWeek.toLowerCase()) {
        return false;
    }

    const startA = parseTimeToMinutes(schedA.timeStart);
    const endA = parseTimeToMinutes(schedA.timeEnd);
    const startB = parseTimeToMinutes(schedB.timeStart);
    const endB = parseTimeToMinutes(schedB.timeEnd);

    // Standard interval overlap: startA < endB && startB < endA
    return startA < endB && startB < endA;
}

/**
 * Validates whether a student can enroll in a specific section through all clearance gates.
 */
export function evaluateEnrollmentClearance(
    student: StudentProfile,
    section: SectionDetails,
    options?: {
        overridePrerequisites?: boolean;
        allowConflict?: boolean;
        conflictReason?: string;
    }
): EnrollmentClearanceOutcome {
    // 1. Student Status Check
    if (student.status !== 'Active') {
        return {
            canEnroll: false,
            errorCode: 'STUDENT_INACTIVE',
            message: 'Only active students can be enrolled.'
        };
    }

    // 2. Program Assignment Check
    if (!student.programId) {
        return {
            canEnroll: false,
            errorCode: 'NO_PROGRAM',
            message: 'Student has no program assigned.'
        };
    }

    // 3. Section Availability Check
    if (section.status === 'Closed' || section.status === 'Cancelled') {
        return {
            canEnroll: false,
            errorCode: 'SECTION_UNAVAILABLE',
            message: `${section.sectionCode} is ${section.status.toLowerCase()} and cannot accept enrollments.`
        };
    }

    // 3.5 Term Enrollment Window Check
    if (section.enrollmentStartDate || section.enrollmentEndDate) {
        const todayStr = new Date().toISOString().split('T')[0];
        if (section.enrollmentStartDate && todayStr < section.enrollmentStartDate && !options?.overridePrerequisites) {
            return {
                canEnroll: false,
                errorCode: 'ENROLLMENT_WINDOW_CLOSED',
                message: `Enrollment window for ${section.sectionCode} has not opened yet. Starts on ${section.enrollmentStartDate}.`
            };
        }
        if (section.enrollmentEndDate && todayStr > section.enrollmentEndDate && !options?.overridePrerequisites) {
            return {
                canEnroll: false,
                errorCode: 'ENROLLMENT_WINDOW_CLOSED',
                message: `Enrollment window for ${section.sectionCode} closed on ${section.enrollmentEndDate}.`
            };
        }
    }

    // 4. Curriculum Alignment Check
    if (!section.curriculumProgramIds.includes(student.programId)) {
        return {
            canEnroll: false,
            errorCode: 'NOT_IN_CURRICULUM',
            message: `${section.courseCode} is not part of the student's program curriculum.`
        };
    }

    // 5. Already Taken / Currently Enrolled Check
    const alreadyEnrolled = student.enrolledSections.some(
        (es) => es.courseId === section.courseId && es.termId === section.termId
    );
    const alreadyCompleted = student.completedCourses.some(
        (cc) => cc.courseId === section.courseId && cc.finalGrade <= 3.00
    );

    if (alreadyEnrolled || alreadyCompleted) {
        return {
            canEnroll: false,
            errorCode: 'ALREADY_TAKEN',
            message: `Student is already enrolled in or has completed ${section.courseCode}.`
        };
    }

    // 6. Section Capacity Check
    if (section.currentSlotsTaken >= section.maxSlots) {
        return {
            canEnroll: false,
            errorCode: 'SECTION_FULL',
            message: `${section.sectionCode} is already full.`
        };
    }

    // 7. Prerequisite Verification Gate
    const unmetPrereqs: string[] = [];
    for (const prereq of section.prerequisites) {
        if (!prereq.isMandatory) continue;

        if (prereq.kind === 'standing') {
            if (prereq.requiredYearLevel && student.yearLevel < prereq.requiredYearLevel) {
                unmetPrereqs.push(`Year ${prereq.requiredYearLevel} standing`);
            }
        }
        else if (prereq.kind === 'course') {
            const match = student.completedCourses.find(
                (cc) => cc.courseId === prereq.prerequisiteCourseId
            );
            const minGrade = prereq.minimumGrade ?? 3.00;
            if (!match || match.finalGrade > minGrade) {
                unmetPrereqs.push(prereq.prerequisiteCourseCode || 'Prerequisite course');
            }
        }
    }

    if (unmetPrereqs.length > 0 && !options?.overridePrerequisites) {
        return {
            canEnroll: false,
            errorCode: 'PREREQUISITE_UNMET',
            message: `${section.courseCode} requires ${unmetPrereqs.join(', ')}.`,
            unmetPrerequisites: unmetPrereqs
        };
    }

    // 8. Schedule Conflict Detection
    const conflicts: string[] = [];
    for (const enrolledSec of student.enrolledSections) {
        if (enrolledSec.termId !== section.termId) continue;

        for (const enrolledSched of enrolledSec.schedules) {
            for (const newSched of section.schedules) {
                if (checkScheduleOverlap(enrolledSched, newSched)) {
                    conflicts.push(`${enrolledSec.sectionCode} (${enrolledSec.courseCode})`);
                }
            }
        }
    }

    if (conflicts.length > 0 && !options?.allowConflict) {
        return {
            canEnroll: false,
            errorCode: 'SCHEDULE_CONFLICT',
            message: `${section.sectionCode} conflicts with ${[...new Set(conflicts)].join(', ')}.`,
            conflictingSections: [...new Set(conflicts)]
        };
    }

    return {
        canEnroll: true,
        message: `Enrolled in ${section.sectionCode}.`
    };
}