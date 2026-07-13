import { callRpc } from '@services/supabase.wrapper';
import { DeanDashboard, FacultyDashboard, RegistrarDashboard } from '@type/dashboard.type';
import { ServiceResult } from '@type/service.type';

export async function getDeanDashboard(): Promise<ServiceResult<DeanDashboard>> {
    return callRpc<DeanDashboard>('fn_get_dean_dashboard', {
        p_term_id: null
    });
}

export async function getRegistrarDashboard(): Promise<ServiceResult<RegistrarDashboard>> {
    return callRpc<RegistrarDashboard>('fn_get_registrar_dashboard', {
        p_term_id: null
    });
}

export async function getFacultyDashboard(): Promise<ServiceResult<FacultyDashboard>> {
    return callRpc<FacultyDashboard>('fn_get_faculty_dashboard', {
        p_term_id: null
    });
}