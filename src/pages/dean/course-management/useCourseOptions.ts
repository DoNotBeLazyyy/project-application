import { CommonSelectOption } from '@components/select/CommonSelect';
import { getCourses } from '@services/course/course.service';
import { CourseOption } from '@type/course/course.type';
import { useEffect, useState } from 'react';

interface UseCourseOptionsProps {
    excludeIds?: string[];
}

export function useCourseOptions({ excludeIds }: UseCourseOptionsProps) {
    const [courseOptions, setCourseOptions] = useState<CommonSelectOption[]>([]);

    useEffect(function() {
        async function fetchCourses() {
            const result = await getCourses(excludeIds);

            if (result.data) {
                setCourseOptions(
                    result.data.map((course: CourseOption) => ({
                        label: course.label,
                        value: course.id
                    }))
                );
            }
        }

        fetchCourses();
    }, [JSON.stringify(excludeIds)]);

    return { courseOptions };
}