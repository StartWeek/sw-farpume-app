import React, { useState, useId } from "react";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";

/**
 * @param {Object} props
 * @param {React.ReactNode} props.children - Elemen yang dipasangi tooltip
 * @param {React.ReactNode} props.content - Isi tooltip
 * @param {'top' | 'bottom' | 'left' | 'right'} [props.placement='top']
 * @param {'sm' | 'md' | 'lg'} [props.size='md']
 * @param {string} [props.className='']
 * @param {boolean} [props.disabled=false]
 * @param {number} [props.delayShow=0] - ms sebelum tooltip muncul
 */
const Tooltip = ({
    children,
    content,
    placement = "top",
    size = "md",
    className = "",
    disabled = false,
    delayShow = 0,
}) => {
    const [visible, setVisible] = useState(false);
    const tooltipId = useId();
    let showTimeout = null;

    if (!content || disabled) return <>{children}</>;

    const placements = {
        top: {
            wrapper: "bottom-full left-1/2 -translate-x-1/2 mb-2.5",
            arrow: "top-full left-1/2 -translate-x-1/2 border-t-[var(--tooltip-arrow-color)] border-x-transparent border-b-transparent",
            initial: { opacity: 0, y: 4 },
            animate: { opacity: 1, y: 0 },
        },
        bottom: {
            wrapper: "top-full left-1/2 -translate-x-1/2 mt-2.5",
            arrow: "bottom-full left-1/2 -translate-x-1/2 border-b-[var(--tooltip-arrow-color)] border-x-transparent border-t-transparent",
            initial: { opacity: 0, y: -4 },
            animate: { opacity: 1, y: 0 },
        },
        left: {
            wrapper: "right-full top-1/2 -translate-y-1/2 mr-2.5",
            arrow: "left-full top-1/2 -translate-y-1/2 border-l-[var(--tooltip-arrow-color)] border-y-transparent border-r-transparent",
            initial: { opacity: 0, x: 4 },
            animate: { opacity: 1, x: 0 },
        },
        right: {
            wrapper: "left-full top-1/2 -translate-y-1/2 ml-2.5",
            arrow: "right-full top-1/2 -translate-y-1/2 border-r-[var(--tooltip-arrow-color)] border-y-transparent border-l-transparent",
            initial: { opacity: 0, x: -4 },
            animate: { opacity: 1, x: 0 },
        },
    };

    const sizes = {
        sm: "max-w-44 px-2.5 py-1.5 text-xs",
        md: "max-w-60 px-3 py-2 text-xs",
        lg: "max-w-80 px-4 py-3 text-sm",
    };

    const config = placements[placement] ?? placements.top;

    const handleMouseEnter = () => {
        if (delayShow > 0) {
            showTimeout = setTimeout(() => setVisible(true), delayShow);
        } else {
            setVisible(true);
        }
    };

    const handleMouseLeave = () => {
        clearTimeout(showTimeout);
        setVisible(false);
    };

    return (
        <span
            className="relative inline-flex"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onFocus={() => setVisible(true)}
            onBlur={() => setVisible(false)}
        >
            <span aria-describedby={visible ? tooltipId : undefined}>
                {children}
            </span>

            <AnimatePresence>
                {visible && (
                    <motion.div
                        id={tooltipId}
                        role="tooltip"
                        initial={config.initial}
                        animate={config.animate}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className={clsx(
                            "pointer-events-none absolute z-50 whitespace-nowrap",
                            config.wrapper,
                        )}
                        style={{
                            "--tooltip-arrow-color": "var(--color-card, #fff)",
                        }}
                    >
                        {/* Arrow */}
                        <span
                            className={clsx(
                                "absolute size-0 border-4",
                                config.arrow,
                            )}
                            style={{
                                filter: "drop-shadow(0 1px 1px rgb(0 0 0 / 0.08))",
                            }}
                        />

                        {/* Box */}
                        <div
                            className={clsx(
                                "rounded-xl border border-stroke bg-card font-semibold text-main shadow-premium",
                                sizes[size] ?? sizes.md,
                                className,
                            )}
                        >
                            {content}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </span>
    );
};

export default Tooltip;
