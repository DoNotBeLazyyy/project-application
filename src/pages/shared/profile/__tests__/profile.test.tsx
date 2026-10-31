import ProfilePage from '@pages/shared/profile';
import * as profileService from '@services/profile.service';
import * as programService from '@services/program/program.service';
import { render, screen, waitFor } from '@testing-library/react';
import { MyProfile } from '@type/profile.type';
import {
    beforeEach, describe, expect, it, vi
} from 'vitest';

vi.mock('@services/profile.service', () => ({
    changeMyPassword: vi.fn(),
    getMyProfile: vi.fn(),
    updateMyProfile: vi.fn(),
    updateMyAvatar: vi.fn()
}));

vi.mock('@services/program/program.service', () => ({
    getPrograms: vi.fn()
}));

vi.mock('@services/registrar-verification.service', () => ({
    cancelMyProfileRequest: vi.fn()
}));

vi.mock('@services/auth.service', () => ({
    initAuthSession: vi.fn()
}));

vi.mock('react-router-dom', async() => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => vi.fn()
    };
});

const BASE_MOCK_PROFILE: MyProfile = {
    id: 'user-123',
    first_name: 'Test',
    middle_name: '',
    last_name: 'User',
    suffix: '',
    preferred_name: '',
    email: 'test@example.com',
    mobile_number: '09171234567',
    address_line1: '123 Main St',
    address_line2: '',
    city: 'Manila',
    province: 'Metro Manila',
    postal_code: '1000',
    date_of_birth: '2000-01-01',
    gender: 'Male',
    civil_status: 'Single',
    nationality: 'Filipino',
    avatar_url: null,
    status: 'Active',
    role_codes: ['Admin'],
    role_labels: ['System Administrator'],
    profile_completed: true
};

describe('ProfilePage - Multi-Role Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(programService.getPrograms)
            .mockResolvedValue({
                data: [{
                    id: 'prog-1', code: 'BSCS', label: 'Computer Science'
                } as any],
                error: null
            });
    });

    it('renders Admin profile correctly without requiring approval', async() => {
        vi.mocked(profileService.getMyProfile)
            .mockResolvedValue({
                data: {
                    ...BASE_MOCK_PROFILE, role_codes: ['Admin'], role_labels: ['System Administrator']
                },
                error: null
            });

        render(<ProfilePage />);

        await waitFor(() => {
            expect(screen.getByText('My Account'))
                .toBeInTheDocument();
            expect(screen.getByText('test@example.com'))
                .toBeInTheDocument();
        });

        expect(screen.getByText('Save Profile'))
            .toBeInTheDocument();
        expect(screen.queryByText(/Changes made to your profile must be reviewed/i)).not.toBeInTheDocument();
    });

    it('renders Dean profile with approval requirement and assigned department field', async() => {
        vi.mocked(profileService.getMyProfile)
            .mockResolvedValue({
                data: {
                    ...BASE_MOCK_PROFILE,
                    department_name: 'College of Computer Studies',
                    role_codes: ['Dean'],
                    role_labels: ['Dean / Program Head']
                },
                error: null
            });

        render(<ProfilePage />);

        await waitFor(() => {
            expect(screen.getByText('My Account'))
                .toBeInTheDocument();
        });

        expect(screen.getByText('Submit Profile Changes'))
            .toBeInTheDocument();
        expect(screen.getByText(/Changes made to your profile must be reviewed and approved by the Administrator/i))
            .toBeInTheDocument();
        expect(screen.getByText('Assigned Department'))
            .toBeInTheDocument();
    });

    it('renders Faculty profile with approval requirement', async() => {
        vi.mocked(profileService.getMyProfile)
            .mockResolvedValue({
                data: {
                    ...BASE_MOCK_PROFILE,
                    role_codes: ['Faculty'],
                    role_labels: ['Faculty Member']
                },
                error: null
            });

        render(<ProfilePage />);

        await waitFor(() => {
            expect(screen.getByText('My Account'))
                .toBeInTheDocument();
        });

        expect(screen.getByText('Submit Profile Changes'))
            .toBeInTheDocument();
        expect(screen.getByText(/Changes made to your profile must be reviewed and approved by the Administrator/i))
            .toBeInTheDocument();
    });

    it('renders Student profile with approval requirement by Registrar', async() => {
        vi.mocked(profileService.getMyProfile)
            .mockResolvedValue({
                data: {
                    ...BASE_MOCK_PROFILE,
                    student: {
                        id: 'stud-1',
                        student_number: '2026-0001',
                        year_level: 2,
                        program_id: 'prog-1',
                        program_code: 'BSCS',
                        program_name: 'Computer Science',
                        status: 'Active'
                    },
                    role_codes: ['Student'],
                    role_labels: ['Student']
                },
                error: null
            });

        render(<ProfilePage />);

        await waitFor(() => {
            expect(screen.getByText('My Account'))
                .toBeInTheDocument();
        });

        expect(screen.getByText('Submit Profile Changes'))
            .toBeInTheDocument();
        expect(screen.getByText(/Changes made to your profile must be reviewed and approved by the Registrar/i))
            .toBeInTheDocument();
        expect(screen.getByText('Student Number'))
            .toBeInTheDocument();
    });
});