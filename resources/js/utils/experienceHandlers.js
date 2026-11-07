import { router } from "@inertiajs/react";
import toast from "react-hot-toast";

// Work Experience CRUD handlers
export const handleAddWorkExperience = (formData, fetchCallback) => {
    router.post("/jobseeker/work-experiences", formData, {
        preserveScroll: true,
        onSuccess: () => {
            toast.success("Work experience added successfully!");
            fetchCallback();
        },
        onError: (errors) => {
            const errorMessage =
                Object.values(errors)[0] || "Failed to add work experience";
            toast.error(errorMessage);
        },
    });
};

export const handleUpdateWorkExperience = (id, formData, fetchCallback) => {
    router.put(`/jobseeker/work-experiences/${id}`, formData, {
        preserveScroll: true,
        onSuccess: () => {
            toast.success("Work experience updated successfully!");
            fetchCallback();
        },
        onError: (errors) => {
            const errorMessage =
                Object.values(errors)[0] || "Failed to update work experience";
            toast.error(errorMessage);
        },
    });
};

export const handleDeleteWorkExperience = (id, fetchCallback) => {
    if (confirm("Are you sure you want to delete this work experience?")) {
        router.delete(`/jobseeker/work-experiences/${id}`, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success("Work experience deleted successfully!");
                fetchCallback();
            },
            onError: () => {
                toast.error("Failed to delete work experience");
            },
        });
    }
};

// Education CRUD handlers
export const handleAddEducation = (formData, fetchCallback) => {
    router.post("/jobseeker/educations", formData, {
        preserveScroll: true,
        onSuccess: () => {
            toast.success("Education added successfully!");
            fetchCallback();
        },
        onError: (errors) => {
            const errorMessage =
                Object.values(errors)[0] || "Failed to add education";
            toast.error(errorMessage);
        },
    });
};

export const handleUpdateEducation = (id, formData, fetchCallback) => {
    router.put(`/jobseeker/educations/${id}`, formData, {
        preserveScroll: true,
        onSuccess: () => {
            toast.success("Education updated successfully!");
            fetchCallback();
        },
        onError: (errors) => {
            const errorMessage =
                Object.values(errors)[0] || "Failed to update education";
            toast.error(errorMessage);
        },
    });
};

export const handleDeleteEducation = (id, fetchCallback) => {
    if (confirm("Are you sure you want to delete this education?")) {
        router.delete(`/jobseeker/educations/${id}`, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success("Education deleted successfully!");
                fetchCallback();
            },
            onError: () => {
                toast.error("Failed to delete education");
            },
        });
    }
};

// Organization CRUD handlers
export const handleAddOrganization = (formData, fetchCallback) => {
    router.post("/jobseeker/organizations", formData, {
        preserveScroll: true,
        onSuccess: () => {
            toast.success("Organization added successfully!");
            fetchCallback();
        },
        onError: (errors) => {
            const errorMessage =
                Object.values(errors)[0] || "Failed to add organization";
            toast.error(errorMessage);
        },
    });
};

export const handleUpdateOrganization = (id, formData, fetchCallback) => {
    router.put(`/jobseeker/organizations/${id}`, formData, {
        preserveScroll: true,
        onSuccess: () => {
            toast.success("Organization updated successfully!");
            fetchCallback();
        },
        onError: (errors) => {
            const errorMessage =
                Object.values(errors)[0] || "Failed to update organization";
            toast.error(errorMessage);
        },
    });
};

export const handleDeleteOrganization = (id, fetchCallback) => {
    if (confirm("Are you sure you want to delete this organization?")) {
        router.delete(`/jobseeker/organizations/${id}`, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success("Organization deleted successfully!");
                fetchCallback();
            },
            onError: () => {
                toast.error("Failed to delete organization");
            },
        });
    }
};

// Certification CRUD handlers
export const handleAddCertification = (formData, fetchCallback) => {
    router.post("/jobseeker/certifications", formData, {
        preserveScroll: true,
        forceFormData: true,
        onSuccess: () => {
            toast.success("Certification added successfully!");
            fetchCallback();
        },
        onError: (errors) => {
            const errorMessage =
                Object.values(errors)[0] || "Failed to add certification";
            toast.error(errorMessage);
        },
    });
};

export const handleUpdateCertification = (id, formData, fetchCallback) => {
    formData.append("_method", "PUT");
    router.post(`/jobseeker/certifications/${id}`, formData, {
        preserveScroll: true,
        forceFormData: true,
        onSuccess: () => {
            toast.success("Certification updated successfully!");
            fetchCallback();
        },
        onError: (errors) => {
            const errorMessage =
                Object.values(errors)[0] || "Failed to update certification";
            toast.error(errorMessage);
        },
    });
};

export const handleDeleteCertification = (id, fetchCallback) => {
    if (confirm("Are you sure you want to delete this certification?")) {
        router.delete(`/jobseeker/certifications/${id}`, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success("Certification deleted successfully!");
                fetchCallback();
            },
            onError: () => {
                toast.error("Failed to delete certification");
            },
        });
    }
};
