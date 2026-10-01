import { callRpc } from '@services/supabase.wrapper';
import { BulkImportError, DetailedBulkImportResult } from '@type/bulk-import.type';
import { CourseTypeBulkRow, CourseTypeFormValues, CourseTypeListRow, CourseTypeOption } from '@type/course/course-type.type';
import { CommonListResDto, SortStringDto } from '@type/http.type';
import { ServiceResult } from '@type/service.type';

export async function listCourseTypes(
    page: number,
    size: number,
    search: string,
    sort: SortStringDto[]
): Promise<ServiceResult<CommonListResDto<CourseTypeListRow>>> {
    return callRpc<CommonListResDto<CourseTypeListRow>>('fn_list_course_types_json', {
        p_page: page,
        p_search: search || null,
        p_size: size,
        p_sort: sort.length > 0
            ? sort
            : null
    });
}

export async function getCourseTypeById(
    courseTypeId: string
): Promise<ServiceResult<CourseTypeFormValues>> {
    return callRpc<CourseTypeFormValues>('fn_get_course_type_by_id', {
        p_course_type_id: courseTypeId
    });
}

export async function getCourseTypes(): Promise<ServiceResult<CourseTypeOption[]>> {
    return callRpc<CourseTypeOption[]>('fn_get_course_types');
}

export async function createCourseType(
    params: CourseTypeFormValues
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_create_course_type', {
        p_code: params.code,
        p_description: params.description || null,
        p_label: params.label
    });
}

export async function updateCourseType(
    courseTypeId: string,
    params: CourseTypeFormValues
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_update_course_type', {
        p_code: params.code,
        p_description: params.description || null,
        p_label: params.label,
        p_course_type_id: courseTypeId
    });
}

export async function deleteCourseType(
    courseTypeId: string
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_delete_course_type', {
        p_course_type_id: courseTypeId
    });
}

export async function bulkCreateCourseTypes(
    courseTypes: CourseTypeBulkRow[]
): Promise<DetailedBulkImportResult> {
    const result = await callRpc<{
        provisioned_count: number;
        errors: BulkImportError[];
    }>('fn_bulk_create_course_types', {
        p_course_types: courseTypes
    });

    if (!result.error && result.data) {
        const structuredErrors = result.data.errors ?? [];
        return {
            provisioned_count: result.data.provisioned_count ?? 0,
            errors: structuredErrors.map((error) =>
                `Row ${error.row} (${error.code || 'unknown'}): ${error.message}`),
            structuredErrors
        };
    }

    let provisionedCount = 0;
    const structuredErrors: BulkImportError[] = [];

    for (let i = 0; i < courseTypes.length; i++) {
        const row = courseTypes[i];
        const res = await createCourseType({
            code: row.code,
            description: row.description || '',
            label: row.label
        });

        if (res.error) {
            structuredErrors.push({
                code: row.code,
                message: res.error.message,
                row: i + 1
            });
        }
        else {
            provisionedCount++;
        }
    }

    return {
        errors: structuredErrors.map((e) => `Row ${e.row} (${e.code || 'unknown'}): ${e.message}`),
        provisioned_count: provisionedCount,
        structuredErrors
    };
}