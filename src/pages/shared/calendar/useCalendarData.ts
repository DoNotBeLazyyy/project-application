import { listMyEventsFeed } from '@services/event.service';
import { getAcademicYearCalendarDetails, listSchoolYears } from '@services/school-year.service';
import { getStudentDashboard, getStudentSchedule } from '@services/student-portal.service';
import { useAppStore } from '@stores/app.store';
import { UserRole } from '@type/app.type';
import { DayOfWeek } from '@type/student-portal.type';
import { getRoleFromPath } from '@utils/role-path.util';
import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { UnifiedCalendarEvent } from './calendar.types';

const DAY_NAME_MAP: Record<number, DayOfWeek> = {
    0: 'Sunday',
    1: 'Monday',
    2: 'Tuesday',
    3: 'Wednesday',
    4: 'Thursday',
    5: 'Friday',
    6: 'Saturday'
};

function parseTimeToHoursAndMinutes(timeStr: string): { hours: number; minutes: number } {
    const parts = timeStr.slice(0, 5).split(':').map(Number);
    return {
        hours: Number.isNaN(parts[0]) ? 8 : parts[0],
        minutes: Number.isNaN(parts[1]) ? 0 : parts[1]
    };
}

export function useCalendarData(currentDate: Date) {
    const { pathname } = useLocation();
    const activeRole = useAppStore((s) => s.activeRole);
    const role: UserRole = activeRole || (getRoleFromPath(pathname) as UserRole) || 'Student';

    const [events, setEvents] = useState<UnifiedCalendarEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        // Buffer: 1 month before and after to cover month boundary slots
        const rangeStart = new Date(year, month - 1, 1);
        const rangeEnd = new Date(year, month + 2, 0, 23, 59, 59);

        const loadedEvents: UnifiedCalendarEvent[] = [];

        try {
            // 1. Fetch Campus Events via Event Feed
            const eventsRes = await listMyEventsFeed(
                rangeStart.toISOString(),
                rangeEnd.toISOString(),
                role
            );

            if (eventsRes.data) {
                for (const item of eventsRes.data) {
                    const start = new Date(item.start_at);
                    const end = item.end_at ? new Date(item.end_at) : new Date(start.getTime() + 60 * 60 * 1000);

                    loadedEvents.push({
                        id: `event-${item.id}`,
                        title: item.title,
                        description: item.description,
                        location: item.location,
                        start,
                        end,
                        allDay: Boolean(item.all_day),
                        category: 'event',
                        metadata: {
                            audience: item.target_audience
                        }
                    });
                }
            }

            // 2. Fetch Active Academic Year and Calendar Milestones/Holidays
            const schoolYearsRes = await listSchoolYears(1, 1, '', [], { is_active: 'true', year: '' });
            const activeSy = schoolYearsRes.data?.content?.[0];

            if (activeSy?.id) {
                const detailsRes = await getAcademicYearCalendarDetails(activeSy.id);
                const details = detailsRes.data;

                if (details) {
                    // Holidays & Exceptions
                    if (details.holidays && Array.isArray(details.holidays)) {
                        for (const h of details.holidays) {
                            const hStart = new Date(h.start_date);
                            const hEnd = new Date(h.end_date || h.start_date);
                            const isSuspension = h.exception_type === 'Suspension';

                            loadedEvents.push({
                                id: `holiday-${h.id || h.title}-${h.start_date}`,
                                title: `${h.exception_type}: ${h.title}`,
                                description: h.description || `${h.exception_type} for academic year ${details.label}`,
                                start: hStart,
                                end: hEnd,
                                allDay: true,
                                category: 'holiday',
                                metadata: {
                                    rawStatus: isSuspension ? 'Suspension' : 'Holiday'
                                }
                            });
                        }
                    }

                    // Academic Terms & Grading Deadlines
                    if (details.terms && Array.isArray(details.terms)) {
                        for (const term of details.terms) {
                            const termLabel = term.term_type_label || 'Term';

                            // Term Start & End
                            if (term.start_date) {
                                loadedEvents.push({
                                    id: `term-start-${term.id || termLabel}`,
                                    title: `${termLabel} Begins`,
                                    description: `Commencement of classes for ${termLabel} (${details.label})`,
                                    start: new Date(term.start_date),
                                    end: new Date(term.start_date),
                                    allDay: true,
                                    category: 'academic'
                                });
                            }

                            if (term.end_date) {
                                loadedEvents.push({
                                    id: `term-end-${term.id || termLabel}`,
                                    title: `${termLabel} Concludes`,
                                    description: `Official conclusion of ${termLabel} (${details.label})`,
                                    start: new Date(term.end_date),
                                    end: new Date(term.end_date),
                                    allDay: true,
                                    category: 'academic'
                                });
                            }

                            // Enrollment Window
                            if (term.enrollment_start_date && term.enrollment_end_date) {
                                loadedEvents.push({
                                    id: `term-enrollment-${term.id || termLabel}`,
                                    title: `${termLabel} Enrollment Window`,
                                    description: `Course and section registration period for ${termLabel}`,
                                    start: new Date(term.enrollment_start_date),
                                    end: new Date(term.enrollment_end_date),
                                    allDay: true,
                                    category: 'academic'
                                });
                            }

                            // Final Grading Deadline
                            if (term.grading_deadline) {
                                loadedEvents.push({
                                    id: `term-grade-deadline-${term.id || termLabel}`,
                                    title: `Grade Submission Deadline (${termLabel})`,
                                    description: `Final institutional deadline for faculty to submit grade sheets`,
                                    start: new Date(term.grading_deadline),
                                    end: new Date(term.grading_deadline),
                                    allDay: true,
                                    category: 'academic'
                                });
                            }

                            // Major Exams in Grading Periods
                            if (term.grading_periods && Array.isArray(term.grading_periods)) {
                                for (const gp of term.grading_periods) {
                                    if (gp.major_exam_start_date) {
                                        loadedEvents.push({
                                            id: `exam-${gp.id || gp.name}`,
                                            title: `${gp.name} Examinations`,
                                            description: `Major examination schedule for ${gp.name} (${termLabel})`,
                                            start: new Date(gp.major_exam_start_date),
                                            end: new Date(gp.major_exam_end_date || gp.major_exam_start_date),
                                            allDay: true,
                                            category: 'academic'
                                        });
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // 3. Role-specific: Student Portal schedule & upcoming assessments
            if (role === 'Student') {
                const [scheduleRes, dashRes] = await Promise.all([
                    getStudentSchedule(),
                    getStudentDashboard()
                ]);

                // Project weekly class timetable across visible window
                if (scheduleRes.data && Array.isArray(scheduleRes.data)) {
                    for (const sec of scheduleRes.data) {
                        for (const slot of sec.schedules || []) {
                            const startTime = parseTimeToHoursAndMinutes(slot.time_start);
                            const endTime = parseTimeToHoursAndMinutes(slot.time_end);

                            // Iterate days in range
                            const cursor = new Date(rangeStart);
                            while (cursor <= rangeEnd) {
                                const dayName = DAY_NAME_MAP[cursor.getDay()];
                                if (dayName === slot.day_of_week) {
                                    const classStart = new Date(
                                        cursor.getFullYear(),
                                        cursor.getMonth(),
                                        cursor.getDate(),
                                        startTime.hours,
                                        startTime.minutes
                                    );
                                    const classEnd = new Date(
                                        cursor.getFullYear(),
                                        cursor.getMonth(),
                                        cursor.getDate(),
                                        endTime.hours,
                                        endTime.minutes
                                    );

                                    loadedEvents.push({
                                        id: `class-${sec.section_id}-${slot.id}-${cursor.toISOString().slice(0, 10)}`,
                                        title: `${sec.course_code}: ${sec.course_title}`,
                                        description: `Section ${sec.section_code} • Instructor: ${sec.faculty_name}`,
                                        location: slot.room ? `Room ${slot.room}` : 'Assigned Classroom',
                                        start: classStart,
                                        end: classEnd,
                                        allDay: false,
                                        category: 'class',
                                        metadata: {
                                            courseCode: sec.course_code,
                                            sectionCode: sec.section_code,
                                            sectionId: sec.section_id,
                                            enrollmentId: sec.enrollment_id,
                                            room: slot.room,
                                            authorName: sec.faculty_name,
                                            targetUrl: `/student/subjects/${sec.enrollment_id}`
                                        }
                                    });
                                }
                                cursor.setDate(cursor.getDate() + 1);
                            }
                        }
                    }
                }

                // Add Upcoming Assessments
                if (dashRes.data?.upcoming_assessments) {
                    for (const a of dashRes.data.upcoming_assessments) {
                        if (a.due_at) {
                            const due = new Date(a.due_at);
                            loadedEvents.push({
                                id: `assessment-${a.id}`,
                                title: `Due: ${a.title} (${a.assessment_type})`,
                                description: `${a.course_code} - ${a.section_code}`,
                                start: due,
                                end: new Date(due.getTime() + 30 * 60 * 1000),
                                allDay: false,
                                category: 'assessment',
                                metadata: {
                                    assessmentType: a.assessment_type,
                                    courseCode: a.course_code,
                                    sectionCode: a.section_code,
                                    enrollmentId: a.enrollment_id,
                                    targetUrl: `/student/subjects/${a.enrollment_id}/assessments/${a.id}`
                                }
                            });
                        }
                    }
                }
            }

            setEvents(loadedEvents);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to load calendar data';
            setError(message);
        } finally {
            setIsLoading(false);
        }
    }, [currentDate, role]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    return {
        events,
        isLoading,
        error,
        reload: loadData,
        currentRole: role
    };
}
