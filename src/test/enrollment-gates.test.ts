import {
    checkScheduleOverlap,
    evaluateEnrollmentClearance,
    SectionDetails,
    StudentProfile
} from '@utils/enrollment-gates.util';
import { describe, expect, it } from 'vitest';

describe('Enrollment Status Transitions and Prerequisite Clearance Gates', () => {
    const defaultStudent: StudentProfile = {
        id: 'student-uuid-1',
        studentNumber: '2024-0001',
        name: 'Juan Dela Cruz',
        status: 'Active',
        programId: 'prog-bsit-uuid',
        yearLevel: 2,
        completedCourses: [
            { courseId: 'c-it101', courseCode: 'IT 101', finalGrade: 1.75 }
        ],
        enrolledSections: []
    };

    const baseSection: SectionDetails = {
        id: 'sec-it102-a',
        sectionCode: 'IT2A-SEC1',
        courseId: 'c-it102',
        courseCode: 'IT 102',
        termId: 'term-2026-1st',
        status: 'Open',
        maxSlots: 40,
        currentSlotsTaken: 25,
        schedules: [
            { dayOfWeek: 'Monday', timeStart: '08:00 AM', timeEnd: '10:00 AM' },
            { dayOfWeek: 'Wednesday', timeStart: '08:00 AM', timeEnd: '10:00 AM' }
        ],
        curriculumProgramIds: ['prog-bsit-uuid', 'prog-bscs-uuid'],
        prerequisites: [
            {
                kind: 'course',
                prerequisiteCourseId: 'c-it101',
                prerequisiteCourseCode: 'IT 101',
                minimumGrade: 3.00,
                isMandatory: true
            }
        ]
    };

    describe('1. Student Status Clearance Gate', () => {
        it('should allow active student to clear status gate', () => {
            const outcome = evaluateEnrollmentClearance(defaultStudent, baseSection);
            expect(outcome.canEnroll)
                .toBe(true);
            expect(outcome.message)
                .toContain('Enrolled in IT2A-SEC1');
        });

        it.each(['Inactive', 'Suspended', 'Graduated', 'On Leave'] as const)(
            'should block enrollment when student status is %s',
            (invalidStatus) => {
                const student = { ...defaultStudent, status: invalidStatus };
                const outcome = evaluateEnrollmentClearance(student, baseSection);
                expect(outcome.canEnroll)
                    .toBe(false);
                expect(outcome.errorCode)
                    .toBe('STUDENT_INACTIVE');
            }
        );

        it('should block enrollment when student has no program assigned', () => {
            const student = { ...defaultStudent, programId: null };
            const outcome = evaluateEnrollmentClearance(student, baseSection);
            expect(outcome.canEnroll)
                .toBe(false);
            expect(outcome.errorCode)
                .toBe('NO_PROGRAM');
        });
    });

    describe('2. Section Availability & Capacity Gate', () => {
        it.each(['Closed', 'Cancelled'] as const)(
            'should block enrollment when section status is %s',
            (sectionStatus) => {
                const section = { ...baseSection, status: sectionStatus };
                const outcome = evaluateEnrollmentClearance(defaultStudent, section);
                expect(outcome.canEnroll)
                    .toBe(false);
                expect(outcome.errorCode)
                    .toBe('SECTION_UNAVAILABLE');
            }
        );

        it('should block enrollment when section capacity is reached (currentSlotsTaken >= maxSlots)', () => {
            const fullSection = { ...baseSection, maxSlots: 30, currentSlotsTaken: 30 };
            const outcome = evaluateEnrollmentClearance(defaultStudent, fullSection);
            expect(outcome.canEnroll)
                .toBe(false);
            expect(outcome.errorCode)
                .toBe('SECTION_FULL');
            expect(outcome.message)
                .toContain('is already full');
        });

        it('should allow enrollment when slots are available (currentSlotsTaken < maxSlots)', () => {
            const sectionWithSlot = { ...baseSection, maxSlots: 30, currentSlotsTaken: 29 };
            const outcome = evaluateEnrollmentClearance(defaultStudent, sectionWithSlot);
            expect(outcome.canEnroll)
                .toBe(true);
        });
    });

    describe('3. Curriculum Alignment & Duplicate Prevention Gate', () => {
        it('should block enrollment if course is not in the student program curriculum', () => {
            const studentInDifferentProg = { ...defaultStudent, programId: 'prog-bsnursing-uuid' };
            const outcome = evaluateEnrollmentClearance(studentInDifferentProg, baseSection);
            expect(outcome.canEnroll)
                .toBe(false);
            expect(outcome.errorCode)
                .toBe('NOT_IN_CURRICULUM');
        });

        it('should block enrollment if student is already enrolled in this course in the same term', () => {
            const studentAlreadyEnrolled: StudentProfile = {
                ...defaultStudent,
                enrolledSections: [
                    {
                        sectionId: 'sec-it102-b',
                        sectionCode: 'IT2A-SEC2',
                        courseId: 'c-it102',
                        courseCode: 'IT 102',
                        termId: 'term-2026-1st',
                        schedules: []
                    }
                ]
            };

            const outcome = evaluateEnrollmentClearance(studentAlreadyEnrolled, baseSection);
            expect(outcome.canEnroll)
                .toBe(false);
            expect(outcome.errorCode)
                .toBe('ALREADY_TAKEN');
        });

        it('should block enrollment if student has already completed and passed the course', () => {
            const studentAlreadyPassed: StudentProfile = {
                ...defaultStudent,
                completedCourses: [
                    { courseId: 'c-it101', courseCode: 'IT 101', finalGrade: 1.75 },
                    { courseId: 'c-it102', courseCode: 'IT 102', finalGrade: 2.25 }
                ]
            };

            const outcome = evaluateEnrollmentClearance(studentAlreadyPassed, baseSection);
            expect(outcome.canEnroll)
                .toBe(false);
            expect(outcome.errorCode)
                .toBe('ALREADY_TAKEN');
        });

        it('should allow enrollment if student previously failed the course (finalGrade 5.00 retake)', () => {
            const studentRetakingFailedCourse: StudentProfile = {
                ...defaultStudent,
                completedCourses: [
                    { courseId: 'c-it101', courseCode: 'IT 101', finalGrade: 1.75 },
                    { courseId: 'c-it102', courseCode: 'IT 102', finalGrade: 5.00 } // Failed previously
                ]
            };

            const outcome = evaluateEnrollmentClearance(studentRetakingFailedCourse, baseSection);
            expect(outcome.canEnroll)
                .toBe(true);
        });
    });

    describe('4. Prerequisite Clearance Gate (Standing and Course Requirements)', () => {
        const advancedSection: SectionDetails = {
            ...baseSection,
            id: 'sec-it301-a',
            courseId: 'c-it301',
            courseCode: 'IT 301 (Capstone 1)',
            prerequisites: [
                {
                    kind: 'standing',
                    requiredYearLevel: 3,
                    isMandatory: true
                },
                {
                    kind: 'course',
                    prerequisiteCourseId: 'c-it201',
                    prerequisiteCourseCode: 'IT 201 (Data Structures)',
                    minimumGrade: 3.00,
                    isMandatory: true
                }
            ]
        };

        it('should block enrollment if student fails year level standing requirement', () => {
            // Student is Year 2, but IT 301 requires Year 3 standing
            const studentWithCourse = {
                ...defaultStudent,
                yearLevel: 2,
                completedCourses: [
                    { courseId: 'c-it201', courseCode: 'IT 201 (Data Structures)', finalGrade: 2.00 }
                ]
            };

            const outcome = evaluateEnrollmentClearance(studentWithCourse, advancedSection);
            expect(outcome.canEnroll)
                .toBe(false);
            expect(outcome.errorCode)
                .toBe('PREREQUISITE_UNMET');
            expect(outcome.unmetPrerequisites)
                .toContain('Year 3 standing');
        });

        it('should block enrollment if student has not taken the prerequisite course', () => {
            const student3rdYearNoCourse = {
                ...defaultStudent,
                yearLevel: 3,
                completedCourses: []
            };

            const outcome = evaluateEnrollmentClearance(student3rdYearNoCourse, advancedSection);
            expect(outcome.canEnroll)
                .toBe(false);
            expect(outcome.errorCode)
                .toBe('PREREQUISITE_UNMET');
            expect(outcome.unmetPrerequisites)
                .toContain('IT 201 (Data Structures)');
        });

        it('should block enrollment if student failed prerequisite course (grade 5.00 > 3.00)', () => {
            const student3rdYearFailedPrereq = {
                ...defaultStudent,
                yearLevel: 3,
                completedCourses: [
                    { courseId: 'c-it201', courseCode: 'IT 201 (Data Structures)', finalGrade: 5.00 }
                ]
            };

            const outcome = evaluateEnrollmentClearance(student3rdYearFailedPrereq, advancedSection);
            expect(outcome.canEnroll)
                .toBe(false);
            expect(outcome.errorCode)
                .toBe('PREREQUISITE_UNMET');
        });

        it('should pass clearance when student meets both year standing and prerequisite course grades', () => {
            const qualifiedStudent = {
                ...defaultStudent,
                yearLevel: 3,
                completedCourses: [
                    { courseId: 'c-it201', courseCode: 'IT 201 (Data Structures)', finalGrade: 1.50 }
                ]
            };

            const outcome = evaluateEnrollmentClearance(qualifiedStudent, advancedSection);
            expect(outcome.canEnroll)
                .toBe(true);
        });

        it('should permit enrollment when overridePrerequisites flag is explicitly authorized', () => {
            const unqualifiedStudent = {
                ...defaultStudent,
                yearLevel: 2,
                completedCourses: []
            };

            const outcome = evaluateEnrollmentClearance(unqualifiedStudent, advancedSection, {
                overridePrerequisites: true
            });
            expect(outcome.canEnroll)
                .toBe(true);
        });
    });

    describe('5. Schedule Overlap & Conflict Gate', () => {
        it('should accurately detect schedule interval overlap on the same day', () => {
            // Overlapping: 08:00-10:00 vs 09:00-11:00
            expect(
                checkScheduleOverlap(
                    { dayOfWeek: 'Monday', timeStart: '08:00 AM', timeEnd: '10:00 AM' },
                    { dayOfWeek: 'Monday', timeStart: '09:00 AM', timeEnd: '11:00 AM' }
                )
            )
                .toBe(true);

            // Exact match: 08:00-10:00 vs 08:00-10:00
            expect(
                checkScheduleOverlap(
                    { dayOfWeek: 'Friday', timeStart: '01:00 PM', timeEnd: '04:00 PM' },
                    { dayOfWeek: 'Friday', timeStart: '01:00 PM', timeEnd: '04:00 PM' }
                )
            )
                .toBe(true);

            // Back-to-back (no overlap): 08:00-10:00 vs 10:00-12:00
            expect(
                checkScheduleOverlap(
                    { dayOfWeek: 'Monday', timeStart: '08:00 AM', timeEnd: '10:00 AM' },
                    { dayOfWeek: 'Monday', timeStart: '10:00 AM', timeEnd: '12:00 PM' }
                )
            )
                .toBe(false);

            // Different day: Monday 08:00-10:00 vs Tuesday 08:00-10:00
            expect(
                checkScheduleOverlap(
                    { dayOfWeek: 'Monday', timeStart: '08:00 AM', timeEnd: '10:00 AM' },
                    { dayOfWeek: 'Tuesday', timeStart: '08:00 AM', timeEnd: '10:00 AM' }
                )
            )
                .toBe(false);
        });

        it('should block enrollment when schedule conflicts with an enrolled section', () => {
            const studentWithConflict: StudentProfile = {
                ...defaultStudent,
                enrolledSections: [
                    {
                        sectionId: 'sec-math101-a',
                        sectionCode: 'MATH1-SEC1',
                        courseId: 'c-math101',
                        courseCode: 'MATH 101',
                        termId: 'term-2026-1st',
                        schedules: [
                            { dayOfWeek: 'Monday', timeStart: '09:00 AM', timeEnd: '11:00 AM' }
                        ]
                    }
                ]
            };

            const outcome = evaluateEnrollmentClearance(studentWithConflict, baseSection);
            expect(outcome.canEnroll)
                .toBe(false);
            expect(outcome.errorCode)
                .toBe('SCHEDULE_CONFLICT');
            expect(outcome.conflictingSections)
                .toContain('MATH1-SEC1 (MATH 101)');
        });

        it('should permit enrollment with schedule conflict when allowConflict is authorized with reason', () => {
            const studentWithConflict: StudentProfile = {
                ...defaultStudent,
                enrolledSections: [
                    {
                        sectionId: 'sec-math101-a',
                        sectionCode: 'MATH1-SEC1',
                        courseId: 'c-math101',
                        courseCode: 'MATH 101',
                        termId: 'term-2026-1st',
                        schedules: [
                            { dayOfWeek: 'Monday', timeStart: '09:00 AM', timeEnd: '11:00 AM' }
                        ]
                    }
                ]
            };

            const outcome = evaluateEnrollmentClearance(studentWithConflict, baseSection, {
                allowConflict: true,
                conflictReason: 'Dean approved graduating student overload'
            });

            expect(outcome.canEnroll)
                .toBe(true);
        });
    });
});