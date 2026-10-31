import { CommonSelectOption } from '@components/select/CommonSelect';
import { getCourses } from '@services/course/course.service';
import { CourseOption } from '@type/course/course.type';
import { useEffect, useState } from 'react';

interface UseCourseOptionsProps {
    excludeIds?: string[];
    departmentId?: string;
    // Curricula may include other departments' courses (e.g. General Education owned by
    // Arts & Sciences); they are listed after the department's own courses and labelled.
    includeOtherDepartments?: boolean;
}

export function useCourseOptions({ excludeIds, departmentId, includeOtherDepartments = false }: UseCourseOptionsProps = {}) {
    const [courses, setCourses] = useState<CourseOption[]>([]);
    const [courseOptions, setCourseOptions] = useState<CommonSelectOption[]>([]);

    useEffect(function() {
        async function fetchCourses() {
            if (departmentId === '') {
                setCourses([]);
                setCourseOptions([]);
                return;
            }

            const result = await getCourses(excludeIds, includeOtherDepartments
                ? undefined
                : departmentId);

            if (result.data) {
                const isOwn = (course: CourseOption) => !departmentId || !course.department_id || course.department_id === departmentId;
                const filtered = includeOtherDepartments
                    ? [...result.data.filter(isOwn), ...result.data.filter((course) => !isOwn(course))]
                    : result.data.filter(isOwn);

                setCourses(filtered);
                setCourseOptions(
                    filtered.map((course: CourseOption) => ({
                        label: isOwn(course) || !course.department_code
                            ? course.label
                            : `${course.label} · ${course.department_code}`,
                        value: course.id
                    }))
                );
            }
        }

        fetchCourses();
    }, [JSON.stringify(excludeIds), departmentId, includeOtherDepartments]);

    return { courseOptions, courses };
}