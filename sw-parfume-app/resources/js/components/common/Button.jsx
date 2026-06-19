import React from "react";

/**
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @param {'button' | 'submit' | 'reset'} [props.type='button']
 * @param {'default' | 'primary' | 'secondary' | 'danger' | 'success' | 'outline' | 'ghost'} [props.variant='primary']
 * @param {'xs' | 'sm' | 'md' | 'lg' | 'xl'} [props.size='md']
 * @param {boolean} [props.disabled=false]
 * @param {boolean} [props.loading=false]
 * @param {Function} [props.onClick]
 * @param {string} [props.className='']
 * @param {boolean} [props.fullWidth=false]
 * @param {boolean} [props.iconOnly=false]
 * @param {import("@tabler/icons-react").Icon} [props.icon]
 * @param {'left' | 'right'} [props.iconPosition='left']
 */
const Button = ({
    children,
    type = "button",
    variant = "primary",
    size = "md",
    disabled = false,
    loading = false,
    onClick,
    className = "",
    fullWidth = false,
    iconOnly = false,
    icon: Icon,
    iconPosition = "left",
    ...rest
}) => {
    const baseStyles =
        "inline-flex items-center justify-center font-black rounded-2xl transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

    const variants = {
        default:
            "border border-stroke bg-card text-main hover:border-primary/50 hover:bg-page hover:text-primary",
        primary:
            "bg-primary hover:opacity-90 text-white shadow-premium shadow-primary/20 focus:ring-primary active:scale-[0.98]",
        secondary:
            "bg-page hover:bg-stroke-strong text-main focus:ring-stroke active:scale-[0.98]",
        danger: "bg-red-600 hover:bg-red-700 text-white shadow-premium shadow-red-100 focus:ring-red-500 active:scale-[0.98]",
        success:
            "bg-green-600 hover:bg-green-700 text-white shadow-premium shadow-green-100 focus:ring-green-500 active:scale-[0.98]",
        outline:
            "bg-card border-2 border-stroke hover:border-primary hover:text-primary text-main focus:ring-primary active:scale-[0.98]",
        ghost: "bg-transparent hover:bg-page text-main focus:ring-stroke",
    };

    const sizes = {
        xs: iconOnly ? "size-7" : "px-3 py-1.5 text-xs gap-1",
        sm: iconOnly ? "size-8" : "px-4 py-2 text-sm gap-2",
        md: iconOnly ? "size-9" : "px-5 py-3 text-base gap-2",
        lg: iconOnly ? "size-10" : "px-6 py-4 text-lg gap-3",
        xl: iconOnly ? "size-12" : "px-8 py-5 text-xl gap-3",
    };

    const widthClass = fullWidth ? "w-full" : "";

    return (
        <button
            type={type}
            disabled={disabled || loading}
            onClick={onClick}
            className={`${baseStyles} ${variants[variant] ?? variants.default} ${sizes[size]} ${widthClass} ${className}`}
            {...rest}
        >
            {loading ? (
                <>
                    <svg
                        className="animate-spin h-4 w-4"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                    >
                        <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                        ></circle>
                        <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                    </svg>
                    <span>Loading...</span>
                </>
            ) : (
                <>
                    {Icon && iconPosition === "left" && (
                        <Icon
                            size={
                                size === "xs"
                                    ? 14
                                    : size === "sm"
                                      ? 16
                                      : size === "md"
                                        ? 18
                                        : size === "lg"
                                          ? 20
                                          : 24
                            }
                        />
                    )}
                    {children}
                    {Icon && iconPosition === "right" && (
                        <Icon
                            size={
                                size === "xs"
                                    ? 14
                                    : size === "sm"
                                      ? 16
                                      : size === "md"
                                        ? 18
                                        : size === "lg"
                                          ? 20
                                          : 24
                            }
                        />
                    )}
                </>
            )}
        </button>
    );
};

export default Button;
