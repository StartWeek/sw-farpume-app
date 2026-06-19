import React, { useState, useEffect, useRef } from "react";
import { IconUpload, IconX, IconFile } from "@tabler/icons-react";
import axios from "axios";

const validateFileType = (file, accept) => {
    if (!accept || accept === "*" || accept === "*/*") return true;
    return accept.split(",").some((type) => {
        type = type.trim().toLowerCase();
        if (type.endsWith("/*")) {
            return file.type.toLowerCase().startsWith(type.replace("/*", "/"));
        }
        if (type.startsWith(".")) {
            return file.name.toLowerCase().endsWith(type);
        }
        return file.type.toLowerCase() === type;
    });
};

const getAcceptHint = (accept) => {
    if (!accept || accept === "*/*") return "Semua tipe file";
    const typeMap = {
        "image/*": "JPG, PNG, GIF",
        "application/pdf": "PDF",
        "video/*": "MP4, AVI, MOV",
        "audio/*": "MP3, WAV",
    };
    return accept
        .split(",")
        .map((t) => {
            t = t.trim();
            if (typeMap[t]) return typeMap[t];
            if (t.endsWith("/*")) return t.split("/")[0].toUpperCase();
            if (t.startsWith(".")) return t.slice(1).toUpperCase();
            return (t.split("/")[1] || t).toUpperCase();
        })
        .join(", ");
};

const isImageType = (val) => {
    if (val instanceof File) return val.type.startsWith("image/");
    if (typeof val === "string")
        return /\.(jpg|jpeg|png|gif|webp|svg|bmp)/i.test(val);
    return false;
};

/**
 * @param {Object} props
 * @param {string} [props.label]
 * @param {string|File|Array<string|File>} props.value
 * @param {(value: string|File|Array) => void} props.onChange
 * @param {string|null} [props.error]
 * @param {boolean} [props.preview=true]
 * @param {string|null} [props.apiUrl] Upload immediately via API if provided
 * @param {string|string[]} [props.currentPath=""] Old file path(s) to delete on replace
 * @param {string} [props.accept="image/*"] Accepted MIME types (e.g. "image/*", "application/pdf")
 * @param {number} [props.maxSizeMB=2] Max file size in MB
 * @param {boolean} [props.multiple=false] Allow multiple file selection
 * @param {string|null} [props.placeholder] Custom placeholder text for the drop zone
 */
const ImageUpload = ({
    label,
    value,
    onChange,
    error,
    preview = true,
    apiUrl = null,
    currentPath = "",
    accept = "image/*",
    maxSizeMB = 2,
    multiple = false,
    placeholder = null,
}) => {
    const maxBytes = maxSizeMB * 1024 * 1024;
    const objectUrlsRef = useRef([]);

    const buildItems = (val) => {
        const arr = val
            ? (Array.isArray(val) ? val : [val]).filter(Boolean)
            : [];
        return arr.map((v) => {
            if (v instanceof File) {
                const url = URL.createObjectURL(v);
                objectUrlsRef.current.push(url);
                return {
                    url,
                    name: v.name,
                    isImage: v.type.startsWith("image/"),
                };
            }
            return {
                url: v,
                name: v.split("/").pop() || "file",
                isImage: isImageType(v),
            };
        });
    };

    const [previewItems, setPreviewItems] = useState(() => buildItems(value));
    const [uploading, setUploading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const dragCounter = useRef(0);

    useEffect(() => {
        // Revoke old object URLs before rebuilding
        objectUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
        objectUrlsRef.current = [];
        setPreviewItems(buildItems(value));

        return () => {
            objectUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
        };
    }, [value]);

    const processFiles = async (files) => {
        // Validate each file
        for (const file of files) {
            if (!validateFileType(file, accept)) {
                alert(
                    `File "${file.name}" tidak sesuai tipe yang diizinkan (${getAcceptHint(accept)})`,
                );
                return;
            }
            if (file.size > maxBytes) {
                alert(
                    `File "${file.name}" melebihi ukuran maksimal ${maxSizeMB}MB`,
                );
                return;
            }
        }

        // No API mode → pass File(s) directly to parent
        if (!apiUrl) {
            if (multiple) {
                const existing = Array.isArray(value)
                    ? value
                    : value
                      ? [value]
                      : [];
                onChange([...existing, ...files]);
            } else {
                onChange(files[0]);
            }
            return;
        }

        // API mode → upload and return path(s)
        setUploading(true);
        try {
            const uploadedPaths = [];
            for (const file of files) {
                const formData = new FormData();
                formData.append("image", file);
                if (currentPath && !multiple) {
                    formData.append(
                        "old_path",
                        Array.isArray(currentPath)
                            ? currentPath[0]
                            : currentPath,
                    );
                }
                const res = await axios.post(apiUrl, formData, {
                    headers: { "Content-Type": "multipart/form-data" },
                });
                uploadedPaths.push(res.data.path);
            }

            if (multiple) {
                const existing = Array.isArray(value)
                    ? value
                    : value
                      ? [value]
                      : [];
                onChange([...existing, ...uploadedPaths]);
            } else {
                onChange(uploadedPaths[0]);
            }
        } catch (err) {
            console.error("Upload error:", err);
            alert(
                "Gagal mengupload: " +
                    (err.response?.data?.message || err.message),
            );
        } finally {
            setUploading(false);
        }
    };

    const handleFileChange = async (e) => {
        const files = Array.from(e.target.files);
        e.target.value = "";
        if (!files.length) return;
        await processFiles(multiple ? files : [files[0]]);
    };

    const handleDragEnter = (e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current += 1;
        if (!uploading && dragCounter.current === 1) setIsDragging(true);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current -= 1;
        if (dragCounter.current === 0) setIsDragging(false);
    };

    const handleDrop = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current = 0;
        setIsDragging(false);
        if (uploading) return;
        const files = Array.from(e.dataTransfer.files);
        if (!files.length) return;
        await processFiles(multiple ? files : [files[0]]);
    };

    const handleRemove = (index) => {
        if (multiple) {
            const existing = Array.isArray(value) ? value : [];
            onChange(existing.filter((_, i) => i !== index));
        } else {
            onChange("");
        }
    };

    const acceptHint = getAcceptHint(accept);

    return (
        <div className="flex flex-col gap-2">
            {label && (
                <label className="text-sm font-medium text-main">{label}</label>
            )}

            {/* Drop Zone */}
            <label
                className={`
                    relative flex flex-col items-center justify-center gap-3
                    px-6 py-10 border-2 border-dashed rounded-xl
                    cursor-pointer transition-all duration-200 select-none
                    ${
                        isDragging
                            ? "border-primary bg-primary/5 shadow-inner"
                            : "border-stroke bg-card hover:border-primary/60 hover:bg-page"
                    }
                    ${uploading ? "pointer-events-none opacity-60" : ""}
                `}
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                {/* Icon */}
                <div
                    className={`
                        flex items-center justify-center w-14 h-14 rounded-full transition-colors
                        ${isDragging ? "bg-primary/10" : "bg-page border border-stroke shadow-sm"}
                    `}
                >
                    <IconUpload
                        className={`h-6 w-6 transition-colors ${isDragging ? "text-primary" : "text-muted"}`}
                    />
                </div>

                {/* Text */}
                <div className="text-center">
                    {uploading ? (
                        <p className="text-sm font-medium text-primary">
                            Mengupload...
                        </p>
                    ) : isDragging ? (
                        <p className="text-sm font-semibold text-primary">
                            Lepaskan untuk upload
                        </p>
                    ) : (
                        <>
                            {placeholder ? (
                                <p className="text-sm font-medium text-main">
                                    {placeholder}
                                </p>
                            ) : (
                                <p className="text-sm font-medium text-main">
                                    Drag & Drop atau{" "}
                                    <span className="text-primary underline underline-offset-2">
                                        pilih file
                                    </span>
                                    {multiple && (
                                        <span className="text-muted text-xs ml-1">
                                            (bisa banyak)
                                        </span>
                                    )}
                                </p>
                            )}
                            <p className="text-xs text-muted mt-1">
                                {acceptHint} — maks. {maxSizeMB}MB
                                {multiple ? " per file" : ""}
                            </p>
                        </>
                    )}
                </div>

                <input
                    type="file"
                    accept={accept}
                    multiple={multiple}
                    onChange={handleFileChange}
                    disabled={uploading}
                    className="hidden"
                />

                {/* Drag overlay border */}
                {isDragging && (
                    <div className="absolute inset-0 rounded-xl border-2 border-primary pointer-events-none" />
                )}
            </label>

            {/* Previews */}
            {preview && previewItems.length > 0 && (
                <div
                    className={`mt-1 ${multiple ? "flex flex-wrap gap-3" : ""}`}
                >
                    {previewItems.map((item, index) => (
                        <div
                            key={index}
                            className={`relative group ${
                                multiple ? "w-28 h-28" : "w-full max-w-xs h-48"
                            }`}
                        >
                            {item.isImage ? (
                                <img
                                    src={item.url}
                                    alt={item.name}
                                    className="w-full h-full object-cover rounded-xl border border-stroke bg-card shadow-sm"
                                />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center rounded-xl border border-stroke bg-card shadow-sm gap-2 px-2">
                                    <IconFile className="h-8 w-8 text-muted" />
                                    <span className="text-xs text-muted text-center truncate w-full">
                                        {item.name}
                                    </span>
                                </div>
                            )}
                            <button
                                type="button"
                                onClick={() => handleRemove(index)}
                                className="absolute top-1.5 right-1.5 bg-red-500 text-white rounded-full p-1
                                           opacity-0 group-hover:opacity-100 hover:bg-red-600
                                           shadow-md transition-all duration-150"
                            >
                                <IconX className="h-3 w-3" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {error && <span className="text-red-500 text-sm">{error}</span>}
        </div>
    );
};

export default ImageUpload;
