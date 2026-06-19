import React, { useState } from "react";
import { IconEye, IconEyeOff } from "@tabler/icons-react";

/**
 * @param {Object} props
 * @param {string} props.name
 * @param {string | number} props.value
 * @param {(value: string) => void} props.onChange
 * @param {string} [props.placeholder='']
 * @param {boolean} [props.readOnly=false]
 * @param {string} [props.label='']
 * @param {import("react").HTMLInputTypeAttribute} [props.type='text']
 * @param {boolean} [props.required=false]
 * @param {string} [props.className='']
 * @param {string | null} [props.error=null]
 * @param {import("react").KeyboardEventHandler} [props.onKeyDown]
 * @param {boolean} [props.isRp=false]
 * @param {number | string} [props.min]
 * @param {number | string} [props.max]
 */
const InertiaTextInput = ({
    name,
    value,
    onChange,
    placeholder = "",
    readOnly = false,
    label = "",
    type = "text",
    required = false,
    className = "",
    error = null,
    onKeyDown,
    isRp = false,
    min,
    max,
}) => {
    const [showPassword, setShowPassword] = useState(false);

    const isPassword = type === "password";
    const inputType = isPassword ? (showPassword ? "text" : "password") : type;

    const formatRupiah = (value) => {
        const numberString = value?.toString()?.replace(/[^\d]/g, "") || "";
        const num = parseInt(numberString, 10);
        if (isNaN(num)) return "";
        return "Rp " + num.toLocaleString("id-ID");
    };

    return (
        <div className="w-full">
            {label && (
                <label className="block text-sm font-medium mb-1.5 text-main">
                    {label}
                </label>
            )}

            <div className="relative">
                <input
                    id={name}
                    readOnly={readOnly}
                    type={inputType}
                    placeholder={placeholder}
                    required={required}
                    onKeyDown={onKeyDown}
                    min={min}
                    max={max}
                    autoComplete="off"
                    value={
                        isRp && value
                            ? formatRupiah(value.toString())
                            : value || ""
                    }
                    className={`
                        w-full h-11 rounded-xl border px-4 py-2.5
                        border-stroke bg-card text-main placeholder:text-muted
                        shadow-sm transition-colors
                        focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary
                        ${isPassword ? "pr-11" : ""}
                        ${readOnly ? "bg-page text-muted cursor-not-allowed" : ""}
                        ${error ? "border-red-500 focus:ring-red-500/20" : ""}
                        ${className}
                    `}
                    onChange={(e) => {
                        const val = e.target.value;
                        if (isRp) {
                            onChange(val.replace(/[^\d]/g, ""));
                        } else {
                            onChange(val);
                        }
                    }}
                />

                {isPassword && (
                    <span
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-3 flex items-center text-muted transition-colors hover:text-primary"
                    >
                        {showPassword ? (
                            <IconEyeOff size={18} />
                        ) : (
                            <IconEye size={18} />
                        )}
                    </span>
                )}
            </div>

            {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
        </div>
    );
};

export default InertiaTextInput;
