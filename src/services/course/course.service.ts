import { callRpc } from '@services/supabase.wrapper';
import { BulkImportResult } from '@type/bulk-import.type';
import {
    CourseBulkRow, CourseFilterValues, CourseFormValues, CourseListRow, CourseOption
} from '@type/course/course.type';
import { CommonListResDto, SortStringDto } from '@type/http.type';
import { ServiceResult } from '@type/service.type';
import { nullIfBlank } from '@utils/uuid.util';

export async function listCourses(
    page: number,
    size: number,
    search: string,
    sort: SortStringDto[],
    filters: CourseFilterValues | null
): Promise<ServiceResult<CommonListResDto<CourseListRow>>> {
    return callRpc<CommonListResDto<CourseListRow>>('fn_list_courses_json', {
        p_page: page,
        p_search: search || null,
        p_size: size,
        p_sort: sort.length > 0
            ? sort
            : null,
        p_department_ids: filters?.department_ids?.length
            ? filters.department_ids
            : null,
        p_course_type_ids: filters?.course_type_ids?.length
            ? filters.course_type_ids
            : null,
        p_is_active: filters?.is_active === 'true'
            ? true
            : filters?.is_active === 'false'
                ? false
                : null
    });
}

export async function getCourseById(
    courseId: string
): Promise<ServiceResult<CourseFormValues>> {
    return callRpc<CourseFormValues>('fn_get_course_by_id', {
        p_course_id: courseId
    });
}

export async function getCourses(
    excludeIds?: string[]
): Promise<ServiceResult<CourseOption[]>> {
    return callRpc<CourseOption[]>('fn_get_courses', {
        p_exclude_ids: excludeIds?.length
            ? excludeIds
            : null
    });
}

export async function createCourse(
    params: CourseFormValues
): Promise<ServiceResult<null>> {
    const primaryType = params.course_types?.[0];
    const firstCourseTypeId = primaryType?.course_type_id || params.course_type_id || null;
    const totalUnits = params.course_types?.reduce((acc, curr) => acc + (Number(curr.units) || 0), 0) ?? (params.lecture_units !== '' ? Number(params.lecture_units) : 0);
    const totalCredit = params.course_types?.reduce((acc, curr) => acc + (Number(curr.credit_hours) || 0), 0) ?? (params.credit_hours ? Number(params.credit_hours) : 0);

    return callRpc<null>('fn_create_course', {
        p_code: params.code,
        p_title: params.title,
        p_department_id: nullIfBlank(params.department_id),
        p_course_type_id: nullIfBlank(firstCourseTypeId),
        p_is_split: false,
        p_lecture_units: totalUnits,
        p_laboratory_units: null,
        p_credit_hours: totalCredit,
        p_description: params.description || null,
        p_is_active: params.is_active,
        p_prerequisites: params.prerequisites.length
            ? params.prerequisites.map((prereq) => ({
                course_id: prereq.prerequisite_kind === 'course'
                    ? nullIfBlank(prereq.course_id)
                    : null,
                prerequisite_type: prereq.prerequisite_type,
                prerequisite_kind: prereq.prerequisite_kind,
                year_level_required: prereq.prerequisite_kind === 'standing' && prereq.year_level_required
                    ? Number(prereq.year_level_required)
                    : null,
                minimum_grade: prereq.prerequisite_type === 'Co-requisite'
                    ? null
                    : prereq.minimum_grade || null
            }))
            : null
    });
}

export async function updateCourse(
    courseId: string,
    params: CourseFormValues
): Promise<ServiceResult<null>> {
    const primaryType = params.course_types?.[0];
    const firstCourseTypeId = primaryType?.course_type_id || params.course_type_id || null;
    const totalUnits = params.course_types?.reduce((acc, curr) => acc + (Number(curr.units) || 0), 0) ?? (params.lecture_units !== '' ? Number(params.lecture_units) : 0);
    const totalCredit = params.course_types?.reduce((acc, curr) => acc + (Number(curr.credit_hours) || 0), 0) ?? (params.credit_hours ? Number(params.credit_hours) : 0);

    return callRpc<null>('fn_update_course', {
        p_course_id: courseId,
        p_code: params.code,
        p_title: params.title,
        p_department_id: nullIfBlank(params.department_id),
        p_course_type_id: nullIfBlank(firstCourseTypeId),
        p_lecture_units: totalUnits,
        p_laboratory_units: null,
        p_credit_hours: totalCredit,
        p_description: params.description || null,
        p_is_active: params.is_active,
        p_prerequisites: params.prerequisites.length
            ? params.prerequisites.map((prereq) => ({
                course_id: prereq.prerequisite_kind === 'course'
                    ? nullIfBlank(prereq.course_id)
                    : null,
                prerequisite_type: prereq.prerequisite_type,
                prerequisite_kind: prereq.prerequisite_kind,
                year_level_required: prereq.prerequisite_kind === 'standing' && prereq.year_level_required
                    ? Number(prereq.year_level_required)
                    : null,
                minimum_grade: prereq.minimum_grade || null
            }))
            : null
    });
}

export async function deleteCourse(
    courseId: string
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_delete_course', {
        p_course_id: courseId
    });
}

export async function bulkDeleteCourses(
    courseIds: string[]
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_bulk_delete_courses', {
        p_course_ids: courseIds
    });
}

export async function bulkCreateCourses(
    courses: CourseBulkRow[]
): Promise<BulkImportResult> {
    const result = await callRpc<{
        provisioned_count: number;
        errors: { row: number; code: string; message: string }[];
    }>('fn_bulk_create_courses', { p_courses: courses });

    if (result.error) {
        return { provisioned_count: 0, errors: [result.error.message] };
    }

    return {
        provisioned_count: result.data?.provisioned_count ?? 0,
        errors: (result.data?.errors ?? []).map((error) =>
            `Row ${error.row} (${error.code || 'unknown'}): ${error.message}`)
    };
}