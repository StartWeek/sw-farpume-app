import React from "react";

/**
 * @param {Object} props
 * @param {string} [props.name]
 * @param {boolean} [props.checked=false]
 * @param {(checked: boolean) => void} props.onChange
 * @param {string} [props.label='']
 * @param {string} [props.description='']
 * @param {boolean} [props.disabled=false]
 * @param {boolean} [props.required=false]
 * @param {string} [props.className='']
 * @param {string | null} [props.error=null]
 */
const ToggleCheckbox = ({
    name,
    checked = false,
    onChange,
    label = "",
    description = "",
    disabled = false,
    required = false,
    className = "",
    error = null,
}) => {
    return (
        <div className={`w-full ${className}`}>
            <label
                className={`
                    flex items-start justify-between gap-4 rounded-2xl border px-4 py-3
                    transition-all select-none
                    ${checked ? "border-primary bg-primary/5 shadow-premium shadow-primary/5" : "border-stroke bg-card"}
                    ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:border-primary/60 hover:bg-page"}
                    ${error ? "border-red-500" : ""}
                `}
            >
                <div className="flex-1">
                    {label && (
                        <div className="text-sm font-medium text-main">
                            {label}
                            {required && (
                                <span className="text-red-500"> *</span>
                            )}
                        </div>
                    )}
                    {description && (
                        <p className="mt-1 text-xs text-muted">{description}</p>
                    )}
                </div>

                <span className="relative inline-flex shrink-0">
                    <input
                        id={name}
                        name={name}
                        type="checkbox"
                        checked={checked}
                        disabled={disabled}
                        required={required}
                        className="peer sr-only"
                        onChange={(e) => onChange(e.target.checked)}
                    />
                    <span
                        className={`
                            relative inline-flex h-7 w-12 items-center rounded-full border transition-all
                            ${checked ? "border-primary bg-primary shadow-sm shadow-primary/20" : "border-stroke-strong bg-page"}
                            ${error ? "ring-1 ring-red-500" : "peer-focus-visible:ring-4 peer-focus-visible:ring-primary/20"}
                        `}
                    >
                        <span
                            className={`
                                inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform
                                ${checked ? "translate-x-6" : "translate-x-1"}
                            `}
                        />
                    </span>
                </span>
            </label>

            {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
        </div>
    );
};

export default ToggleCheckbox;
