import React from "react";
import clsx from "clsx";

export const Avatar = ({ src, name, size = "md", className }) => {
    const sizeClasses = {
        sm: "w-8 h-8",
        md: "w-10 h-10",
        lg: "w-12 h-12",
        xl: "w-16 h-16",
    };

    const getInitials = (name) => {
        if (!name) return "??";
        return name
            .split(" ")
            .map((n) => n[0])
            .slice(0, 2)
            .join("")
            .toUpperCase();
    };

    return (
        <div
            className={clsx(
                "relative shrink-0 rounded-2xl overflow-hidden bg-page border border-stroke shadow-sm",
                sizeClasses[size] || size,
                className,
            )}
        >
            {src ? (
                <img
                    src={src}
                    alt={name}
                    className="w-full h-full object-cover"
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center bg-primary/5 text-primary text-xs font-black">
                    {getInitials(name)}
                </div>
            )}
        </div>
    );
};
