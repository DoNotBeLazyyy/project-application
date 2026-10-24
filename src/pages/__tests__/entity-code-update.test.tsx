import { act, fireEvent, render } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';
import DepartmentForm from '@pages/admin/department-management/DepartmentForm';
import ProgramLevelForm from '@pages/dean/program-management/level/ProgramLevelForm';
import CourseTypeForm from '@pages/dean/course-management/type/CourseTypeForm';
import TermTypeForm from '@pages/admin/term-management/type/TermTypeForm';
import RoleForm from '@pages/admin/role-management/RoleForm';
import SpecialGradeForm from '@pages/admin/grading-config-management/SpecialGradeForm';
import { updateDepartment } from '@services/department.service';
import { updateProgram } from '@services/program/program.service';
import { updateProgramLevel } from '@services/program/program-level.service';
import { updateCourseType } from '@services/course/course-type.service';
import { updateTermType } from '@services/term/term-type.service';
import { updateRole } from '@services/role.service';
import * as supabaseWrapper from '@services/supabase.wrapper';

vi.mock('@services/user.service', () => ({
    getUsersByRoles: vi.fn().mockResolvedValue({ data: [] })
}));

describe('Entity Code Auto-Update on Name/Label Change', () => {
    describe('DepartmentForm', () => {
        function TestWrapper({ isCreate, initialValues }: { isCreate: boolean; initialValues: any }) {
            const methods = useForm({ defaultValues: initialValues });
            return (
                <DepartmentForm
                    control={methods.control}
                    departmentId={initialValues.id || 'dept-123'}
                    isCreate={isCreate}
                    setValue={methods.setValue}
                />
            );
        }

        it('generates department code on create as name is typed', () => {
            const { container } = render(<TestWrapper initialValues={{ code: '', name: '' }} isCreate={true} />);
            const nameInput = container.querySelector('input[name="name"]') as HTMLInputElement;
            const codeInput = container.querySelector('input[name="code"]') as HTMLInputElement;

            act(() => {
                fireEvent.change(nameInput, { target: { value: 'College of Computer Studies' } });
            });
            expect(codeInput.value).toBe('COCS');
        });

        it('updates department code in edit mode when department name is changed', () => {
            const { container } = render(
                <TestWrapper
                    initialValues={{ code: 'COCS', id: 'dept-1', name: 'College of Computer Studies' }}
                    isCreate={false}
                />
            );
            const nameInput = container.querySelector('input[name="name"]') as HTMLInputElement;
            const codeInput = container.querySelector('input[name="code"]') as HTMLInputElement;

            // Initially code is preserved
            expect(codeInput.value).toBe('COCS');

            // When name changes, code is regenerated
            act(() => {
                fireEvent.change(nameInput, { target: { value: 'College of Engineering' } });
            });
            expect(codeInput.value).toBe('COENG');

            // When restored to original name, original code is restored
            act(() => {
                fireEvent.change(nameInput, { target: { value: 'College of Computer Studies' } });
            });
            expect(codeInput.value).toBe('COCS');
        });
    });

    describe('ProgramLevelForm', () => {
        function TestWrapper({ isCreate, initialValues }: { isCreate: boolean; initialValues: any }) {
            const methods = useForm({ defaultValues: initialValues });
            return (
                <ProgramLevelForm
                    control={methods.control}
                    isCreate={isCreate}
                    setValue={methods.setValue}
                />
            );
        }

        it('updates program level code in edit mode when label is changed', () => {
            const { container } = render(
                <TestWrapper
                    initialValues={{ code: 'UG', description: '', label: 'Undergraduate' }}
                    isCreate={false}
                />
            );
            const labelInput = container.querySelector('input[name="label"]') as HTMLInputElement;
            const codeInput = container.querySelector('input[name="code"]') as HTMLInputElement;

            expect(codeInput.value).toBe('UG');

            act(() => {
                fireEvent.change(labelInput, { target: { value: 'Graduate' } });
            });
            expect(codeInput.value).toBe('GRAD');

            act(() => {
                fireEvent.change(labelInput, { target: { value: 'Undergraduate' } });
            });
            expect(codeInput.value).toBe('UG');
        });
    });

    describe('CourseTypeForm', () => {
        function TestWrapper({ isCreate, initialValues }: { isCreate: boolean; initialValues: any }) {
            const methods = useForm({ defaultValues: initialValues });
            return (
                <CourseTypeForm
                    control={methods.control}
                    isCreate={isCreate}
                    setValue={methods.setValue}
                />
            );
        }

        it('updates course type code in edit mode when label is changed', () => {
            const { container } = render(
                <TestWrapper
                    initialValues={{ code: 'LEC', description: '', label: 'Lecture' }}
                    isCreate={false}
                />
            );
            const labelInput = container.querySelector('input[name="label"]') as HTMLInputElement;
            const codeInput = container.querySelector('input[name="code"]') as HTMLInputElement;

            expect(codeInput.value).toBe('LEC');

            act(() => {
                fireEvent.change(labelInput, { target: { value: 'Laboratory' } });
            });
            expect(codeInput.value).toBe('LAB');
        });
    });

    describe('TermTypeForm', () => {
        function TestWrapper({ isCreate, initialValues }: { isCreate: boolean; initialValues: any }) {
            const methods = useForm({ defaultValues: initialValues });
            return (
                <TermTypeForm
                    control={methods.control}
                    isCreate={isCreate}
                    setValue={methods.setValue}
                />
            );
        }

        it('updates term type code in edit mode when label is changed', () => {
            const { container } = render(
                <TestWrapper
                    initialValues={{ code: 'SEM-1', description: '', label: '1st Semester', sequence: 1 }}
                    isCreate={false}
                />
            );
            const labelInput = container.querySelector('input[name="label"]') as HTMLInputElement;
            const codeInput = container.querySelector('input[name="code"]') as HTMLInputElement;

            expect(codeInput.value).toBe('SEM-1');

            act(() => {
                fireEvent.change(labelInput, { target: { value: '2nd Semester' } });
            });
            expect(codeInput.value).toBe('SEM-2');
        });
    });

    describe('RoleForm', () => {
        function TestWrapper({ isCreate, initialValues }: { isCreate: boolean; initialValues: any }) {
            const methods = useForm({ defaultValues: initialValues });
            return (
                <RoleForm
                    control={methods.control}
                    isCreate={isCreate}
                    setValue={methods.setValue}
                />
            );
        }

        it('updates role code in edit mode when label is changed', () => {
            const { container } = render(
                <TestWrapper
                    initialValues={{ code: 'DEAN', description: '', label: 'Dean' }}
                    isCreate={false}
                />
            );
            const labelInput = container.querySelector('input[name="label"]') as HTMLInputElement;
            const codeInput = container.querySelector('input[name="code"]') as HTMLInputElement;

            expect(codeInput.value).toBe('DEAN');

            act(() => {
                fireEvent.change(labelInput, { target: { value: 'Department Head' } });
            });
            expect(codeInput.value).toBe('DEPARTMENT_HEAD');
        });
    });

    describe('SpecialGradeForm', () => {
        function TestWrapper({ isCreate, initialValues }: { isCreate: boolean; initialValues: any }) {
            const methods = useForm({ defaultValues: initialValues });
            return (
                <SpecialGradeForm
                    control={methods.control}
                    isCreate={isCreate}
                    setValue={methods.setValue}
                />
            );
        }

        it('updates special grade code in edit mode when label is changed', () => {
            const { container } = render(
                <TestWrapper
                    initialValues={{
                        code: 'INC',
                        conditions: { all: [] },
                        description: 'Incomplete grade',
                        label: 'Incomplete'
                    }}
                    isCreate={false}
                />
            );
            const labelInput = container.querySelector('input[name="label"]') as HTMLInputElement;
            const codeInput = container.querySelector('input[name="code"]') as HTMLInputElement;

            expect(codeInput.value).toBe('INC');

            act(() => {
                fireEvent.change(labelInput, { target: { value: 'Dropped' } });
            });
            expect(codeInput.value).toBe('DRP');
        });
    });

    describe('Service layer code generation on update', () => {
        it('ensures updated code is passed when calling RPCs', async () => {
            const callRpcSpy = vi.spyOn(supabaseWrapper, 'callRpc').mockResolvedValue({ data: null, error: null });

            await updateDepartment('dept-1', {
                code: '',
                dean_id: '',
                deans: [],
                description: '',
                faculties: [],
                faculty_ids: [],
                name: 'College of Nursing'
            });

            expect(callRpcSpy).toHaveBeenCalledWith('fn_update_department', expect.objectContaining({
                p_code: 'CONUR'
            }));

            await updateProgram('prog-1', {
                code: '',
                curriculum_entries: [],
                department_id: '',
                description: '',
                is_active: true,
                name: 'Bachelor of Science in Civil Engineering',
                pending_deleted_curriculum_ids: [],
                program_level_id: '',
                total_units: '140',
                years_duration: '4'
            });

            expect(callRpcSpy).toHaveBeenCalledWith('fn_update_program', expect.objectContaining({
                p_code: 'BSCE'
            }));

            await updateProgramLevel('lvl-1', {
                code: '',
                description: '',
                label: 'Doctorate'
            });

            expect(callRpcSpy).toHaveBeenCalledWith('fn_update_program_level', expect.objectContaining({
                p_code: 'DOC'
            }));

            await updateCourseType('ct-1', {
                code: '',
                description: '',
                label: 'Tutorial'
            });

            expect(callRpcSpy).toHaveBeenCalledWith('fn_update_course_type', expect.objectContaining({
                p_code: 'TUT'
            }));

            await updateTermType('tt-1', {
                code: '',
                description: '',
                label: 'Summer',
                sequence: '3'
            });

            expect(callRpcSpy).toHaveBeenCalledWith('fn_update_term_type', expect.objectContaining({
                p_code: 'SUMMER'
            }));

            await updateRole('r-1', {
                code: '',
                description: '',
                label: 'Dean Secretary'
            });

            expect(callRpcSpy).toHaveBeenCalledWith('fn_update_role', expect.objectContaining({
                p_code: 'DEAN_SECRETARY'
            }));
        });
    });
});
