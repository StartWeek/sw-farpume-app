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
}) => {
    const loadOptions = async (inputValue) => {
        try {
            const response = await axios.get(loadOptionsUrl, {
                params: { search: inputValue },
            });

            // Handle Laravel Pagination (response.data.data) or simple array (response.data)
            const rawData = response.data.data || response.data;

            if (Array.isArray(rawData)) {
                return rawData.map(mapOption);
            }
            return [];
        } catch (error) {
            console.error("Error loading options:", error);
            return [];
        }
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
                    cacheOptions
                    defaultOptions
                    loadOptions={loadOptions}
                />
            ) : (
                <Select {...commonProps} options={options} />
            )}
            {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
        </div>
    );
};

export default AsyncSelectInput;
