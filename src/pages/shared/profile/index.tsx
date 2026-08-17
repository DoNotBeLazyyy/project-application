import { CommonChip } from '@components/badge/CommonChip';
import CommonButton from '@components/button/CommonButton';
import CommonCard from '@components/card/CommonCard';
import CommonTabMenu from '@components/tab-menu/CommonTabMenu';
import { LockKeyIcon, UserCircleIcon } from '@phosphor-icons/react';
import ChangePasswordForm from '@pages/shared/profile/ChangePasswordForm';
import { PASSWORD_FORM_ID, PROFILE_FORM_ID } from '@pages/shared/profile/constants/profile.constant';
import ProfileDetailsForm from '@pages/shared/profile/ProfileDetailsForm';
import { changeMyPassword, getMyProfile, updateMyProfile } from '@services/profile.service';
import { initAuthSession } from '@services/auth.service';
import { ChangePasswordFormValues, MyProfile, ProfileFormValues } from '@type/profile.type';
import { formErrors } from '@utils/form.util';
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

export default function ProfilePage() {
    const [activeTab, setActiveTab] = useState<ProfileTab>('details');
    const [profile, setProfile] = useState<MyProfile | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);

    const profileMethods = useForm<ProfileFormValues>({ defaultValues: EMPTY_PROFILE });
    const passwordMethods = useForm<ChangePasswordFormValues>({ defaultValues: EMPTY_PASSWORD });

    useEffect(function() {
        async function loadProfile() {
            const result = await getMyProfile();

            if (result.data) {
                setProfile(result.data);
                profileMethods.reset({
                    first_name: result.data.first_name,
                    middle_name: result.data.middle_name,
                    last_name: result.data.last_name,
                    suffix: result.data.suffix,
                    preferred_name: result.data.preferred_name,
                    mobile_number: result.data.mobile_number,
                    address_line1: result.data.address_line1,
                    address_line2: result.data.address_line2,
                    city: result.data.city,
                    province: result.data.province,
                    postal_code: result.data.postal_code,
                    date_of_birth: result.data.date_of_birth ?? '',
                    gender: result.data.gender,
                    civil_status: result.data.civil_status,
                    nationality: result.data.nationality
                });
            }
        }

        loadProfile();
    }, [refreshKey]);

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
                        <ProfileDetailsForm
                            control={profileMethods.control}
                            id={PROFILE_FORM_ID}
                            onSubmit={profileMethods.handleSubmit(handleProfileSubmit, handleProfileError)}
                        />
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
                                Save Profile
                            </CommonButton>
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
        </CommonCard>
    );
}