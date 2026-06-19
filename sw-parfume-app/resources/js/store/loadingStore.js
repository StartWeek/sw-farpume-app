import { create } from "zustand";

function getKey(name) {
    return name;
}

export const useLoadingStore = create((set, get) => ({
    loading: {},

    setLoading: ({ name, value }) =>
        set((state) => ({
            loading: { ...state.loading, [getKey(name)]: value },
        })),

    isLoading: ({ name }) => {
        return !!get().loading[getKey(name)];
    },

    stopLoading: (params) => {
        if (!params || !params.name) {
            set({ loading: {} });
            return;
        }

        set((state) => {
            const newLoading = { ...state.loading };
            const { name } = params;

            if (name) {
                delete newLoading[getKey(name)];
            }

            return { loading: newLoading };
        });
    },
}));
