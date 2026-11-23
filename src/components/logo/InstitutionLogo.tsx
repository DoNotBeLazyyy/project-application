import { INSTITUTION_LOGO_SRC, INSTITUTION_NAME } from '@constants/institution.constant';
import { classMerge } from '@utils/css.util';

interface InstitutionLogoProps {
    className?: string;
    size?: number;
}

/**
 * The Arellano University seal, shown in the sidebar, sign-in screens and
 * printed records.
 *
 * Usage:
 *  <InstitutionLogo size={36} />
 */
export default function InstitutionLogo({
    className,
    size = 36
}: InstitutionLogoProps) {
    return (
        <img
            alt={`${INSTITUTION_NAME} logo`}
            className={classMerge('shrink-0 rounded-full object-contain', className)}
            height={size}
            src={INSTITUTION_LOGO_SRC}
            style={{ height: size, width: size }}
            width={size}
        />
    );
}