import { GearSix } from '@phosphor-icons/react';
import CommonHeaderSideBar, { CommonHeaderSideBarProps } from '@components/sidebar/CommonHeaderSideBar';
import { TOKENS } from '@constants/theme/tokens.constant';
import Button from '@mui/material/Button';
import { DivProps } from '@type/common.type';
import { classMerge } from '@utils/css.util';

// Visual variant for the sidebar
type SideBarVariant = 'dark' | 'light';

interface SideBarFooterProps {
    // Footer button label
    label?: string;

    // Click handler for the footer button
    onClick?: () => VoidFunction;
}

type SideBarHeaderProps = Pick<CommonHeaderSideBarProps, 'buttonProps' | 'hasArrow' | 'isExpanded' | 'logo' | 'subtitle' | 'title'>;

interface CommonSideBarProps extends DivProps {
    // Footer button configuration
    footerProps?: SideBarFooterProps;

    // Header configuration
    headerProps?: SideBarHeaderProps;

    // Whether the sidebar is open
    isOpen?: boolean;

    // Visual variant
    variant?: SideBarVariant;
}

/**
 * CommonSideBar
 *
 * A reusable sidebar component with configurable color, width, header,
 * and an optional footer button pinned at the bottom.
 *
 * @example
 * <CommonSideBar
 *   color="#011554"
 *   variant="dark"
 *   headerProps={{
 *     logo: <img src={logo} alt="logo" />,
 *     title: "EGEMCO HRIS",
 *     subtitle: "Super User Access"
 *   }}
 *   footerProps={{
 *     label: "Settings",
 *     onClick: () => navigate('/settings')
 *   }}
 * >
 *   {navigation content here}
 * </CommonSideBar>
 */
export default function CommonSideBar({
    children,
    className,
    color = TOKENS.color?.brand?.[950],
    footerProps,
    headerProps,
    isOpen = true,
    style,
    variant = 'dark',
    ...props
}: CommonSideBarProps) {
    const footerVariantStyles = {
        dark: {
            color: TOKENS.color?.common?.white,
            hoverBg: 'rgba(255,255,255,0.1)',
            iconColor: TOKENS.color?.neutral?.[300]
        },
        light: {
            color: TOKENS.color?.neutral?.[600],
            hoverBg: 'rgba(161,161,170,0.1)',
            iconColor: TOKENS.color?.neutral?.[400]
        }
    }; // Define styles for the footer button based on the sidebar variant.
    const footerStyle = footerVariantStyles[variant]; // Get the appropriate styles for the footer button based on the sidebar variant.
    return (
        <div
            className={
                classMerge(
                    'flex h-screen flex-col overflow-hidden transition-[width,min-width] duration-300',
                    isOpen
                        ? 'w-[15.625rem] min-w-[15.625rem]'
                        : 'w-0 min-w-0',
                    className
                )
            }
            style={{
                backgroundColor: color,
                ...style
            }}
            {...props}
        >
            {headerProps && (
                <CommonHeaderSideBar
                    {...headerProps}
                    variant={variant}
                />
            )}
            <div
                className={
                    classMerge(
                        'flex-1 overflow-y-auto px-[var(--mui-tokens-spacing-4)] pb-[var(--mui-tokens-spacing-4)] [&::-webkit-scrollbar-thumb]:rounded-[var(--mui-tokens-radius-sm)] [&::-webkit-scrollbar]:w-[var(--mui-tokens-spacing-2)]',
                        variant === 'dark'
                            ? '[&::-webkit-scrollbar-thumb]:bg-white/20'
                            : '[&::-webkit-scrollbar-thumb]:bg-gray-300'
                    )}>
                {children}
            </div>
            {footerProps && (
                <div className="shrink-0 px-[var(--mui-tokens-spacing-4)] pb-[var(--mui-tokens-spacing-4)]">
                    <Button
                        disableRipple
                        startIcon={<GearSix size={20} />}
                        sx={{
                            width: '100%',
                            justifyContent: 'flex-start',
                            gap: 1,
                            borderRadius: 'var(--mui-tokens-radius-sm)',
                            border: `2px solid ${TOKENS.color?.neutral?.[300]}`,
                            backgroundColor: 'transparent',
                            px: 4,
                            py: 1.5,
                            fontSize: 'var(--mui-tokens-fontSize-sm)',
                            textTransform: 'none',
                            color: footerStyle.color,
                            '&:hover': {
                                backgroundColor: footerStyle.hoverBg,
                                border: `2px solid ${TOKENS.color?.neutral?.[300]}`
                            },
                            '& .MuiButton-startIcon': {
                                color: footerStyle.iconColor,
                                marginRight: 0
                            }
                        }}
                        onClick={footerProps.onClick}
                    >
                        {/* TODO: use locales for default label */}
                        {footerProps.label ?? 'Settings'}
                    </Button>
                </div>
            )}
        </div>
    );
}