import React, { forwardRef } from "react";
import clsx from "clsx";

const variants = {
    filled: "text-white shadow-sm shadow-primary/20",
    soft: "bg-primary/10",
    outline: "border border-this/30",
};

const colorMaps = {
    primary: "text-primary bg-primary border-primary/30 shadow-primary/40",
    success:
        "text-green-600 bg-green-500 border-green-500/30 shadow-green-500/40",
    warning:
        "text-amber-600 bg-amber-500 border-amber-500/30 shadow-amber-500/40",
    error: "text-red-600 bg-red-500 border-red-500/30 shadow-red-500/40",
    info: "text-blue-600 bg-blue-500 border-blue-500/30 shadow-blue-500/40",
    secondary:
        "text-purple-600 bg-purple-500 border-purple-500/30 shadow-purple-500/40",
};

export const Badge = forwardRef(
    (
        {
            children,
            className,
            variant = "soft",
            color = "primary",
            isGlow = false,
            ...rest
        },
        ref,
    ) => {
        const colorClass = colorMaps[color] || colorMaps.primary;
        const [textColor, bgColor, borderColor, shadowColor] =
            colorClass.split(" ");

        return (
            <div
                ref={ref}
                className={clsx(
                    "inline-flex items-center px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all duration-300",
                    variant === "filled" && [
                        bgColor,
                        "text-white",
                        shadowColor,
                        "shadow-md",
                    ],
                    variant === "soft" && [
                        textColor,
                        bgColor.replace("bg-", "bg-") + "/10",
                    ],
                    variant === "outline" && [
                        textColor,
                        "bg-transparent border",
                        borderColor,
                    ],
                    isGlow && [shadowColor, "shadow-lg"],
                    className,
                )}
                {...rest}
            >
                {children}
            </div>
        );
    },
);

Badge.displayName = "Badge";
