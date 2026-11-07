import React from "react";
import AsyncSelect from "react-select/async";
import Select from "react-select";
import axios from "axios";

/**
 * @param {Object} props
 * @param {string} [props.label]
 * @param {any} props.value
 * @param {(value: any) => void} props.onChange
 * @param {string} [props.placeholder='Select...']
 * @param {string | null} [props.error]
 * @param {string} [props.loadOptionsUrl] URL to fetch options from
 * @param {Array<{label: string, value: any}>} [props.options=[]] Static options for non-async mode
 * @param {(item: any) => {label: string, value: any}} [props.mapOption] Function to map raw data to select options
 * @param {boolean} [props.isSearchable=true]
 * @param {boolean} [props.isClearable=false]
 */
const AsyncSelectInput = ({
    label,
    value,
    onChange,
    placeholder = "Select...",
    error,
    loadOptionsUrl,
    options = [],
    mapOption = (item) => ({ label: item.name, value: item.id }),
    isSearchable = true,
    isClearable = false,
    defaultOptions = true,
    searchDelay = 0,
    minInputLength = 0,
    ariaLabel,
    cacheOptions = true,
    loadOnMenuOpen = false,
}) => {
    const [loadError, setLoadError] = React.useState("");
    const [hasMore, setHasMore] = React.useState(false);
    const [menuOptions, setMenuOptions] = React.useState([]);
    const [loadingMenuOptions, setLoadingMenuOptions] = React.useState(false);
    const pending = React.useRef({});
    React.useEffect(() => () => {
        clearTimeout(pending.current.timer);
        pending.current.controller?.abort();
    }, [loadOptionsUrl]);

    const loadOptions = (inputValue, callback, openingMenu = false) => {
        clearTimeout(pending.current.timer);
        pending.current.controller?.abort();
        setLoadError("");
        setHasMore(false);
        setLoadingMenuOptions(openingMenu);
        if (!openingMenu && inputValue.trim().length < minInputLength) {
            callback([]);
            return;
        }
        const controller = new AbortController();
        pending.current.controller = controller;
        pending.current.timer = setTimeout(async () => {
            try {
                const response = await axios.get(loadOptionsUrl, {
                    params: { search: inputValue },
                    signal: controller.signal,
                });
                const rawData = response.data.data || response.data;
                if (!Array.isArray(rawData)) throw new Error("Invalid options response");
                setHasMore(Boolean(response.data.has_more));
                callback(rawData.map(mapOption));
            } catch (error) {
                if (axios.isCancel(error)) return;
                console.error("Error loading options:", error);
                setLoadError("Pilihan gagal dimuat. Ketik ulang untuk mencoba lagi.");
                callback([]);
            } finally {
                if (!controller.signal.aborted) setLoadingMenuOptions(false);
            }
        }, searchDelay);
    };

    const customStyles = {
        control: (provided, state) => ({
            ...provided,
            minHeight: "46px",
            borderColor: error
                ? "#ef4444"
                : state.isFocused
                  ? "var(--color-primary)"
                  : "var(--color-stroke)",
            borderRadius: "0.75rem",
            paddingTop: "2px",
            paddingBottom: "2px",
            backgroundColor: "var(--color-card)",
            color: "var(--color-main)",
            boxShadow: state.isFocused
                ? "0 0 0 4px color-mix(in srgb, var(--color-primary) 20%, transparent)"
                : "0 1px 2px rgba(15, 23, 42, 0.04)",
            "&:hover": {
                borderColor: state.isFocused
                    ? "var(--color-primary)"
                    : error
                      ? "#ef4444"
                      : "var(--color-stroke-strong)",
            },
        }),
        valueContainer: (provided) => ({
            ...provided,
            paddingLeft: "10px",
            paddingRight: "10px",
        }),
        input: (provided) => ({
            ...provided,
            color: "var(--color-main)",
            "input:focus": {
                boxShadow: "none",
            },
        }),
        singleValue: (provided) => ({
            ...provided,
            color: "var(--color-main)",
        }),
        indicatorSeparator: (provided) => ({
            ...provided,
            backgroundColor: "var(--color-stroke)",
        }),
        dropdownIndicator: (provided, state) => ({
            ...provided,
            color: state.isFocused
                ? "var(--color-primary)"
                : "var(--color-muted)",
            ":hover": {
                color: "var(--color-primary)",
            },
        }),
        clearIndicator: (provided) => ({
            ...provided,
            color: "var(--color-muted)",
            ":hover": {
                color: "var(--color-primary)",
            },
        }),
        placeholder: (provided) => ({
            ...provided,
            color: "var(--color-muted)",
        }),
        menu: (provided) => ({
            ...provided,
            marginTop: "8px",
            zIndex: 9999,
            overflow: "hidden",
            borderRadius: "0.75rem",
            border: "1px solid var(--color-stroke)",
            backgroundColor: "var(--color-card)",
            boxShadow: "0 16px 40px rgba(15, 23, 42, 0.12)",
        }),
        menuList: (provided) => ({
            ...provided,
            paddingTop: "8px",
            paddingBottom: "8px",
        }),
        option: (provided, state) => ({
            ...provided,
            margin: "0 8px",
            borderRadius: "0.75rem",
            cursor: "pointer",
            backgroundColor: state.isSelected
                ? "var(--color-primary)"
                : state.isFocused
                  ? "var(--color-page)"
                  : "transparent",
            color: state.isSelected ? "#ffffff" : "var(--color-main)",
            fontWeight: state.isSelected ? 700 : 500,
            ":active": {
                backgroundColor: state.isSelected
                    ? "var(--color-primary)"
                    : "var(--theme-100)",
            },
        }),
        noOptionsMessage: (provided) => ({
            ...provided,
            color: "var(--color-muted)",
        }),
        loadingMessage: (provided) => ({
            ...provided,
            color: "var(--color-muted)",
        }),
        menuPortal: (base) => ({ ...base, zIndex: 9999 }),
    };

    // Determine which mode to use
    const isAsyncMode = !!loadOptionsUrl;

    const commonProps = {
        onChange,
        value,
        placeholder,
        styles: customStyles,
        classNamePrefix: "react-select",
        isSearchable,
        isClearable,
        "aria-label": ariaLabel || label,
        menuPortalTarget:
            typeof document !== "undefined" ? document.body : null, // Portal to body
        menuPosition: "fixed", // Required for portal
    };

    return (
        <div className="w-full">
            {label && (
                <label className="block text-sm font-medium mb-1.5 text-main">
                    {label}
                </label>
            )}
            {isAsyncMode ? (
                <AsyncSelect
                    {...commonProps}
                    cacheOptions={cacheOptions}
                    defaultOptions={loadOnMenuOpen ? menuOptions : defaultOptions}
                    isLoading={loadingMenuOptions}
                    onMenuOpen={loadOnMenuOpen ? () => loadOptions("", setMenuOptions, true) : undefined}
                    loadOptions={loadOptions}
                    loadingMessage={() => "Memuat pilihan…"}
                    noOptionsMessage={() => loadError || (minInputLength > 0 ? "Ketik kata pencarian. Jika tidak ditemukan, periksa nama/kode." : "Data tidak ditemukan.")}
                />
            ) : (
                <Select {...commonProps} options={options} />
            )}
            {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
            {loadError && <p role="alert" className="text-sm text-red-500 mt-1">{loadError}</p>}
            {hasMore && <p className="mt-1 text-xs text-muted">Menampilkan 25 pilihan pertama. Perjelas nama atau kode untuk menemukan lainnya.</p>}
        </div>
    );
};

export default AsyncSelectInput;
