import { TextField, TextFieldProps } from '@mui/material'; // Mui dependency
import { classMerge } from '@utils/css.util';
import { forwardRef } from 'react'; // React dependency

export type CommonInputProps = TextFieldProps & {
    // Whether to make the input pill-shaped
    isRoundedFull?: boolean;
}

/**
 * CommonInput
 *
 * A customizable styled single-line text input built on MUI TextField.
 * Styles and sizings are handled natively through the MUI global theme.
 *
 * @example
 * <CommonInput
 *  placeholder="Search"
 *  size="large"
 *  variant="outlined"
 * />
 */
const CommonInput = forwardRef<HTMLDivElement, CommonInputProps>(({
    className,
    isRoundedFull,
    ...props
}, ref) => {
    return <TextField
        className={
            classMerge(
                className,
                isRoundedFull && 'common_input_rounded_full'
            )
        }
        ref={ref}
        {...props}
    />;
});
CommonInput.displayName = 'CommonInput';

export default CommonInput;