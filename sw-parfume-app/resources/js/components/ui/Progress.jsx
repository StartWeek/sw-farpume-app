import React from "react";
import clsx from "clsx";

export const Progress = ({
    value = 0,
    color = "primary",
    className,
    variant = "filled",
}) => {
    return (
        <div
            className={clsx(
                "w-full h-1.5 bg-page rounded-full overflow-hidden border border-stroke/50",
                className,
            )}
        >
            <div
                className={clsx(
                    "h-full transition-all duration-500 ease-out rounded-full",
                    color === "primary" && "bg-primary",
                    color === "success" && "bg-green-500",
                    color === "warning" && "bg-amber-500",
                    color === "error" && "bg-red-500",
                    color === "info" && "bg-blue-500",
                )}
                style={{ width: `${value}%` }}
            />
        </div>
    );
};
