export const BREAKPOINT_VALUES = {
    xs: 0,
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280
} as const;

export const MOBILE_MAX_WIDTH = BREAKPOINT_VALUES.md - 0.02;

export const TABLET_MAX_WIDTH = BREAKPOINT_VALUES.lg - 0.02;

export const MOBILE_MEDIA_QUERY = `(max-width: ${MOBILE_MAX_WIDTH}px)`;

export const TABLET_MEDIA_QUERY = `(min-width: ${BREAKPOINT_VALUES.md}px) and (max-width: ${TABLET_MAX_WIDTH}px)`;

export const DESKTOP_MEDIA_QUERY = `(min-width: ${BREAKPOINT_VALUES.lg}px)`;