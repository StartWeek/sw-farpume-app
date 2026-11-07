import React, { forwardRef } from "react";
import clsx from "clsx";

export const Table = forwardRef(
    (
        {
            children,
            component,
            className,
            hoverable,
            zebra,
            dense,
            sticky,
            ...rest
        },
        ref,
    ) => {
        const Component = component || "table";
        return (
            <Component
                className={clsx(
                    "table w-full text-left rtl:text-right",
                    hoverable && "is-hoverable",
                    zebra && "is-zebra",
                    dense && "is-dense",
                    sticky && "is-sticky",
                    className,
                )}
                ref={ref}
                {...rest}
            >
                {children}
            </Component>
        );
    },
);

Table.displayName = "Table";

function createTableTagComponent({
    className: defaultClassName,
    component: defaultComponent,
}) {
    const Component = forwardRef(
        ({ component, className, children, ...rest }, ref) => {
            const Comp = component || defaultComponent;
            return (
                <Comp
                    className={clsx(defaultClassName, className)}
                    ref={ref}
                    {...rest}
                >
                    {children}
                </Comp>
            );
        },
    );

    Component.displayName = defaultComponent;
    return Component;
}

export const TBody = createTableTagComponent({
    className: "table-tbody group/tbody",
    component: "tbody",
});

export const THead = createTableTagComponent({
    className: "table-thead group/thead",
    component: "thead",
});

export const TFoot = createTableTagComponent({
    className: "table-tfoot group/tfoot",
    component: "tfoot",
});

export const Tr = createTableTagComponent({
    className: "table-tr group/tr",
    component: "tr",
});

export const Th = createTableTagComponent({
    className: "table-th group/th",
    component: "th",
});

export const Td = createTableTagComponent({
    className: "table-td group/td",
    component: "td",
});
