import { create } from "zustand";

function getKey(name) {
    return name;
}

function resolveName(payload) {
    if (typeof payload === "string") {
        return payload;
    }

    return payload?.name || "";
}

export const useModalStore = create((set, get) => ({
    // Awal kosong, supaya bisa multi modal berdasarkan nama
    modals: {},

    showModal: (payload, dataArg = null, isEditArg = false) =>
        set((state) => {
            const name = resolveName(payload);
            const data =
                typeof payload === "object" && payload !== null
                    ? (payload.data ?? null)
                    : dataArg;
            const isEdit =
                typeof payload === "object" && payload !== null
                    ? Boolean(payload.isEdit)
                    : Boolean(isEditArg);

            if (!name) return state;

            return {
                modals: {
                    ...state.modals,
                    [getKey(name)]: {
                        open: true,
                        data,
                        isEdit,
                    },
                },
            };
        }),

    hideModal: (payload) =>
        set((state) => {
            const name = resolveName(payload);
            if (!name) return state;

            const newModals = { ...state.modals };
            delete newModals[getKey(name)];
            return { modals: newModals };
        }),

    isModalOpen: (payload) => {
        const name = resolveName(payload);
        if (!name) return false;
        return !!get().modals?.[getKey(name)]?.open;
    },

    getModalData: (payload) => {
        const name = resolveName(payload);
        if (!name) return null;
        return get().modals?.[getKey(name)] || null;
    },

    isEditMode: (payload) => {
        const name = resolveName(payload);
        if (!name) return false;
        return !!get().modals?.[getKey(name)]?.isEdit;
    },

    hideAll: () => set({ modals: {} }),
}));

export const useModalGlobal = (name) => {
    const isOpen = useModalStore((state) =>
        Boolean(state.modals?.[getKey(name)]?.open),
    );
    const data = useModalStore(
        (state) => state.modals?.[getKey(name)]?.data ?? null,
    );
    const isEdit = useModalStore((state) =>
        Boolean(state.modals?.[getKey(name)]?.isEdit),
    );
    const showModal = useModalStore((state) => state.showModal);
    const hideModal = useModalStore((state) => state.hideModal);

    return {
        isOpen,
        data,
        isEdit,
        openModal: (dataValue = null, editMode = false) =>
            showModal({ name, data: dataValue, isEdit: editMode }),
        closeModal: () => hideModal({ name }),
    };
};
