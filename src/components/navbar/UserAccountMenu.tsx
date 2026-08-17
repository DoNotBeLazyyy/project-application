import { ROLE_HOME } from '@constants/role.constant';
import { Divider, Menu, MenuItem } from '@mui/material';
import {
    CaretUpDownIcon,
    ChalkboardTeacherIcon,
    CheckIcon,
    GraduationCapIcon,
    Icon,
    IdentificationCardIcon,
    ShieldCheckIcon,
    SignOutIcon,
    StudentIcon,
    UserCircleIcon
} from '@phosphor-icons/react';
import { logout } from '@services/auth.service';
import { useAppStore } from '@stores/app.store';
import { UserRole } from '@type/app.type';
import { MouseEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const ROLE_ICON: Record<UserRole, Icon> = {
    Admin: ShieldCheckIcon,
    Dean: GraduationCapIcon,
    Faculty: ChalkboardTeacherIcon,
    Registrar: IdentificationCardIcon,
    Student: StudentIcon
};

function resolveInitials(firstName: string, lastName: string): string {
    const first = firstName.trim()
        .charAt(0);
    const last = lastName.trim()
        .charAt(0);

    return `${first}${last}`.toUpperCase() || 'U';
}

export default function UserAccountMenu() {
    const navigate = useNavigate();
    const userProfile = useAppStore((state) => state.userProfile);
    const activeRole = useAppStore((state) => state.activeRole);
    const availableRoles = useAppStore((state) => state.availableRoles);
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const isOpen = Boolean(anchorEl);

    const displayName = userProfile
        ? `${userProfile.first_name} ${userProfile.last_name}`
        : 'My Account';
    const initials = userProfile
        ? resolveInitials(userProfile.first_name, userProfile.last_name)
        : 'U';
    const activeRoleLabel = availableRoles.find((role) => role.code === activeRole)?.label
        ?? activeRole
        ?? '';
    const hasMultipleRoles = availableRoles.length > 1;

    function handleOpen(event: MouseEvent<HTMLElement>) {
        setAnchorEl(event.currentTarget);
    }

    function handleClose() {
        setAnchorEl(null);
    }

    function handleRoleSelect(role: UserRole) {
        handleClose();

        if (role === activeRole) {
            return;
        }

        useAppStore.getState()
            .setActiveRole(role);
        navigate(ROLE_HOME[role], { replace: true });
    }

    function handleProfile() {
        handleClose();

        if (!activeRole) {
            return;
        }

        navigate(`${ROLE_HOME[activeRole]}/profile`);
    }

    async function handleLogout() {
        handleClose();
        await logout();
        navigate('/login');
    }

    return (
        <>
            <button
                aria-expanded={isOpen}
                aria-haspopup="menu"
                aria-label={`Account menu for ${displayName}, active role ${activeRoleLabel}`}
                className="flex gap-(--mui-tokens-spacing-3) hover:bg-white/10 items-center px-2 py-1 rounded-(--mui-tokens-radius-md) transition-colors"
                type="button"
                onClick={handleOpen}
            >
                {userProfile?.avatar_url
                    ? <img
                        alt=""
                        className="h-9 object-cover rounded-full shrink-0 w-9"
                        src={userProfile.avatar_url}
                    />
                    : <span className="bg-white/15 flex font-semibold h-9 items-center justify-center rounded-full shrink-0 text-sm text-white w-9">
                        {initials}
                    </span>}
                <span className="flex-col hidden items-start leading-tight min-w-0 sm:flex">
                    <span className="font-medium max-w-40 text-sm text-white truncate">
                        {displayName}
                    </span>
                    <span className="max-w-40 text-white/60 text-xs truncate">
                        {activeRoleLabel}
                    </span>
                </span>
                <CaretUpDownIcon
                    className="shrink-0 text-white/70"
                    size={16}
                />
            </button>
            <Menu
                anchorEl={anchorEl}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                open={isOpen}
                slotProps={{ paper: { sx: { width: 280 } } }}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                onClose={handleClose}
            >
                <div className="flex flex-col gap-0.5 px-4 py-2">
                    <span className="font-semibold text-(--mui-palette-text-primary) text-sm truncate">
                        {displayName}
                    </span>
                    <span className="text-(--mui-palette-text-secondary) text-xs truncate">
                        {userProfile?.email}
                    </span>
                </div>
                <Divider />
                {hasMultipleRoles && (
                    <div className="px-4 pb-1 pt-2">
                        <span className="font-semibold text-(--mui-palette-text-secondary) text-[11px] tracking-wide uppercase">
                            Switch role
                        </span>
                    </div>
                )}
                {hasMultipleRoles && availableRoles.map((role) => {
                    const RoleIcon = ROLE_ICON[role.code] ?? UserCircleIcon;
                    const isActive = role.code === activeRole;

                    return (
                        <MenuItem
                            key={role.id}
                            selected={isActive}
                            onClick={function() {
                                handleRoleSelect(role.code);
                            }}
                        >
                            <span className="flex gap-3 items-center w-full">
                                <RoleIcon
                                    size={18}
                                    weight={
                                        isActive
                                            ? 'fill'
                                            : 'regular'
                                    }
                                />
                                <span
                                    className={
                                        isActive
                                            ? 'flex-1 font-semibold text-(--mui-tokens-color-common-white) text-sm'
                                            : 'flex-1 text-(--mui-palette-text-primary) text-sm'
                                    }
                                >
                                    {role.label}
                                </span>
                                {isActive && <CheckIcon
                                    className="text-(--mui-tokens-color-common-white)"
                                    size={16}
                                />}
                            </span>
                        </MenuItem>
                    );
                })}
                {hasMultipleRoles && <Divider />}
                <MenuItem onClick={handleProfile}>
                    <span className="flex gap-3 items-center w-full">
                        <UserCircleIcon size={18} />
                        <span className="text-(--mui-palette-text-primary) text-sm">
                            My Profile
                        </span>
                    </span>
                </MenuItem>
                <MenuItem onClick={handleLogout}>
                    <span className="flex gap-3 items-center w-full">
                        <SignOutIcon size={18} />
                        <span className="text-(--mui-palette-text-primary) text-sm">
                            Sign Out
                        </span>
                    </span>
                </MenuItem>
            </Menu>
        </>
    );
}