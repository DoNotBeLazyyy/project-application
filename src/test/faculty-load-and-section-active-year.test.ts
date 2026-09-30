import { renderHook } from '@testing-library/react';
import { ALL_TERMS_OPTION } from '@pages/dean/faculty-load/hooks/useTermOptions';
import { useSectionTableConfig } from '@pages/dean/section-management/useSectionTableConfig';
import { listFacultyLoad } from '@services/faculty-load.service';
import * as supabaseWrapper from '@services/supabase.wrapper';
import { SectionListRow } from '@type/section.type';
import { describe, expect, it, vi } from 'vitest';

describe('Faculty Loading Term Options and Filtering', () => {
    it('defines ALL_TERMS_OPTION with empty string value and "All Terms" label', () => {
        expect(ALL_TERMS_OPTION).toEqual({
            label: 'All Terms',
            value: ''
        });
    });

    it('passes null for p_term_id when filtering by All Terms (empty string)', async () => {
        const callRpcSpy = vi.spyOn(supabaseWrapper, 'callRpc').mockResolvedValue({
            data: {
                page: 1,
                rows: [],
                size: 20,
                total_count: 0
            },
            error: null
        });

        await listFacultyLoad(1, 20, '', [], { term_id: '' });

        expect(callRpcSpy).toHaveBeenCalledWith('fn_list_faculty_load_json', {
            p_page: 1,
            p_search: null,
            p_size: 20,
            p_sort: null,
            p_term_id: null
        });

        callRpcSpy.mockRestore();
    });

    it('passes the specific term ID for p_term_id when a term is selected', async () => {
        const callRpcSpy = vi.spyOn(supabaseWrapper, 'callRpc').mockResolvedValue({
            data: {
                page: 1,
                rows: [],
                size: 20,
                total_count: 0
            },
            error: null
        });

        await listFacultyLoad(1, 20, '', [], { term_id: 'term-active-123' });

        expect(callRpcSpy).toHaveBeenCalledWith('fn_list_faculty_load_json', {
            p_page: 1,
            p_search: null,
            p_size: 20,
            p_sort: null,
            p_term_id: 'term-active-123'
        });

        callRpcSpy.mockRestore();
    });
});

describe('Section Management Active Academic Year Read-Only Constraints', () => {
    const mockOnCopySetup = vi.fn();
    const mockOnEdit = vi.fn();
    const mockOnDelete = vi.fn();
    const mockOnView = vi.fn();

    const activeSectionRow: SectionListRow = {
        id: 'sec-1',
        section_code: 'CS101-A',
        term_id: 'term-active',
        term_label: '1st Semester - AY 2025-2026',
        course_id: 'crs-1',
        course_code: 'CS101',
        course_title: 'Intro to CS',
        faculty_id: 'fac-1',
        faculty_name: 'Dr. Smith',
        room: 'Room 101',
        max_slots: 40,
        status: 'Open',
        is_active_academic_year: true,
        total_count: 1
    };

    const inactiveSectionRow: SectionListRow = {
        id: 'sec-2',
        section_code: 'CS101-B',
        term_id: 'term-inactive',
        term_label: '1st Semester - AY 2023-2024',
        course_id: 'crs-1',
        course_code: 'CS101',
        course_title: 'Intro to CS',
        faculty_id: 'fac-1',
        faculty_name: 'Dr. Smith',
        room: 'Room 102',
        max_slots: 40,
        status: 'Closed',
        is_active_academic_year: false,
        total_count: 1
    };

    it('allows edit and delete actions for sections in the active academic year', () => {
        mockOnEdit.mockClear();
        const { result } = renderHook(() => useSectionTableConfig({
            onCopySetup: mockOnCopySetup,
            onEdit: mockOnEdit,
            onRequestDeleteRow: vi.fn(),
            onView: mockOnView
        }));

        const config = result.current.tableActionConfig(mockOnDelete);
        const options = config.menuOptions ? config.menuOptions(activeSectionRow) : [];

        const presets = options.map((opt) => opt.preset).filter(Boolean);
        expect(presets).toContain('view');
        expect(presets).toContain('edit');
        expect(presets).toContain('delete');

        const editClick = config.onEditClick ? config.onEditClick(activeSectionRow) : undefined;
        expect(editClick).toBeDefined();
        editClick?.();
        expect(mockOnEdit).toHaveBeenCalledWith('sec-1');
    });

    it('hides edit and delete actions for sections in inactive academic years (read-only)', () => {
        mockOnEdit.mockClear();
        const { result } = renderHook(() => useSectionTableConfig({
            onCopySetup: mockOnCopySetup,
            onEdit: mockOnEdit,
            onRequestDeleteRow: vi.fn(),
            onView: mockOnView
        }));

        const config = result.current.tableActionConfig(mockOnDelete);
        const options = config.menuOptions ? config.menuOptions(inactiveSectionRow) : [];

        const presets = options.map((opt) => opt.preset).filter(Boolean);
        expect(presets).toContain('view');
        expect(presets).not.toContain('edit');
        expect(presets).not.toContain('delete');

        // Copy setup is preserved as a non-destructive read action
        const copyOption = options.find((opt) => !opt.preset);
        expect(copyOption).toBeDefined();

        const editClick = config.onEditClick ? config.onEditClick(inactiveSectionRow) : undefined;
        expect(editClick).toBeDefined();
        editClick?.();
        expect(mockOnEdit).not.toHaveBeenCalled();
    });
});
