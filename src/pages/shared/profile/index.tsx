import { CommonChip } from '@components/badge/CommonChip';
import CommonButton from '@components/button/CommonButton';
import CommonCard from '@components/card/CommonCard';
import CommonTabMenu from '@components/tab-menu/CommonTabMenu';
import { GraduationCapIcon, HourglassIcon, LockKeyIcon, UserCircleIcon } from '@phosphor-icons/react';
import StudentProfilePromptModal from '@components/modal/StudentProfilePromptModal';
import ChangePasswordForm from '@pages/shared/profile/ChangePasswordForm';
import { PASSWORD_FORM_ID, PROFILE_FORM_ID } from '@pages/shared/profile/constants/profile.constant';
import ProfileAvatarCard from '@pages/shared/profile/ProfileAvatarCard';
import ProfileDetailsForm from '@pages/shared/profile/ProfileDetailsForm';
import PendingChangesModal from '@pages/shared/profile/PendingChangesModal';
import AssignProgramModal from '@pages/shared/records/AssignProgramModal';
import { initAuthSession } from '@services/auth.service';
import { changeMyPassword, getMyProfile, updateMyProfile } from '@services/profile.service';
import { cancelMyProfileRequest } from '@services/registrar-verification.service';
import { useToastStore } from '@stores/toast.store';
import { ChangePasswordFormValues, MyProfile, ProfileFormValues } from '@type/profile.type';
import { formErrors } from '@utils/form.util';
import { getPrograms } from '@services/program/program.service';
import { CommonSelectOption } from '@components/select/CommonSelect';
import { SyntheticEvent, useEffect, useState } from 'react';
import { FieldErrors, useForm } from 'react-hook-form';

type ProfileTab = 'details' | 'security';

const EMPTY_PROFILE: ProfileFormValues = {
    first_name: '',
    middle_name: '',
    last_name: '',
    suffix: '',
    preferred_name: '',
    mobile_number: '',
    address_line1: '',
    address_line2: '',
    city: '',
    province: '',
    postal_code: '',
    date_of_birth: '',
    gender: '',
    civil_status: '',
    nationality: ''
};

const EMPTY_PASSWORD: ChangePasswordFormValues = {
    current_password: '',
    new_password: '',
    confirm_password: ''
};

function resolveInitials(profile: MyProfile | null): string {
    if (!profile) {
        return 'U';
    }

    const first = profile.first_name.trim()
        .charAt(0);
    const last = profile.last_name.trim()
        .charAt(0);

    return `${first}${last}`.toUpperCase() || 'U';
}

export default function ProfilePage() {
    const [activeTab, setActiveTab] = useState<ProfileTab>('details');
    const [profile, setProfile] = useState<MyProfile | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);
    const [programOptions, setProgramOptions] = useState<CommonSelectOption[]>([]);
    const [isProgramModalOpen, setIsProgramModalOpen] = useState(false);
    const [isStudentPromptOpen, setIsStudentPromptOpen] = useState(false);
    const [isPendingModalOpen, setIsPendingModalOpen] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);

    const isStudentUser = Boolean(profile?.student || profile?.role_labels?.includes('Student'));

    const profileMethods = useForm<ProfileFormValues>({ defaultValues: EMPTY_PROFILE });
    const passwordMethods = useForm<ChangePasswordFormValues>({ defaultValues: EMPTY_PASSWORD });

    useEffect(function() {
        async function loadData() {
            const [profileRes, programsRes] = await Promise.all([
                getMyProfile(),
                getPrograms()
            ]);

            if (programsRes.data) {
                setProgramOptions(
                    programsRes.data.map(function(program) {
                        return {
                            label: `${program.code} · ${program.label}`,
                            value: program.id
                        };
                    })
                );
            }

            if (profileRes.data) {
                setProfile(profileRes.data);
                profileMethods.reset({
                    first_name: profileRes.data.first_name,
                    middle_name: profileRes.data.middle_name,
                    last_name: profileRes.data.last_name,
                    suffix: profileRes.data.suffix,
                    preferred_name: profileRes.data.preferred_name,
                    mobile_number: profileRes.data.mobile_number,
                    address_line1: profileRes.data.address_line1,
                    address_line2: profileRes.data.address_line2,
                    city: profileRes.data.city,
                    province: profileRes.data.province,
                    postal_code: profileRes.data.postal_code,
                    date_of_birth: profileRes.data.date_of_birth ?? '',
                    gender: profileRes.data.gender,
                    civil_status: profileRes.data.civil_status,
                    nationality: profileRes.data.nationality,
                    program_id: profileRes.data.student?.program_id ?? '',
                    year_level: profileRes.data.student?.year_level ?? 1
                });
            }
        }

        loadData();
    }, [refreshKey]);

    function handleAvatarChanged() {
        setRefreshKey(function(previous) {
            return previous + 1;
        });
    }

    function handleTabChange(_: SyntheticEvent, value: string) {
        setActiveTab(value as ProfileTab);
    }

    async function handleProfileSubmit(values: ProfileFormValues) {
        const result = await updateMyProfile(values);

        if (!result.error) {
            profileMethods.reset(values);
            await initAuthSession();
            setRefreshKey(function(previous) {
                return previous + 1;
            });
        }
    }

    function handleProfileError(errors: FieldErrors<ProfileFormValues>) {
        formErrors(errors, profileMethods);
    }

    async function handlePasswordSubmit(values: ChangePasswordFormValues) {
        if (!profile) {
            return;
        }

        const result = await changeMyPassword(profile.email, values);

        if (!result.error) {
            passwordMethods.reset(EMPTY_PASSWORD);
        }
    }

    function handlePasswordError(errors: FieldErrors<ChangePasswordFormValues>) {
        formErrors(errors, passwordMethods);
    }

    async function handleCancelPendingRequest() {
        if (!profile?.pending_profile_request?.id) return;
        setIsCancelling(true);
        const result = await cancelMyProfileRequest(profile.pending_profile_request.id);
        setIsCancelling(false);
        if (!result.error) {
            useToastStore.getState().showToast('Pending profile change request cancelled.', 'info');
            setRefreshKey((prev) => prev + 1);
        }
    }

    return (
        <CommonCard className="h-full w-full">
            <div className="flex flex-col gap-6 h-full overflow-y-auto">
                <div className="flex flex-col gap-2">
                    <h1 className="font-semibold text-(--mui-palette-text-primary) text-xl">
                        My Account
                    </h1>
                    <p className="text-(--mui-palette-text-secondary) text-sm">
                        {profile?.email ?? '—'}
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {(profile?.role_labels ?? []).map(function(label) {
                            return (
                                <CommonChip
                                    key={label}
                                    label={label}
                                    variant="light"
                                />
                            );
                        })}
                    </div>
                </div>

                <CommonTabMenu
                    menuStyle="outline"
                    tabs={[
                        {
                            icon: <UserCircleIcon />,
                            label: 'Profile',
                            value: 'details'
                        },
                        {
                            icon: <LockKeyIcon />,
                            label: 'Security',
                            value: 'security'
                        }
                    ]}
                    value={activeTab}
                    onChange={handleTabChange}
                />

                {activeTab === 'details' && (
                    <div className="flex flex-col gap-6 max-w-4xl">
                        {profile?.pending_profile_request && profile.pending_profile_request.status === 'Pending' && (
                            <div className="border border-(--mui-palette-warning-main) bg-(--mui-palette-warning-light) p-4 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-(--mui-palette-text-primary)">
                                <div className="flex items-start gap-3">
                                    <HourglassIcon size={24} className="text-(--mui-palette-warning-main) shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-semibold m-0 text-sm">Profile Change Request Pending Registrar Verification</p>
                                        <p className="m-0 mt-0.5 text-(--mui-palette-text-secondary)">
                                            You submitted profile updates on {new Date(profile.pending_profile_request.created_at).toLocaleString()}. Changes will take effect once reviewed and approved by the Registrar.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                                    <CommonButton
                                        size="small"
                                        variant="outlined"
                                        onClick={() => setIsPendingModalOpen(true)}
                                    >
                                        View Changes
                                    </CommonButton>
                                    <CommonButton
                                        color="error"
                                        disabled={isCancelling}
                                        size="small"
                                        variant="text"
                                        onClick={handleCancelPendingRequest}
                                    >
                                        {isCancelling ? 'Cancelling...' : 'Cancel Request'}
                                    </CommonButton>
                                </div>
                            </div>
                        )}

                        {profile && (
                            <ProfileAvatarCard
                                avatarUrl={profile.avatar_url}
                                initials={resolveInitials(profile)}
                                userId={profile.id}
                                onChanged={handleAvatarChanged}
                            />
                        )}
                        {Boolean(profile?.student || profile?.role_labels?.includes('Student')) && (
                            <div className="border border-(--mui-palette-divider) flex flex-col gap-4 p-4 rounded-lg bg-(--mui-palette-background-paper)">
                                {!profile?.student && (
                                    <div className="border border-(--mui-palette-warning-main) bg-(--mui-palette-warning-light) p-3 rounded-lg flex items-center justify-between flex-wrap gap-2 text-xs text-(--mui-palette-text-primary)">
                                        <span>You do not have a student profile yet. Fill in your student information to activate your academic record.</span>
                                        <CommonButton
                                            size="small"
                                            variant="contained"
                                            onClick={function() {
                                                setIsStudentPromptOpen(true);
                                            }}
                                        >
                                            Set Up Student Profile
                                        </CommonButton>
                                    </div>
                                )}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <GraduationCapIcon size={22} className="text-(--mui-palette-primary-main)" />
                                        <h2 className="font-semibold text-base text-(--mui-palette-text-primary)">
                                            Academic Information
                                        </h2>
                                    </div>
                                    <CommonButton
                                        size="small"
                                        variant="outlined"
                                        onClick={function() {
                                            if (!profile?.student) {
                                                setIsStudentPromptOpen(true);
                                            } else {
                                                setIsProgramModalOpen(true);
                                            }
                                        }}
                                    >
                                        {profile?.student ? (profile?.student?.program_id ? 'Change Program' : 'Assign Program') : 'Create Student Profile'}
                                    </CommonButton>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                    <div>
                                        <span className="text-xs text-(--mui-palette-text-secondary) block">Student Number</span>
                                        <span className="font-medium text-(--mui-palette-text-primary)">
                                            {profile?.student?.student_number || <span className="text-(--mui-palette-text-secondary) italic">System Generated upon creation</span>}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-xs text-(--mui-palette-text-secondary) block">Academic Program</span>
                                        <span className="font-medium text-(--mui-palette-text-primary)">
                                            {profile?.student?.program_name
                                                ? `${profile.student.program_code} · ${profile.student.program_name}`
                                                : <span className="text-(--mui-palette-warning-main)">Not assigned yet</span>}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-xs text-(--mui-palette-text-secondary) block">Year Level</span>
                                        <span className="font-medium text-(--mui-palette-text-primary)">
                                            {profile?.student?.year_level ? `Year ${profile.student.year_level}` : '—'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                        <ProfileDetailsForm
                            control={profileMethods.control}
                            id={PROFILE_FORM_ID}
                            isStudentUser={isStudentUser}
                            programOptions={programOptions}
                            onSubmit={profileMethods.handleSubmit(handleProfileSubmit, handleProfileError)}
                        />
                        <div className="flex flex-col gap-2">
                            <div className="flex gap-2">
                                <CommonButton
                                    disabled={!profileMethods.formState.isDirty}
                                    size="small"
                                    variant="outlined"
                                    onClick={() => profileMethods.reset()}
                                >
                                    Reset
                                </CommonButton>
                                <CommonButton
                                    disabled={!profileMethods.formState.isDirty}
                                    form={PROFILE_FORM_ID}
                                    size="small"
                                    type="submit"
                                    variant="contained"
                                >
                                    {isStudentUser ? 'Submit Profile Changes' : 'Save Profile'}
                                </CommonButton>
                            </div>
                            {isStudentUser && (
                                <p className="text-xs text-(--mui-palette-text-secondary) m-0 italic">
                                    * Note: As an enrolled student, changes made to your profile must be reviewed and approved by the Registrar before taking effect.
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'security' && (
                    <div className="flex flex-col gap-6 max-w-md">
                        <p className="text-(--mui-palette-text-secondary) text-sm">
                            Changing your password signs you back in with the new credentials on
                            this device.
                        </p>
                        <ChangePasswordForm
                            control={passwordMethods.control}
                            getValues={passwordMethods.getValues}
                            id={PASSWORD_FORM_ID}
                            onSubmit={passwordMethods.handleSubmit(handlePasswordSubmit, handlePasswordError)}
                        />
                        <div className="flex">
                            <CommonButton
                                form={PASSWORD_FORM_ID}
                                size="small"
                                type="submit"
                                variant="contained"
                            >
                                Update Password
                            </CommonButton>
                        </div>
                    </div>
                )}
            </div>

            <AssignProgramModal
                currentProgramId={profile?.student?.program_id}
                currentProgramName={profile?.student?.program_name ? `${profile.student.program_code} · ${profile.student.program_name}` : undefined}
                currentYearLevel={profile?.student?.year_level}
                open={isProgramModalOpen}
                onClose={function() {
                    setIsProgramModalOpen(false);
                }}
                onSuccess={function() {
                    setRefreshKey(function(previous) {
                        return previous + 1;
                    });
                }}
            />

            <StudentProfilePromptModal
                currentProfile={profile}
                open={isStudentPromptOpen}
                onClose={function() {
                    setIsStudentPromptOpen(false);
                }}
                onSuccess={function() {
                    setRefreshKey(function(previous) {
                        return previous + 1;
                    });
                }}
            />

            <PendingChangesModal
                open={isPendingModalOpen}
                pendingRequest={profile?.pending_profile_request}
                onClose={() => setIsPendingModalOpen(false)}
            />
        </CommonCard>
    );
}