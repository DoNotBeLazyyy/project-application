import { CommonSelectOption } from '@components/select/CommonSelect';
import { getCourses } from '@services/course/course.service';
import { CourseOption } from '@type/course/course.type';
import { useEffect, useState } from 'react';

interface UseCourseOptionsProps {
    excludeIds?: string[];
    departmentId?: string;
}

export function useCourseOptions({ excludeIds, departmentId }: UseCourseOptionsProps = {}) {
    const [courses, setCourses] = useState<CourseOption[]>([]);
    const [courseOptions, setCourseOptions] = useState<CommonSelectOption[]>([]);

    useEffect(function() {
        async function fetchCourses() {
            if (departmentId === '') {
                setCourses([]);
                setCourseOptions([]);
                return;
            }

            const result = await getCourses(excludeIds, departmentId);

            if (result.data) {
                const filtered = departmentId
                    ? result.data.filter((course: CourseOption) => !course.department_id || course.department_id === departmentId)
                    : result.data;

                setCourses(filtered);
                setCourseOptions(
                    filtered.map((course: CourseOption) => ({
                        label: course.label,
                        value: course.id
                    }))
                );
            }
        }

        fetchCourses();
    }, [JSON.stringify(excludeIds), departmentId]);

    return { courseOptions, courses };
}