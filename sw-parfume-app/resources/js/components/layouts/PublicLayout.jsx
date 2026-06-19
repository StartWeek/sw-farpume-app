import React, { useEffect } from "react";
import { Head } from "@inertiajs/react";
import { Toaster } from "react-hot-toast";

const PublicLayout = ({
    children,
    title = "Halaman Publik",
    blank = false,
}) => {
    useEffect(() => {
        document.title = title;
    }, [title]);

    return (
        <React.Fragment>
            <Head title={title} />
            {blank ? children : <div className="bg-white">{children}</div>}

            <Toaster position="top-right" reverseOrder={false} />
        </React.Fragment>
    );
};

export default PublicLayout;
