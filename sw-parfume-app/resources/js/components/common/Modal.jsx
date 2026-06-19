import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IconX } from "@tabler/icons-react";

/**
 * @param {Object} props
 * @param {string} props.title
 * @param {React.ReactNode} props.children
 * @param {Function} props.onClose
 * @param {string} [props.width='max-w-md']
 * @param {boolean} [props.scrollable=false] - If true, the body of the modal will scroll internally instead of the whole modal.
 * @param {'scale' | 'fade' | 'slide-up' | 'slide-down' | 'slide-left' | 'slide-right'} [props.animation='scale'] - Predefined animation types.
 * @param {Object} [props.variants] - Custom framer-motion variants for the modal content.
 * @param {Object} [props.transition] - Custom framer-motion transition for the modal content.
 * @param {'top' | 'center'} [props.position='top'] - Vertical alignment of modal container.
 */
const Modal = ({
    title,
    children,
    onClose,
    width = "max-w-md",
    scrollable = false,
    animation = "scale",
    variants,
    transition,
    position = "top",
}) => {
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === "Escape") onClose();
        };
        // Disable body scroll when modal is open
        document.body.style.overflow = "hidden";
        window.addEventListener("keydown", handleEsc);

        return () => {
            document.body.style.overflow = "unset";
            window.removeEventListener("keydown", handleEsc);
        };
    }, [onClose]);

    // Predefined animation presets
    const animationPresets = {
        scale: {
            hidden: { opacity: 0, scale: 0.95, y: 0 },
            visible: { opacity: 1, scale: 1, y: 0 },
            exit: { opacity: 0, scale: 0.95, y: 0 },
        },
        fade: {
            hidden: { opacity: 0 },
            visible: { opacity: 1 },
            exit: { opacity: 0 },
        },
        "slide-up": {
            hidden: { opacity: 0, y: 50 },
            visible: { opacity: 1, y: 0 },
            exit: { opacity: 0, y: 50 },
        },
        "slide-down": {
            hidden: { opacity: 0, y: -50 },
            visible: { opacity: 1, y: 0 },
            exit: { opacity: 0, y: -50 },
        },
        "slide-left": {
            hidden: { opacity: 0, x: 50 },
            visible: { opacity: 1, x: 0 },
            exit: { opacity: 0, x: 50 },
        },
        "slide-right": {
            hidden: { opacity: 0, x: -50 },
            visible: { opacity: 1, x: 0 },
            exit: { opacity: 0, x: -50 },
        },
    };

    // Default transition
    const defaultTransition = {
        type: "spring",
        duration: 0.4,
        bounce: 0.3,
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto overflow-x-hidden">
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            ></motion.div>

            {/* Modal Dialog Container */}
            <div
                className={`flex min-h-full justify-center p-4 sm:p-6 text-center ${
                    position === "center" ? "items-center" : "items-start"
                }`}
            >
                {/* Modal Content */}
                <motion.div
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    variants={variants || animationPresets[animation]}
                    transition={transition || defaultTransition}
                    className={`relative bg-card rounded-2xl shadow-premium-lg border border-stroke w-full ${width} my-8 text-left flex flex-col ${
                        scrollable ? "max-h-[85vh]" : ""
                    }`}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-stroke shrink-0">
                        <h2 className="text-base font-bold text-main">
                            {title}
                        </h2>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-xl cursor-pointer hover:bg-page text-muted hover:text-main transition-colors"
                        >
                            <IconX size={18} />
                        </button>
                    </div>

                    {/* Body */}
                    <div
                        className={`px-6 py-5 ${scrollable ? "overflow-y-auto" : ""}`}
                    >
                        {children}
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default Modal;
