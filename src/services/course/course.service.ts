import { getDepartments } from '@services/department.service';
import { callRpc } from '@services/supabase.wrapper';
import { generateCourseCode } from '@utils/course.util';
import { BulkImportResult } from '@type/bulk-import.type';
import {
    CourseBulkRow, CourseFilterValues, CourseFormValues, CourseListRow, CourseOption
} from '@type/course/course.type';
import { DepartmentOption } from '@type/department.type';
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

export async function getDepartmentCourseCodes(
    departmentId: string
): Promise<ServiceResult<{ count: number; codes: string[] }>> {
    if (!departmentId) {
        return { data: { count: 0, codes: [] }, error: null };
    }
    const res = await listCourses(1, 1000, '', [], {
        department_ids: [departmentId],
        course_type_ids: [],
        is_active: 'All'
    });
    if (res.error) {
        return { data: { count: 0, codes: [] }, error: res.error };
    }
    const items = res.data?.content ?? [];
    return {
        data: {
            count: res.data?.totalElements ?? items.length,
            codes: items.map((item) => item.code)
        },
        error: null
    };
}

export async function getCourseById(
    courseId: string
): Promise<ServiceResult<CourseFormValues>> {
    return callRpc<CourseFormValues>('fn_get_course_by_id', {
        p_course_id: courseId
    });
}

export async function getCourses(
    excludeIds?: string[],
    departmentId?: string
): Promise<ServiceResult<CourseOption[]>> {
    return callRpc<CourseOption[]>('fn_get_courses', {
        p_exclude_ids: excludeIds?.length
            ? excludeIds
            : null,
        p_department_id: departmentId || null
    });
}

export async function createCourse(
    params: CourseFormValues
): Promise<ServiceResult<null>> {
    const validCourseTypes = params.course_types?.filter((ct) => ct.course_type_id && ct.course_type_id.trim() !== '') || [];
    const primaryType = validCourseTypes[0];
    const firstCourseTypeId = primaryType?.course_type_id || params.course_type_id || null;
    const totalUnits = validCourseTypes.length
        ? validCourseTypes.reduce((acc, curr) => acc + (Number(curr.units) || 0), 0)
        : (params.lecture_units !== ''
            ? Number(params.lecture_units)
            : 0);
    const totalCredit = validCourseTypes.length
        ? validCourseTypes.reduce((acc, curr) => acc + (Number(curr.credit_hours) || 0), 0)
        : (params.credit_hours
            ? Number(params.credit_hours)
            : 0);

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
        p_course_types: validCourseTypes.length
            ? validCourseTypes.map((ct) => ({
                course_type_id: ct.course_type_id,
                units: Number(ct.units) || 0,
                credit_hours: Number(ct.credit_hours) || 0
            }))
            : null,
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
    const validCourseTypes = params.course_types?.filter((ct) => ct.course_type_id && ct.course_type_id.trim() !== '') || [];
    const primaryType = validCourseTypes[0];
    const firstCourseTypeId = primaryType?.course_type_id || params.course_type_id || null;
    const totalUnits = validCourseTypes.length
        ? validCourseTypes.reduce((acc, curr) => acc + (Number(curr.units) || 0), 0)
        : (params.lecture_units !== ''
            ? Number(params.lecture_units)
            : 0);
    const totalCredit = validCourseTypes.length
        ? validCourseTypes.reduce((acc, curr) => acc + (Number(curr.credit_hours) || 0), 0)
        : (params.credit_hours
            ? Number(params.credit_hours)
            : 0);

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
        p_course_types: validCourseTypes.length
            ? validCourseTypes.map((ct) => ({
                course_type_id: ct.course_type_id,
                units: Number(ct.units) || 0,
                credit_hours: Number(ct.credit_hours) || 0
            }))
            : null,
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
    // fn_bulk_create_courses upserts by code, so a blank code must be generated against
    // the codes already in the database - otherwise it would overwrite an existing course.
    const existingCodes: string[] = [];
    let departments: DepartmentOption[] = [];
    if (courses.some((course) => !course.code?.trim())) {
        const [coursesResult, departmentsResult] = await Promise.all([
            listCourses(1, 10000, '', [], null),
            getDepartments()
        ]);
        existingCodes.push(...(coursesResult.data?.content ?? []).map((course) => course.code));
        departments = departmentsResult.data ?? [];
    }

    const normalizedCourses = courses.map((course) => {
        const departmentKey = (course.department_code || '').trim()
            .toLowerCase();
        const department = departments.find((dept) =>
            dept.code.trim()
                .toLowerCase() === departmentKey || dept.label.trim()
                .toLowerCase() === departmentKey);
        const code = course.code?.trim() || generateCourseCode({
            departmentCode: department?.code ?? course.department_code,
            title: course.title || '',
            existingCodes
        });
        if (code) {
            existingCodes.push(code);
        }
        return {
            ...course,
            code
        };
    });

    const result = await callRpc<{
        provisioned_count: number;
        errors: { row: number; code: string; message: string }[];
    }>('fn_bulk_create_courses', { p_courses: normalizedCourses });

    if (result.error) {
        return { provisioned_count: 0, errors: [result.error.message] };
    }

    return {
        provisioned_count: result.data?.provisioned_count ?? 0,
        errors: (result.data?.errors ?? []).map((error) =>
            `Row ${error.row} (${error.code || 'unknown'}): ${error.message}`)
    };
}