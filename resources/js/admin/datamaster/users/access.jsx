import ProtectedLayout from "@/components/layouts/ProtectedLayout";
import Button from "@/components/common/Button";
import { PageHeader, Select } from "@/admin/business/_components";
import { router } from "@inertiajs/react";
import React, { useMemo, useState } from "react";

const ROLE_LABELS = {
    superadmin: "SUPER USER",
    owner: "OWNER",
    admin: "ADMIN",
    manager: "MANAGER",
    kepala_toko: "KEPALA TOKO",
    kasir: "KASIR",
};

export default function UserAccess({ users = [], accessOptions = [] }) {
    const [selectedUserId, setSelectedUserId] = useState(users[0]?.id || "");
    const selectedUser = users.find(
        (user) => String(user.id) === String(selectedUserId),
    );
    const [access, setAccess] = useState(selectedUser?.akses_menu || []);

    React.useEffect(() => {
        setAccess(selectedUser?.akses_menu || []);
    }, [selectedUser?.id]);

    const groupedOptions = useMemo(() => {
        return accessOptions.reduce((groups, item) => {
            const group = item.group || "Lainnya";
            groups[group] = groups[group] || [];
            groups[group].push(item);
            return groups;
        }, {});
    }, [accessOptions]);

    const toggle = (key) => {
        setAccess((current) =>
            current.includes(key)
                ? current.filter((item) => item !== key)
                : [...current, key],
        );
    };

    const submit = (event) => {
        event.preventDefault();
        if (!selectedUser) return;

        router.put(
            `/admin/users/${selectedUser.id}/access`,
            { akses_menu: access },
            { preserveScroll: true },
        );
    };

    return (
        <ProtectedLayout title="Hak Akses User">
            <div className="space-y-5">
                <PageHeader
                    title="Hak Akses User"
                    subtitle="Atur menu yang boleh tampil di sidebar setiap user."
                />

                <form
                    onSubmit={submit}
                    className="rounded-lg border border-stroke bg-card p-4 shadow-premium"
                >
                    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-main">
                                Pilih User
                            </label>
                            <Select
                                value={selectedUserId}
                                onChange={(event) =>
                                    setSelectedUserId(event.target.value)
                                }
                            >
                                {users.map((user) => (
                                    <option key={user.id} value={user.id}>
                                        {user.name} ({user.username})
                                    </option>
                                ))}
                            </Select>
                            {selectedUser ? (
                                <div className="rounded-lg bg-page p-3 text-sm text-muted">
                                    <div className="font-semibold text-main">
                                        {selectedUser.name}
                                    </div>
                                    <div>Role: {ROLE_LABELS[selectedUser.role] || selectedUser.role}</div>
                                    <div>{access.length} menu aktif</div>
                                </div>
                            ) : null}
                        </div>

                        <div className="space-y-4">
                            {Object.entries(groupedOptions).map(
                                ([group, options]) => (
                                    <section key={group}>
                                        <div className="mb-2 text-sm font-black text-main">
                                            {group}
                                        </div>
                                        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                                            {options.map((option) => (
                                                <label
                                                    key={option.key}
                                                    className="flex items-center gap-2 rounded-lg border border-stroke bg-page px-3 py-2 text-sm font-medium text-main"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={access.includes(
                                                            option.key,
                                                        )}
                                                        onChange={() =>
                                                            toggle(option.key)
                                                        }
                                                        className="size-4 accent-primary"
                                                    />
                                                    <span>{option.label}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </section>
                                ),
                            )}
                        </div>
                    </div>

                    <div className="mt-5 flex justify-end">
                        <Button type="submit" disabled={!selectedUser}>
                            Simpan Hak Akses
                        </Button>
                    </div>
                </form>
            </div>
        </ProtectedLayout>
    );
}
