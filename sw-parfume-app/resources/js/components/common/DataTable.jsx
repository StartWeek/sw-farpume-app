import React, { useState, Fragment, useMemo } from "react";
import {
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from "@tanstack/react-table";
import {
    IconChevronsLeft,
    IconChevronsRight,
    IconChevronLeft,
    IconChevronRight,
    IconSelector,
    IconChevronUp,
    IconChevronDown,
    IconSearch,
    IconDots,
    IconTrash,
    IconArrowBackUp,
    IconX,
    IconFileSpreadsheet,
    IconFileTypePdf,
} from "@tabler/icons-react";
import { Menu, Transition } from "@headlessui/react";
import clsx from "clsx";
import { Table, THead, TBody, Tr, Th, Td } from "@/components/ui/Table";
import Button from "@/components/common/Button";

const TableSortIcon = ({ sorted }) => {
    if (sorted === "asc")
        return <IconChevronUp size={14} className="text-primary" />;
    if (sorted === "desc")
        return <IconChevronDown size={14} className="text-primary" />;
    return <IconSelector size={14} className="text-muted opacity-30" />;
};

const IndeterminateCheckbox = ({ indeterminate, className, ...rest }) => {
    const ref = React.useRef(null);

    React.useEffect(() => {
        if (typeof indeterminate === "boolean") {
            ref.current.indeterminate = !rest.checked && indeterminate;
        }
    }, [ref, indeterminate, rest.checked]);

    return (
        <input
            type="checkbox"
            ref={ref}
            className={clsx(
                "size-5 cursor-pointer rounded-md border border-stroke bg-card accent-primary transition-all",
                "focus:outline-none focus:ring-4 focus:ring-primary/20",
                className,
            )}
            {...rest}
        />
    );
};

const getPaginationItems = (currentPageIndex, pageCount, siblingCount = 1) => {
    const visiblePageCount = siblingCount * 2 + 5;

    if (pageCount <= visiblePageCount) {
        return Array.from({ length: pageCount }, (_, index) => ({
            type: "page",
            value: index,
        }));
    }

    const items = [{ type: "page", value: 0 }];

    let start = Math.max(1, currentPageIndex - siblingCount);
    let end = Math.min(pageCount - 2, currentPageIndex + siblingCount);

    if (currentPageIndex <= siblingCount + 1) {
        end = Math.min(pageCount - 2, 1 + siblingCount * 2 + 1);
    }

    if (currentPageIndex >= pageCount - (siblingCount + 2)) {
        start = Math.max(1, pageCount - (siblingCount * 2 + 2));
    }

    if (start > 1) {
        items.push({ type: "ellipsis", key: "start-ellipsis" });
    }

    for (let index = start; index <= end; index += 1) {
        items.push({ type: "page", value: index });
    }

    if (end < pageCount - 2) {
        items.push({ type: "ellipsis", key: "end-ellipsis" });
    }

    items.push({ type: "page", value: pageCount - 1 });

    return items;
};

const resolveDynamicBoolean = (value, context) => {
    if (typeof value === "function") {
        return Boolean(value(context));
    }
    return Boolean(value);
};

const DataTable = ({
    columns,
    data,
    isLoading,
    emptyMessage = "No data found",
    showSearch = true,
    searchPlaceholder = "Search subscriptions...",
    searchValue,
    onSearchChange,
    pagination = true,
    onBulkDelete,
    actions = [],
    selectRow = false,
    serverPagination,
    remote,
}) => {
    const safeColumns = Array.isArray(columns) ? columns : [];
    const safeData = Array.isArray(data) ? data : [];
    const safeActions = Array.isArray(actions)
        ? actions
        : actions && typeof actions === "object"
          ? actions
          : [];

    const remoteConfig =
        remote && typeof remote === "object" ? remote : undefined;
    const remotePagination =
        remoteConfig?.pagination && typeof remoteConfig.pagination === "object"
            ? remoteConfig.pagination
            : serverPagination;

    const isServerPagination = Boolean(
        remoteConfig || remotePagination?.enabled,
    );
    const enableClientPagination = Boolean(pagination);
    const [internalGlobalFilter, setInternalGlobalFilter] = useState("");
    const [remoteSearchFilter, setRemoteSearchFilter] = useState(
        remoteConfig?.search ?? searchValue ?? "",
    );
    const [sorting, setSorting] = useState([]);
    const [rowSelection, setRowSelection] = useState({});

    const hasControlledRemoteSearch =
        remoteConfig &&
        Object.prototype.hasOwnProperty.call(remoteConfig, "search");
    const controlledSearchValue = remoteConfig?.search ?? searchValue ?? "";
    const activeRemoteSearchValue = hasControlledRemoteSearch
        ? controlledSearchValue
        : remoteSearchFilter;
    const handleSearchChange = remoteConfig?.onSearchChange ?? onSearchChange;
    const resolvedShowSearch =
        typeof remoteConfig?.searchable === "boolean"
            ? remoteConfig.searchable
            : showSearch;
    const resolvedSearchPlaceholder = searchPlaceholder;

    const globalFilter = isServerPagination
        ? activeRemoteSearchValue
        : internalGlobalFilter;

    const table = useReactTable({
        data: safeData,
        columns: safeColumns,
        state: {
            globalFilter,
            sorting,
            rowSelection,
        },
        enableRowSelection: selectRow,
        onRowSelectionChange: setRowSelection,
        onGlobalFilterChange: setInternalGlobalFilter,
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),
        ...(enableClientPagination
            ? { getPaginationRowModel: getPaginationRowModel() }
            : {}),
    });

    const selectedRows = table.getSelectedRowModel().rows;
    const selectedCount = selectedRows.length;
    const { pageIndex, pageSize } = table.getState().pagination;
    const pageCount = table.getPageCount();
    const currentPage = pageIndex + 1;
    const startEntry = safeData.length === 0 ? 0 : pageIndex * pageSize + 1;
    const endEntry = Math.min((pageIndex + 1) * pageSize, safeData.length);
    const desktopPaginationItems = getPaginationItems(pageIndex, pageCount, 1);
    const mobilePaginationItems = getPaginationItems(pageIndex, pageCount, 0);

    const serverCurrentPage = Number(remotePagination?.currentPage || 1);
    const serverLastPage = Number(remotePagination?.lastPage || 1);
    const serverTotal = Number(remotePagination?.total || safeData.length);
    const serverFrom = Number(
        remotePagination?.from || (safeData.length > 0 ? 1 : 0),
    );
    const serverTo = Number(remotePagination?.to || safeData.length);
    const serverPerPage = Number(remotePagination?.perPage || 10);
    const onServerPageChange =
        typeof remotePagination?.onPageChange === "function"
            ? remotePagination.onPageChange
            : null;
    const onServerPerPageChange =
        typeof remotePagination?.onPerPageChange === "function"
            ? remotePagination.onPerPageChange
            : null;
    const serverDesktopItems = getPaginationItems(
        Math.max(serverCurrentPage - 1, 0),
        Math.max(serverLastPage, 1),
        1,
    );
    const serverMobileItems = getPaginationItems(
        Math.max(serverCurrentPage - 1, 0),
        Math.max(serverLastPage, 1),
        0,
    );

    // Backward compatible actions API:
    // - Legacy array format: [{ isCreate, isEdit, isDelete, ... }]
    // - New object format: { toolbar: [], row: [] }
    const isLegacyActionsFormat = Array.isArray(safeActions);
    const { toolbarActions, rowActions } = useMemo(() => {
        if (Array.isArray(safeActions)) {
            return {
                toolbarActions: safeActions.filter(
                    (action) => action?.isCreate,
                ),
                rowActions: safeActions.filter(
                    (action) => action?.isEdit || action?.isDelete,
                ),
            };
        }

        return {
            toolbarActions: Array.isArray(safeActions?.toolbar)
                ? safeActions.toolbar
                : [],
            rowActions: Array.isArray(safeActions?.row) ? safeActions.row : [],
        };
    }, [safeActions]);

    const hasRowActions = rowActions.length > 0;

    const invokeAction = (action, context) => {
        if (typeof action?.onClick !== "function") return;

        if (isLegacyActionsFormat) {
            // Keep legacy behavior friendly for existing usages.
            if (context.row) {
                action.onClick(context.row);
            } else {
                action.onClick(context);
            }
            return;
        }

        action.onClick(context);
    };

    return (
        <div className="space-y-4">
            {/* Toolbar Top */}
            <div className="flex items-center justify-between px-1">
                <div className="flex-1">
                    {resolvedShowSearch && (
                        <div className="relative max-w-sm">
                            <input
                                type="text"
                                value={globalFilter ?? ""}
                                onChange={(e) => {
                                    if (isServerPagination) {
                                        const nextValue = e.target.value;
                                        if (!hasControlledRemoteSearch) {
                                            setRemoteSearchFilter(nextValue);
                                        }
                                        handleSearchChange?.(nextValue);
                                        return;
                                    }

                                    setInternalGlobalFilter(e.target.value);
                                }}
                                placeholder={resolvedSearchPlaceholder}
                                className="w-full rounded-2xl border border-stroke bg-card py-2.5 pl-10 pr-4 text-xs font-semibold text-main placeholder:text-muted shadow-sm transition-all focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
                            />
                            <IconSearch
                                size={16}
                                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
                            />
                        </div>
                    )}
                </div>

                {toolbarActions.length > 0 && (
                    <div className="flex items-center gap-2">
                        {toolbarActions.map((action, index) => {
                            const context = {
                                table,
                                selectedRows,
                            };
                            const isHidden = resolveDynamicBoolean(
                                action.hidden,
                                context,
                            );
                            const isDisabled = resolveDynamicBoolean(
                                action.disabled,
                                context,
                            );
                            const variant =
                                action.variant ||
                                (action.isDelete
                                    ? "danger"
                                    : action.isCreate
                                      ? "primary"
                                      : "default");

                            if (isHidden) return null;

                            return (
                                <Button
                                    key={action.key || index}
                                    variant={variant}
                                    size="sm"
                                    disabled={isDisabled}
                                    onClick={() =>
                                        invokeAction(action, context)
                                    }
                                    className="rounded-xl font-semibold"
                                >
                                    {action.icon}
                                    {action.label && (
                                        <span className="hidden sm:inline">
                                            {action.label}
                                        </span>
                                    )}
                                </Button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Main Table Card */}
            <div className="relative overflow-hidden rounded-2xl border border-stroke bg-card shadow-premium">
                {/* Selection Toolbar (Internal) */}
                {selectRow && selectedCount > 0 && (
                    <div className="absolute top-0 left-0 right-0 z-20 animate-in fade-in slide-in-from-top-1 duration-200">
                        <div className="flex items-center justify-between border-b border-stroke bg-card px-6 py-2 shadow-sm backdrop-blur-sm">
                            <div className="flex items-center gap-4">
                                <span className="text-[11px] font-black uppercase tracking-[0.15em] text-primary">
                                    {selectedCount} Selected from{" "}
                                    {safeData.length}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 h-9">
                                <button
                                    onClick={() =>
                                        onBulkDelete &&
                                        onBulkDelete(selectedRows)
                                    }
                                    className="flex h-8 w-auto items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-black uppercase tracking-wider text-white transition-all hover:bg-red-700 shadow-premium"
                                >
                                    <IconTrash size={16} />
                                    Delete
                                </button>
                                <button
                                    onClick={() => table.resetRowSelection()}
                                    className="flex h-8 w-auto items-center gap-2 rounded-xl border border-stroke bg-page px-4 py-2 text-xs font-black uppercase tracking-wider text-main transition-all hover:border-primary/50 hover:bg-primary/5"
                                >
                                    <IconArrowBackUp size={16} />
                                    Cancel
                                </button>

                                <Menu
                                    as="div"
                                    className="relative inline-block text-left"
                                >
                                    <Menu.Button as="div">
                                        <button className="flex h-8 w-auto items-center gap-2 rounded-xl border border-stroke bg-page px-4 py-2 text-xs font-black uppercase tracking-wider text-main transition-all hover:border-primary/50 hover:bg-primary/5">
                                            <IconDots size={18} />
                                            <span>More</span>
                                        </button>
                                    </Menu.Button>
                                    <Transition
                                        as={Fragment}
                                        enter="transition ease-out duration-100"
                                        enterFrom="transform opacity-0 scale-95"
                                        enterTo="transform opacity-100 scale-100"
                                        leave="transition ease-in duration-75"
                                        leaveFrom="transform opacity-100 scale-100"
                                        leaveTo="transform opacity-0 scale-95"
                                    >
                                        <Menu.Items className="absolute right-0 top-full z-50 mt-2 w-48 origin-top-right overflow-hidden rounded-2xl border border-stroke bg-card text-main shadow-premium-lg divide-y divide-stroke focus:outline-none">
                                            <div className="px-1 py-1">
                                                <Menu.Item>
                                                    {({ active }) => (
                                                        <button
                                                            className={clsx(
                                                                "group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-black uppercase tracking-widest transition-colors",
                                                                active
                                                                    ? "bg-page text-primary"
                                                                    : "text-main",
                                                            )}
                                                        >
                                                            <IconFileSpreadsheet
                                                                size={16}
                                                            />{" "}
                                                            Export CSV
                                                        </button>
                                                    )}
                                                </Menu.Item>
                                                <Menu.Item>
                                                    {({ active }) => (
                                                        <button
                                                            className={clsx(
                                                                "group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-black uppercase tracking-widest transition-colors",
                                                                active
                                                                    ? "bg-page text-primary"
                                                                    : "text-main",
                                                            )}
                                                        >
                                                            <IconFileTypePdf
                                                                size={16}
                                                            />{" "}
                                                            Export PDF
                                                        </button>
                                                    )}
                                                </Menu.Item>
                                            </div>
                                        </Menu.Items>
                                    </Transition>
                                </Menu>
                            </div>
                        </div>
                    </div>
                )}

                <div className="overflow-x-auto">
                    <Table className="w-full">
                        <THead>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <Tr
                                    key={headerGroup.id}
                                    className="border-b border-stroke bg-page"
                                >
                                    {selectRow && (
                                        <Th className="w-14 px-6 py-3.5">
                                            <div className="flex items-center justify-center">
                                                <IndeterminateCheckbox
                                                    {...{
                                                        checked:
                                                            table.getIsAllRowsSelected(),
                                                        indeterminate:
                                                            table.getIsSomeRowsSelected(),
                                                        onChange:
                                                            table.getToggleAllRowsSelectedHandler(),
                                                    }}
                                                />
                                            </div>
                                        </Th>
                                    )}

                                    {headerGroup.headers.map((header) => (
                                        <Th
                                            key={header.id}
                                            className="px-6 py-3.5 text-[10px] font-black uppercase tracking-[0.15em] text-muted opacity-90"
                                        >
                                            {header.isPlaceholder ? null : (
                                                <div
                                                    className={clsx(
                                                        "flex items-center gap-2",
                                                        header.column.getCanSort() &&
                                                            "cursor-pointer select-none",
                                                    )}
                                                    onClick={header.column.getToggleSortingHandler()}
                                                >
                                                    {flexRender(
                                                        header.column.columnDef
                                                            .header,
                                                        header.getContext(),
                                                    )}
                                                    {header.column.getCanSort() && (
                                                        <TableSortIcon
                                                            sorted={header.column.getIsSorted()}
                                                        />
                                                    )}
                                                </div>
                                            )}
                                        </Th>
                                    ))}

                                    {hasRowActions && (
                                        <Th
                                            key="actions"
                                            className="px-6 flex items-center text-center justify-center py-3.5 text-[10px] font-black uppercase tracking-[0.15em] text-muted opacity-90"
                                        >
                                            Action
                                        </Th>
                                    )}
                                </Tr>
                            ))}
                        </THead>
                        <TBody>
                            {isLoading ? (
                                Array(5)
                                    .fill(0)
                                    .map((_, idx) => (
                                        <Tr key={idx}>
                                            {selectRow && (
                                                <Td className="w-14 border-r border-stroke px-6 py-6">
                                                    <div className="mx-auto size-5 animate-pulse rounded border border-stroke bg-page" />
                                                </Td>
                                            )}
                                            {safeColumns.map((_, colIdx) => (
                                                <Td
                                                    key={colIdx}
                                                    className="px-6 py-6"
                                                >
                                                    <div className="h-4 w-full max-w-30 animate-pulse rounded-full bg-page" />
                                                </Td>
                                            ))}
                                            {hasRowActions && (
                                                <Td className="px-6 py-6">
                                                    <div className="h-9 w-24 animate-pulse rounded-xl bg-page" />
                                                </Td>
                                            )}
                                        </Tr>
                                    ))
                            ) : table.getRowModel().rows.length > 0 ? (
                                table.getRowModel().rows.map((row) => (
                                    <Tr
                                        key={row.id}
                                        className={clsx(
                                            "group relative border-b border-stroke last:border-0 transition-all duration-150",
                                            selectRow && row.getIsSelected()
                                                ? "bg-primary/5"
                                                : "hover:bg-page",
                                        )}
                                    >
                                        {selectRow && (
                                            <Td className="px-6 py-5 w-14 relative">
                                                {row.getIsSelected() && (
                                                    <div className="absolute inset-y-0 left-0 z-10 w-1.5 bg-primary" />
                                                )}
                                                <div className="flex items-center justify-center">
                                                    <IndeterminateCheckbox
                                                        {...{
                                                            checked:
                                                                row.getIsSelected(),
                                                            disabled:
                                                                !row.getCanSelect(),
                                                            indeterminate:
                                                                row.getIsSomeSelected(),
                                                            onChange:
                                                                row.getToggleSelectedHandler(),
                                                        }}
                                                    />
                                                </div>
                                            </Td>
                                        )}

                                        {row.getVisibleCells().map((cell) => (
                                            <Td
                                                key={cell.id}
                                                className="px-6 py-5 font-medium text-main"
                                            >
                                                {flexRender(
                                                    cell.column.columnDef.cell,
                                                    cell.getContext(),
                                                )}
                                            </Td>
                                        ))}
                                        {hasRowActions && (
                                            <Td className="px-6 py-5">
                                                <div className="flex items-center justify-center gap-2">
                                                    {rowActions.map(
                                                        (action, index) => {
                                                            const context = {
                                                                row,
                                                                table,
                                                                selectedRows,
                                                            };
                                                            const isHidden =
                                                                resolveDynamicBoolean(
                                                                    action.hidden,
                                                                    context,
                                                                );
                                                            const isDisabled =
                                                                resolveDynamicBoolean(
                                                                    action.disabled,
                                                                    context,
                                                                );
                                                            const variant =
                                                                action.variant ||
                                                                (action.isDelete
                                                                    ? "danger"
                                                                    : "default");

                                                            if (isHidden)
                                                                return null;

                                                            return (
                                                                <Button
                                                                    key={
                                                                        action.key ||
                                                                        index
                                                                    }
                                                                    variant={
                                                                        variant
                                                                    }
                                                                    size="md"
                                                                    iconOnly
                                                                    disabled={
                                                                        isDisabled
                                                                    }
                                                                    onClick={() =>
                                                                        invokeAction(
                                                                            action,
                                                                            context,
                                                                        )
                                                                    }
                                                                    title={
                                                                        action.label
                                                                    }
                                                                    className="rounded-xl"
                                                                >
                                                                    {
                                                                        action.icon
                                                                    }
                                                                </Button>
                                                            );
                                                        },
                                                    )}
                                                </div>
                                            </Td>
                                        )}
                                    </Tr>
                                ))
                            ) : (
                                <Tr>
                                    <Td
                                        colSpan={
                                            safeColumns.length +
                                            (selectRow ? 1 : 0) +
                                            (hasRowActions ? 1 : 0)
                                        }
                                        className="py-32 text-center text-muted"
                                    >
                                        <div className="flex flex-col items-center gap-3">
                                            <IconX size={40} stroke={1.5} />
                                            <span className="text-sm font-semibold">
                                                {emptyMessage}
                                            </span>
                                        </div>
                                    </Td>
                                </Tr>
                            )}
                        </TBody>
                    </Table>
                </div>

                {/* Pagination */}
                {((isServerPagination && serverLastPage > 0) ||
                    (!isServerPagination && pagination && pageCount > 0)) && (
                    <div className="flex flex-col gap-4 border-t border-stroke bg-card px-4 py-4 sm:px-6 sm:py-5 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-5">
                            <div className="text-center text-[10px] font-black uppercase tracking-[0.16em] text-muted sm:text-left sm:tracking-[0.2em]">
                                Showing{" "}
                                {isServerPagination ? serverFrom : startEntry} -{" "}
                                {isServerPagination ? serverTo : endEntry} of{" "}
                                {isServerPagination
                                    ? serverTotal
                                    : safeData.length}{" "}
                                entries
                            </div>

                            <div className="flex items-center justify-between gap-2 rounded-2xl border border-stroke bg-page px-3 py-2 text-xs font-semibold text-main sm:justify-start sm:rounded-none sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
                                <span className="text-muted">
                                    Rows per page
                                </span>
                                <select
                                    value={
                                        isServerPagination
                                            ? serverPerPage
                                            : pageSize
                                    }
                                    onChange={(e) => {
                                        const nextSize = Number(e.target.value);
                                        if (isServerPagination) {
                                            onServerPerPageChange?.(nextSize);
                                            return;
                                        }

                                        table.setPageSize(nextSize);
                                    }}
                                    className="rounded-xl border border-stroke bg-page px-3 py-2 text-xs font-bold text-main outline-none transition-all hover:border-primary/40 focus:border-primary focus:ring-4 focus:ring-primary/10"
                                >
                                    {[10, 25, 50, 100].map((size) => (
                                        <option key={size} value={size}>
                                            {size}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between lg:justify-end">
                            <div className="text-center text-xs font-semibold text-muted sm:text-left">
                                Page{" "}
                                <span className="text-main">
                                    {isServerPagination
                                        ? serverCurrentPage
                                        : currentPage}
                                </span>{" "}
                                of{" "}
                                <span className="text-main">
                                    {isServerPagination
                                        ? serverLastPage
                                        : pageCount}
                                </span>
                            </div>

                            <div className="flex items-center justify-center gap-1.5 sm:hidden">
                                <Button
                                    variant="default"
                                    size="lg"
                                    iconOnly
                                    disabled={
                                        isServerPagination
                                            ? serverCurrentPage <= 1
                                            : !table.getCanPreviousPage()
                                    }
                                    onClick={() =>
                                        isServerPagination
                                            ? onServerPageChange?.(
                                                  serverCurrentPage - 1,
                                              )
                                            : table.previousPage()
                                    }
                                    aria-label="Previous page"
                                    className="rounded-xl"
                                >
                                    <IconChevronLeft size={18} />
                                </Button>

                                <div className="flex items-center gap-1.5">
                                    {(isServerPagination
                                        ? serverMobileItems
                                        : mobilePaginationItems
                                    ).map((item, index) =>
                                        item.type === "ellipsis" ? (
                                            <span
                                                key={
                                                    item.key ||
                                                    `mobile-ellipsis-${index}`
                                                }
                                                className="flex h-10 min-w-8 items-center justify-center px-1 text-sm font-bold text-muted"
                                            >
                                                ...
                                            </span>
                                        ) : (
                                            <button
                                                key={`mobile-${item.value}`}
                                                onClick={() => {
                                                    if (isServerPagination) {
                                                        onServerPageChange?.(
                                                            item.value + 1,
                                                        );
                                                        return;
                                                    }

                                                    table.setPageIndex(
                                                        item.value,
                                                    );
                                                }}
                                                className={clsx(
                                                    "flex h-10 min-w-10 items-center justify-center rounded-xl px-3 text-sm font-bold transition-all",
                                                    item.value ===
                                                        (isServerPagination
                                                            ? serverCurrentPage -
                                                              1
                                                            : pageIndex)
                                                        ? "bg-primary text-white shadow-premium shadow-primary/20"
                                                        : "border border-stroke bg-card text-main hover:border-primary/50 hover:bg-page",
                                                )}
                                                aria-current={
                                                    item.value ===
                                                    (isServerPagination
                                                        ? serverCurrentPage - 1
                                                        : pageIndex)
                                                        ? "page"
                                                        : undefined
                                                }
                                            >
                                                {item.value + 1}
                                            </button>
                                        ),
                                    )}
                                </div>

                                <Button
                                    variant="default"
                                    size="lg"
                                    iconOnly
                                    disabled={
                                        isServerPagination
                                            ? serverCurrentPage >=
                                              serverLastPage
                                            : !table.getCanNextPage()
                                    }
                                    onClick={() =>
                                        isServerPagination
                                            ? onServerPageChange?.(
                                                  serverCurrentPage + 1,
                                              )
                                            : table.nextPage()
                                    }
                                    aria-label="Next page"
                                    className="rounded-xl"
                                >
                                    <IconChevronRight size={18} />
                                </Button>
                            </div>

                            <div className="hidden items-center gap-1.5 sm:flex">
                                <Button
                                    variant="default"
                                    size="lg"
                                    iconOnly
                                    disabled={
                                        isServerPagination
                                            ? serverCurrentPage <= 1
                                            : !table.getCanPreviousPage()
                                    }
                                    onClick={() =>
                                        isServerPagination
                                            ? onServerPageChange?.(1)
                                            : table.setPageIndex(0)
                                    }
                                    aria-label="First page"
                                    className="rounded-xl"
                                >
                                    <IconChevronsLeft size={18} />
                                </Button>
                                <Button
                                    variant="default"
                                    size="lg"
                                    iconOnly
                                    disabled={
                                        isServerPagination
                                            ? serverCurrentPage <= 1
                                            : !table.getCanPreviousPage()
                                    }
                                    onClick={() =>
                                        isServerPagination
                                            ? onServerPageChange?.(
                                                  serverCurrentPage - 1,
                                              )
                                            : table.previousPage()
                                    }
                                    aria-label="Previous page"
                                    className="rounded-xl"
                                >
                                    <IconChevronLeft size={18} />
                                </Button>

                                <div className="flex items-center gap-1.5">
                                    {(isServerPagination
                                        ? serverDesktopItems
                                        : desktopPaginationItems
                                    ).map((item, index) =>
                                        item.type === "ellipsis" ? (
                                            <span
                                                key={
                                                    item.key ||
                                                    `ellipsis-${index}`
                                                }
                                                className="flex h-10 min-w-10 items-center justify-center px-2 text-sm font-bold text-muted"
                                            >
                                                ...
                                            </span>
                                        ) : (
                                            <button
                                                key={item.value}
                                                onClick={() => {
                                                    if (isServerPagination) {
                                                        onServerPageChange?.(
                                                            item.value + 1,
                                                        );
                                                        return;
                                                    }

                                                    table.setPageIndex(
                                                        item.value,
                                                    );
                                                }}
                                                className={clsx(
                                                    "flex h-10 min-w-10 items-center justify-center rounded-xl px-3 text-sm font-bold transition-all",
                                                    item.value ===
                                                        (isServerPagination
                                                            ? serverCurrentPage -
                                                              1
                                                            : pageIndex)
                                                        ? "bg-primary text-white shadow-premium shadow-primary/20"
                                                        : "border border-stroke bg-card text-main hover:border-primary/50 hover:bg-page",
                                                )}
                                                aria-current={
                                                    item.value ===
                                                    (isServerPagination
                                                        ? serverCurrentPage - 1
                                                        : pageIndex)
                                                        ? "page"
                                                        : undefined
                                                }
                                            >
                                                {item.value + 1}
                                            </button>
                                        ),
                                    )}
                                </div>

                                <Button
                                    variant="default"
                                    size="lg"
                                    iconOnly
                                    disabled={
                                        isServerPagination
                                            ? serverCurrentPage >=
                                              serverLastPage
                                            : !table.getCanNextPage()
                                    }
                                    onClick={() =>
                                        isServerPagination
                                            ? onServerPageChange?.(
                                                  serverCurrentPage + 1,
                                              )
                                            : table.nextPage()
                                    }
                                    aria-label="Next page"
                                    className="rounded-xl"
                                >
                                    <IconChevronRight size={18} />
                                </Button>
                                <Button
                                    variant="default"
                                    size="lg"
                                    iconOnly
                                    disabled={
                                        isServerPagination
                                            ? serverCurrentPage >=
                                              serverLastPage
                                            : !table.getCanNextPage()
                                    }
                                    onClick={() =>
                                        isServerPagination
                                            ? onServerPageChange?.(
                                                  serverLastPage,
                                              )
                                            : table.setPageIndex(pageCount - 1)
                                    }
                                    aria-label="Last page"
                                    className="rounded-xl"
                                >
                                    <IconChevronsRight size={18} />
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DataTable;
