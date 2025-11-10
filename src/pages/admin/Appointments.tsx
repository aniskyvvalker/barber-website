import { useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "../../components/ui/card";

// Button not used in this page
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../../components/ui/select";
import {
    Calendar,
    Search,
    Check,
    Plus,
    Trash2,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "../../hooks/use-toast";

interface Appointment {
    id: string;
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    appointment_date: string;
    appointment_time: string;
    status: string;
    customer_message: string | null;
    barber_id: string;
    service_id: string;
    barbers: { name: string } | null;
    services: { name: string; price: number } | null;
}

export default function Appointments() {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [barberFilter, setBarberFilter] = useState("all");
    const [viewDate, setViewDate] = useState<string>(
        new Date().toISOString().split("T")[0]
    );

    const compareAppointments = (a: Appointment, b: Appointment) => {
        // Desc by date, then desc by time, then by id to stabilize
        const ad = a.appointment_date.localeCompare(b.appointment_date);
        if (ad !== 0) return -ad;
        const at = a.appointment_time.localeCompare(b.appointment_time);
        if (at !== 0) return -at;
        return a.id.localeCompare(b.id);
    };

    useEffect(() => {
        fetchAppointments(false);
        const noShowInterval = setInterval(() => {
            checkAndMarkNoShows();
        }, 60000);
        const refreshInterval = setInterval(() => {
            fetchAppointments(true);
        }, 15000);
        return () => {
            clearInterval(noShowInterval);
            clearInterval(refreshInterval);
        };
    }, []);

    const fetchAppointments = async (silent: boolean = false) => {
        if (!silent) setLoading(true);
        const { data, error } = await supabase
            .from("appointments")
            .select(
                `
        *,
        barbers (name),
        services (name, price)
      `
            )
            .order("appointment_date", { ascending: false })
            .order("appointment_time", { ascending: false });

        if (error) {
            console.error("Error fetching appointments:", error);
        } else {
            const sorted = (data || []).slice().sort(compareAppointments);
            setAppointments(sorted);
        }
        if (!silent) setLoading(false);
    };

    const checkAndMarkNoShows = async () => {
        const now = new Date();
        const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60000);
        const today = now.toISOString().split("T")[0];
        const timeThreshold = `${fifteenMinutesAgo
            .getHours()
            .toString()
            .padStart(2, "0")}:${fifteenMinutesAgo
            .getMinutes()
            .toString()
            .padStart(2, "0")}:00`;

        const { data: overdueAppointments } = await supabase
            .from("appointments")
            .select("id, appointment_date, appointment_time")
            .eq("status", "pending")
            .lte("appointment_date", today);

        if (overdueAppointments) {
            for (const apt of overdueAppointments) {
                const aptDateTime = new Date(
                    `${apt.appointment_date}T${apt.appointment_time}`
                );
                const fifteenMinutesAfter = new Date(
                    aptDateTime.getTime() + 15 * 60000
                );
                if (now > fifteenMinutesAfter) {
                    await supabase
                        .from("appointments")
                        .update({ status: "no_show" })
                        .eq("id", apt.id);
                }
            }
            fetchAppointments(true);
        }
    };

    const handleStatusChange = async (
        appointmentId: string,
        newStatus: string
    ) => {
        const { error } = await supabase
            .from("appointments")
            .update({
                status: newStatus,
                ...(newStatus === "checked_in" && {
                    checked_in_at: new Date().toISOString(),
                }),
                ...(newStatus === "cancelled" && {
                    cancelled_at: new Date().toISOString(),
                }),
            })
            .eq("id", appointmentId);

        if (error) {
            console.error("Error updating status:", error);
            toast({
                title: "Error",
                description: "Failed to update appointment status",
                variant: "destructive",
            });
        } else {
            // Optimistically update local state in place to prevent row jumping
            setAppointments((prev) => {
                const next = prev.map((a) =>
                    a.id === appointmentId ? { ...a, status: newStatus } : a
                );
                return next;
            });
            toast({
                title: "Success",
                description: `Appointment status changed to ${newStatus.replace(
                    "_",
                    " "
                )}`,
            });
            // Background refresh will reconcile periodically; no immediate resort
        }
    };

    const getStatusLabel = (status: string) => {
        return status
            .split("_")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case "pending":
                return {
                    backgroundColor: "#bfdbfe",
                    color: "#1e3a8a",
                    borderColor: "#60a5fa",
                }; // blue-200 / blue-900 / blue-400
            case "checked_in":
                return {
                    backgroundColor: "#bbf7d0",
                    color: "#14532d",
                    borderColor: "#4ade80",
                }; // green-200 / green-900 / green-400
            case "cancelled":
                return {
                    backgroundColor: "#fecaca",
                    color: "#7f1d1d",
                    borderColor: "#f87171",
                }; // red-200 / red-900 / red-400
            case "no_show":
                return {
                    backgroundColor: "#d1d5db",
                    color: "#111827",
                    borderColor: "#9ca3af",
                }; // gray-300 / gray-900 / gray-400
            default:
                return {
                    backgroundColor: "#e5e7eb",
                    color: "#111827",
                    borderColor: "#9ca3af",
                }; // gray-200 / gray-900 / gray-400
        }
    };

    const filteredAppointments = appointments.filter((apt) => {
        if (apt.appointment_date !== viewDate) return false;
        const searchMatch =
            apt.customer_name
                .toLowerCase()
                .includes(searchTerm.toLowerCase()) ||
            apt.customer_phone.includes(searchTerm) ||
            apt.customer_email.toLowerCase().includes(searchTerm.toLowerCase());
        if (!searchMatch) return false;
        if (statusFilter !== "all" && apt.status !== statusFilter) return false;
        if (
            barberFilter !== "all" &&
            (apt.barbers?.name || "") !== barberFilter
        )
            return false;
        return true;
    });

    const todayCount = appointments.filter((apt) => {
        const today = new Date().toISOString().split("T")[0];
        return apt.appointment_date === today && apt.status !== "cancelled";
    }).length;

    const upcomingCount = appointments.filter((apt) => {
        const today = new Date().toISOString().split("T")[0];
        return apt.appointment_date >= today && apt.status === "pending";
    }).length;

    const pendingCheckIn = appointments.filter((apt) => {
        const today = new Date().toISOString().split("T")[0];
        return apt.appointment_date === today && apt.status === "pending";
    }).length;

    const handlePermanentDelete = async (id: string) => {
        try {
            const { error } = await supabase
                .from("appointments")
                .delete()
                .eq("id", id);
            if (error) {
                toast({
                    title: "Delete failed",
                    description: error.message,
                    variant: "destructive",
                });
                return;
            }
            setAppointments((prev) => prev.filter((a) => a.id !== id));
            toast({
                title: "Appointment deleted",
                description: "The appointment was permanently removed.",
            });
        } catch (e: any) {
            toast({
                title: "Delete failed",
                description: e?.message || "Unknown error",
                variant: "destructive",
            });
        }
    };

    const [confirmDelete, setConfirmDelete] = useState<{
        open: boolean;
        id?: string;
    }>({ open: false });
    const [detailsModal, setDetailsModal] = useState<{
        open: boolean;
        apt?: Appointment | null;
    }>({ open: false, apt: null });

    const serviceDurations: Record<string, number> = {
        "Hot Towel Shave": 30,
    };

    return (
        <div
            className="p-6 min-h-screen"
            style={{ backgroundColor: "#F9FAFB" }}>
            {confirmDelete.open && (
                <div
                    className="fixed inset-0 flex items-center justify-center"
                    style={{ zIndex: 2147483647 }}>
                    <div
                        className="absolute inset-0 bg-black/70"
                        onClick={() =>
                            setConfirmDelete({ open: false, id: undefined })
                        }
                    />
                    <div
                        className="relative rounded-lg bg-white p-6 md:p-7 shadow-lg"
                        style={{
                            backgroundColor: "#ffffff",
                            zIndex: 2147483648,
                            width: "min(90vw, 560px)",
                        }}
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}>
                        <div className="mb-5 text-center">
                            <h3
                                className="text-xl font-black text-center leading-tight"
                                style={{
                                    fontWeight: 600,
                                    marginBottom: "10px",
                                }}>
                                Delete appointment?
                            </h3>
                            <p
                                className="text-sm text-gray-600 text-center font-bold"
                                style={{ marginTop: "15px" }}>
                                This action cannot be undone.
                                <br />
                                Deleting this appointment will immediately
                                cancel it in the system and an email
                                notification will be sent to the customer
                                informing them of the cancellation.
                            </p>
                        </div>
                        <div className="flex justify-center gap-2 mt-6">
                            <Button
                                variant="outline"
                                className="h-11 px-6 rounded-md transition-colors"
                                style={{
                                    backgroundColor: "#FFFFFF",
                                    color: "#374151",
                                    border: "1px solid #D1D5DB",
                                }}
                                onMouseEnter={(e) => {
                                    (
                                        e.currentTarget as HTMLButtonElement
                                    ).style.backgroundColor = "#F3F4F6";
                                }}
                                onMouseLeave={(e) => {
                                    (
                                        e.currentTarget as HTMLButtonElement
                                    ).style.backgroundColor = "#FFFFFF";
                                }}
                                onClick={() =>
                                    setConfirmDelete({
                                        open: false,
                                        id: undefined,
                                    })
                                }>
                                Keep Appointment
                            </Button>
                            <Button
                                className="admin-cancel-btn"
                                onClick={() => {
                                    if (confirmDelete.id) {
                                        handlePermanentDelete(confirmDelete.id);
                                    }
                                    setConfirmDelete({
                                        open: false,
                                        id: undefined,
                                    });
                                }}>
                                Delete
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {detailsModal.open && detailsModal.apt && (
                <div
                    className="fixed inset-0 flex items-center justify-center"
                    style={{ zIndex: 2147483647 }}>
                    <div
                        className="absolute inset-0 bg-black/70"
                        onClick={() =>
                            setDetailsModal({ open: false, apt: null })
                        }
                    />
                    <div
                        className="relative rounded-xl bg-white shadow-lg w-full max-w-2xl overflow-hidden"
                        style={{
                            backgroundColor: "#ffffff",
                            zIndex: 2147483648,
                            height: "70vh",
                            maxHeight: "70vh",
                        }}
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}>
                        <div className="flex flex-col h-full">
                            {/* Scrollable Content */}
                            <div className="flex-1 overflow-y-auto barber-dialog-scroll">
                                {/* Header */}
                                <div className="flex items-center justify-between px-6 md:px-8 py-6 border-b">
                                    <div className="flex items-baseline gap-3">
                                        <h3
                                            className="text-2xl font-black leading-tight"
                                            style={{ fontWeight: 600 }}>
                                            Appointment #
                                            {detailsModal.apt.id.slice(-4)}
                                        </h3>
                                        <span
                                            className={`inline-flex items-center justify-between gap-1 px-3 py-1 rounded-md text-xs font-medium border`}
                                            style={{
                                                ...getStatusStyle(
                                                    detailsModal.apt.status
                                                ),
                                                borderWidth: 1,
                                                borderStyle: "solid",
                                                borderColor: getStatusStyle(
                                                    detailsModal.apt.status
                                                ).borderColor,
                                            }}>
                                            {getStatusLabel(
                                                detailsModal.apt.status
                                            )}
                                        </span>
                                    </div>
                                    <button
                                        aria-label="Close"
                                        className="rounded-md p-2 hover:bg-gray-100"
                                        onClick={() =>
                                            setDetailsModal({
                                                open: false,
                                                apt: null,
                                            })
                                        }>
                                        ✕
                                    </button>
                                </div>

                                {/* Customer Row */}
                                <div className="px-6 md:px-8 py-6 border-b flex items-center gap-4">
                                    <div className="flex items-center gap-4 min-w-0">
                                        <div
                                            className="rounded-full bg-gray-200 flex items-center justify-center overflow-hidden"
                                            style={{
                                                width: "52px",
                                                height: "52px",
                                            }}>
                                            <svg
                                                viewBox="0 0 24 24"
                                                className="h-full w-full">
                                                <circle
                                                    cx="12"
                                                    cy="12"
                                                    r="12"
                                                    fill="#e5e7eb"
                                                />
                                                <path
                                                    fill="#9ca3af"
                                                    d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-3.33 0-6 2-6 4.5V20c0 .55.45 1 1 1h10c.55 0 1-.45 1-1v-1.5c0-2.5-2.67-4.5-6-4.5z"
                                                />
                                            </svg>
                                        </div>
                                        <div className="min-w-0">
                                            <div className="text-lg font-semibold text-gray-900 truncate">
                                                {detailsModal.apt.customer_name}
                                            </div>
                                            <div
                                                className="text-sm text-gray-500 flex items-center gap-4 truncate"
                                                style={{ color: "#6B7280" }}>
                                                {detailsModal.apt
                                                    .customer_phone && (
                                                    <a
                                                        href={`tel:${detailsModal.apt.customer_phone}`}
                                                        className="inline-flex items-center gap-1 text-gray-500 underline underline-offset-2 decoration-gray-500"
                                                        style={{
                                                            color: "#6B7280",
                                                            textDecoration:
                                                                "underline",
                                                        }}>
                                                        <svg
                                                            xmlns="http://www.w3.org/2000/svg"
                                                            viewBox="0 0 24 24"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            strokeWidth="1.8"
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            className="h-4 w-4"
                                                            aria-hidden="true">
                                                            <path d="M22 16.92v2a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.09 4.18 2 2 0 0 1 4.11 2h2a2 2 0 0 1 2 1.72c.12.89.31 1.76.57 2.6a2 2 0 0 1-.45 2.11L7.09 9.91a16 16 0 0 0 6 6l1.48-1.14a2 2 0 0 1 2.11-.45c.84.26 1.71.45 2.6.57A2 2 0 0 1 22 16.92z" />
                                                        </svg>
                                                        {(() => {
                                                            const d = String(
                                                                detailsModal.apt
                                                                    .customer_phone ||
                                                                    ""
                                                            ).replace(
                                                                /\D/g,
                                                                ""
                                                            );
                                                            const a = d.slice(
                                                                0,
                                                                4
                                                            );
                                                            const b = d.slice(
                                                                4,
                                                                6
                                                            );
                                                            const c = d.slice(
                                                                6,
                                                                8
                                                            );
                                                            const e = d.slice(
                                                                8,
                                                                10
                                                            );
                                                            return a
                                                                ? `(${a})-${b}${
                                                                      b
                                                                          ? "-"
                                                                          : ""
                                                                  }${c}${
                                                                      c
                                                                          ? "-"
                                                                          : ""
                                                                  }${e}`
                                                                : detailsModal
                                                                      .apt
                                                                      .customer_phone;
                                                        })()}
                                                    </a>
                                                )}
                                                {detailsModal.apt
                                                    .customer_email && (
                                                    <a
                                                        href={`mailto:${detailsModal.apt.customer_email}`}
                                                        className="inline-flex items-center gap-1 text-gray-500 underline underline-offset-2 decoration-gray-500"
                                                        style={{
                                                            color: "#6B7280",
                                                            textDecoration:
                                                                "underline",
                                                        }}>
                                                        <svg
                                                            xmlns="http://www.w3.org/2000/svg"
                                                            viewBox="0 0 24 24"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            strokeWidth="1.8"
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            className="h-4 w-4"
                                                            aria-hidden="true">
                                                            <path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
                                                            <path d="m22 6-10 7L2 6" />
                                                        </svg>
                                                        {
                                                            detailsModal.apt
                                                                .customer_email
                                                        }
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Details Grid */}
                                <div
                                    className="px-6 md:px-8 py-6 grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-6"
                                    style={{ columnGap: "3.5rem" }}>
                                    <div className="space-y-6 md:pr-8">
                                        <div className="md:pl-8">
                                            <div
                                                className="text-sm text-gray-500 mb-1"
                                                style={{ color: "#6B7280" }}>
                                                Date & Time
                                            </div>
                                            <div className="text-gray-900">
                                                {format(
                                                    new Date(
                                                        detailsModal.apt.appointment_date
                                                    ),
                                                    "EEEE, MMMM dd, yyyy"
                                                )}{" "}
                                                at{" "}
                                                {detailsModal.apt.appointment_time.slice(
                                                    0,
                                                    5
                                                )}
                                            </div>
                                        </div>
                                        <div>
                                            <div
                                                className="text-sm text-gray-500 mb-1"
                                                style={{ color: "#6B7280" }}>
                                                Services
                                            </div>
                                            <div className="text-gray-900 space-y-1">
                                                {detailsModal.apt.services
                                                    ?.name ? (
                                                    <div>
                                                        {
                                                            detailsModal.apt
                                                                .services?.name
                                                        }
                                                        {(() => {
                                                            const n =
                                                                detailsModal.apt
                                                                    .services
                                                                    ?.name ||
                                                                "";
                                                            const d =
                                                                serviceDurations[
                                                                    n
                                                                ];
                                                            return d
                                                                ? ` (${d} min)`
                                                                : "";
                                                        })()}
                                                    </div>
                                                ) : (
                                                    <span>—</span>
                                                )}
                                            </div>
                                        </div>
                                        <div>
                                            <div
                                                className="text-sm text-gray-500 mb-1"
                                                style={{ color: "#6B7280" }}>
                                                Total
                                            </div>
                                            <div className="text-gray-900 font-bold">
                                                {typeof detailsModal.apt
                                                    .services?.price ===
                                                "number"
                                                    ? `$${detailsModal.apt.services?.price.toFixed(
                                                          2
                                                      )}`
                                                    : "—"}
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <div
                                            className="text-sm text-gray-500 mb-1"
                                            style={{ color: "#6B7280" }}>
                                            Assigned Barber
                                        </div>
                                        <div className="text-gray-900">
                                            {detailsModal.apt.barbers?.name ||
                                                "Not assigned"}
                                        </div>
                                    </div>
                                    {detailsModal.apt.customer_message && (
                                        <div className="md:col-span-2">
                                            <div className="text-sm text-gray-500 mb-1">
                                                Message
                                            </div>
                                            <div className="rounded-md border bg-gray-50 p-3 text-gray-800 whitespace-pre-wrap leading-relaxed">
                                                {
                                                    detailsModal.apt
                                                        .customer_message
                                                }
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Footer Actions (sticky at bottom) */}
                            <div
                                className="px-6 md:px-8 py-6 border-t bg-gray-50 rounded-b-xl flex flex-col md:flex-row items-center justify-end gap-3"
                                style={{ backgroundColor: "#f2f4f7" }}>
                                <Button
                                    variant="outline"
                                    className="btn-cancel h-11 px-7 whitespace-nowrap rounded-md outline-none focus:outline-none ring-0 focus:ring-0 focus-visible:ring-0 ring-offset-0 focus-visible:ring-offset-0 transition-colors"
                                    style={{
                                        backgroundColor: "#F5E5E8",
                                        color: "#DC3545",
                                        borderColor: "#F5E5E8",
                                        paddingLeft: "1rem",
                                        paddingRight: "1rem",
                                        minWidth: "8rem",
                                    }}
                                    onClick={() => {
                                        if (!detailsModal.apt) return;
                                        if (
                                            detailsModal.apt.status ===
                                            "cancelled"
                                        ) {
                                            handlePermanentDelete(
                                                detailsModal.apt.id
                                            );
                                        } else {
                                            setConfirmDelete({
                                                open: true,
                                                id: detailsModal.apt.id,
                                            });
                                        }
                                        setDetailsModal({
                                            open: false,
                                            apt: null,
                                        });
                                    }}>
                                    Cancel Appointment
                                </Button>
                                <Button
                                    variant="outline"
                                    className="btn-reschedule h-11 px-7 whitespace-nowrap rounded-md outline-none focus:outline-none ring-0 focus:ring-0 focus-visible:ring-0 ring-offset-0 focus-visible:ring-offset-0 transition-colors"
                                    style={{
                                        paddingLeft: "1rem",
                                        paddingRight: "1rem",
                                        minWidth: "6rem",
                                        color: "#111827",
                                    }}>
                                    Reschedule
                                </Button>
                                <Button
                                    className="admin-primary-btn h-11 px-7 whitespace-nowrap rounded-md outline-none focus:outline-none ring-0 focus:ring-0 focus-visible:ring-0 ring-offset-0 focus-visible:ring-offset-0 transition-colors text-white"
                                    style={{
                                        backgroundColor: "#1D4ED8",
                                        borderColor: "#1D4ED8",
                                        paddingLeft: "1rem",
                                        paddingRight: "1rem",
                                        minWidth: "8rem",
                                    }}
                                    onClick={() =>
                                        setDetailsModal({
                                            open: false,
                                            apt: null,
                                        })
                                    }>
                                    Edit Appointment
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <div className="mb-6 flex items-center justify-between">
                <h2 className="text-3xl font-bold text-gray-900">
                    Appointments
                </h2>
                <Button className="admin-primary-btn h-10 px-4 rounded-md outline-none focus:outline-none ring-0 focus:ring-0 focus-visible:ring-0 ring-offset-0 focus-visible:ring-offset-0 transition-colors">
                    <Plus className="h-4 w-4 mr-2" />
                    New Appointment
                </Button>
            </div>

            <div
                className="service-stats"
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    border: "1px solid #E5E7EB",
                    borderRadius: "0.5rem",
                    overflow: "hidden",
                    backgroundColor: "#ffffff",
                    marginBottom: "1.5rem",
                }}>
                <div
                    style={{
                        padding: "0.25rem 1.5rem",
                        borderRight: "1px solid #E5E7EB",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        minWidth: "120px",
                    }}>
                    <div
                        style={{
                            fontSize: "1.1rem",
                            color: "#6B7280",
                            fontWeight: 500,
                            minHeight: "38px",
                            display: "flex",
                            alignItems: "center",
                            overflow: "visible",
                        }}>
                        Today's Appointments
                    </div>
                    <div
                        style={{
                            fontSize: "2.5rem",
                            fontWeight: 500,
                            color: "#111827",
                            marginTop: "0.25rem",
                        }}>
                        {todayCount}
                    </div>
                </div>

                <div
                    style={{
                        padding: "0.25rem 1.5rem",
                        borderRight: "1px solid #E5E7EB",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        minWidth: "120px",
                    }}>
                    <div
                        style={{
                            fontSize: "1.1rem",
                            color: "#6B7280",
                            fontWeight: 500,
                            minHeight: "38px",
                            display: "flex",
                            alignItems: "center",
                            overflow: "visible",
                        }}>
                        Upcoming
                    </div>
                    <div
                        style={{
                            fontSize: "2.5rem",
                            fontWeight: 500,
                            color: "#059669",
                            marginTop: "0.25rem",
                        }}>
                        {upcomingCount}
                    </div>
                </div>

                <div
                    style={{
                        padding: "0.25rem 1.5rem",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        minWidth: "120px",
                    }}>
                    <div
                        style={{
                            fontSize: "1.1rem",
                            color: "#6B7280",
                            fontWeight: 500,
                            minHeight: "38px",
                            display: "flex",
                            alignItems: "center",
                            overflow: "visible",
                        }}>
                        Pending Check-in
                    </div>
                    <div
                        style={{
                            fontSize: "2.5rem",
                            fontWeight: 500,
                            color: "#9CA3AF",
                            marginTop: "0.25rem",
                        }}>
                        {pendingCheckIn}
                    </div>
                </div>
            </div>

            <div className="mb-6">
                <div className="flex flex-nowrap items-center gap-2 overflow-x-auto w-full">
                    {(() => {
                        const todayStr = new Date().toISOString().split("T")[0];
                        const dateObj = new Date(viewDate);
                        const goDay = (delta: number) => {
                            const d = new Date(dateObj);
                            d.setDate(d.getDate() + delta);
                            setViewDate(d.toISOString().split("T")[0]);
                        };
                        const dateInputRef = useRef<HTMLInputElement | null>(
                            null
                        );
                        const view = new Date(viewDate);
                        view.setHours(0, 0, 0, 0);
                        const now0 = new Date();
                        now0.setHours(0, 0, 0, 0);
                        const oneDay = 24 * 60 * 60 * 1000;
                        const labelTitle =
                            view.getTime() === now0.getTime()
                                ? "Today"
                                : view.getTime() === now0.getTime() - oneDay
                                ? "Yesterday"
                                : view.getTime() === now0.getTime() + oneDay
                                ? "Tomorrow"
                                : view.toLocaleDateString(undefined, {
                                      weekday: "long",
                                  });
                        return (
                            <div className="flex items-center gap-2 flex-none">
                                <Button
                                    variant="outline"
                                    className="h-12 w-12 flex items-center justify-center border border-gray-300 bg-white hover:bg-gray-100 hover:border-gray-400 hover:shadow-sm transition-colors cursor-pointer text-gray-900 hover:text-gray-900"
                                    style={{ backgroundColor: "#ffffff" }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor =
                                            "#f1f5f9";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor =
                                            "#ffffff";
                                    }}
                                    onClick={() => goDay(-1)}>
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <div
                                    className="flex-none px-3 py-2 text-center overflow-hidden"
                                    style={{
                                        width: 90,
                                        minWidth: 90,
                                        maxWidth: 90,
                                    }}>
                                    <div className="text-sm text-gray-600">
                                        {labelTitle}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        {format(view, "MMM dd")}
                                    </div>
                                </div>
                                <Button
                                    variant="outline"
                                    className="h-12 w-12 flex items-center justify-center border border-gray-300 bg-white hover:bg-gray-100 hover:border-gray-400 hover:shadow-sm transition-colors cursor-pointer text-gray-900 hover:text-gray-900"
                                    style={{ backgroundColor: "#ffffff" }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor =
                                            "#f1f5f9";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor =
                                            "#ffffff";
                                    }}
                                    onClick={() => goDay(1)}>
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                                <Button
                                    className="admin-primary-btn h-12 px-4 rounded-md text-white hover:text-white hover:brightness-95 hover:shadow-sm transition-colors cursor-pointer"
                                    style={{
                                        backgroundColor: "#1D4ED8",
                                        borderColor: "#1D4ED8",
                                    }}
                                    onClick={() => setViewDate(todayStr)}>
                                    Today
                                </Button>
                                <Button
                                    variant="outline"
                                    className="h-12 px-3 flex items-center gap-2 border border-gray-300 bg-white hover:bg-gray-100 hover:border-gray-300 hover:shadow-sm transition-colors cursor-pointer text-gray-900 hover:text-gray-900"
                                    style={{ backgroundColor: "#ffffff" }}
                                    onMouseEnter={(e) => {
                                        (
                                            e.currentTarget as HTMLElement
                                        ).style.backgroundColor = "#f1f5f9";
                                    }}
                                    onMouseLeave={(e) => {
                                        (
                                            e.currentTarget as HTMLElement
                                        ).style.backgroundColor = "#ffffff";
                                    }}
                                    onClick={() =>
                                        dateInputRef.current?.showPicker?.() ||
                                        dateInputRef.current?.click()
                                    }>
                                    <Calendar className="h-4 w-4" />
                                    Select Date
                                </Button>
                                <Button
                                    variant="outline"
                                    className="h-12 px-3 flex items-center gap-2 border border-gray-300 bg-white hover:bg-gray-100 hover:border-gray-300 hover:shadow-sm transition-colors cursor-pointer text-gray-900 hover:text-gray-900"
                                    style={{ backgroundColor: "#ffffff" }}
                                    onMouseEnter={(e) => {
                                        (
                                            e.currentTarget as HTMLElement
                                        ).style.backgroundColor = "#f1f5f9";
                                    }}
                                    onMouseLeave={(e) => {
                                        (
                                            e.currentTarget as HTMLElement
                                        ).style.backgroundColor = "#ffffff";
                                    }}
                                    onClick={() => {
                                        /* Placeholder action: keep UI parity. Hook up logic if desired. */
                                    }}>
                                    Upcoming Appointments
                                </Button>
                                <input
                                    ref={dateInputRef}
                                    type="date"
                                    value={viewDate}
                                    onChange={(e) =>
                                        setViewDate(e.target.value)
                                    }
                                    className="hidden"
                                />
                            </div>
                        );
                    })()}
                    <span
                        style={{
                            display: "inline-block",
                            width: 2,
                            height: 43,
                            backgroundColor: "#E5E7EB",
                            marginLeft: 10,
                            marginRight: 10,
                        }}
                    />
                    <div className="flex items-center gap-2 flex-nowrap flex-1 min-w-0">
                        <div className="flex-auto min-w-0">
                            <div
                                className="relative"
                                style={{
                                    minWidth: 170,
                                    maxWidth: 660,
                                    width: "100%",
                                }}>
                                <Input
                                    placeholder="🔍 Search by name, phone, or email..."
                                    value={searchTerm}
                                    onChange={(e) =>
                                        setSearchTerm(e.target.value)
                                    }
                                    type="text"
                                    className="pl-3 h-12 w-full text-base text-gray-600 placeholder:text-gray-400 border border-gray-300 rounded-md bg-white hover:bg-gray-100 hover:shadow-sm hover:ring-1 hover:ring-gray-200 transition-colors outline-none focus:outline-none ring-0 focus:ring-0 focus-visible:ring-0 ring-offset-0 focus-visible:ring-offset-0 hover:border-gray-300 focus:border-gray-400"
                                    style={{ backgroundColor: "#ffffff" }}
                                    onMouseEnter={(e) => {
                                        (
                                            e.currentTarget as HTMLInputElement
                                        ).style.backgroundColor = "#f1f5f9";
                                    }}
                                    onMouseLeave={(e) => {
                                        (
                                            e.currentTarget as HTMLInputElement
                                        ).style.backgroundColor = "#ffffff";
                                    }}
                                />
                            </div>
                        </div>

                        {(() => {
                            const uniqueBarbers = Array.from(
                                new Set(
                                    appointments
                                        .map((a) => a.barbers?.name)
                                        .filter((v): v is string => Boolean(v))
                                )
                            ).sort();
                            return (
                                <div
                                    className="flex-none shrink-0"
                                    style={{ width: 140 }}>
                                    <Select
                                        value={barberFilter}
                                        onValueChange={setBarberFilter}>
                                        <SelectTrigger
                                            hideIcon
                                            className="admin-filter-trigger fixed-select-trigger filter-trigger h-12 w-full border border-gray-300 rounded-md bg-white hover:bg-gray-100 hover:shadow-sm hover:border-gray-300 transition-colors cursor-pointer outline-none focus:outline-none ring-0 focus:ring-0 focus-visible:ring-0 ring-offset-0 focus-visible:ring-offset-0 data-[state=open]:ring-0 data-[state=open]:ring-offset-0 hover:border-gray-300 focus:border-gray-400 overflow-hidden"
                                            style={{
                                                width: "100%",
                                                backgroundColor: "#ffffff",
                                            }}
                                            onMouseEnter={(e) => {
                                                (
                                                    e.currentTarget as HTMLElement
                                                ).style.backgroundColor =
                                                    "#f1f5f9";
                                            }}
                                            onMouseLeave={(e) => {
                                                (
                                                    e.currentTarget as HTMLElement
                                                ).style.backgroundColor =
                                                    "#ffffff";
                                            }}>
                                            <SelectValue
                                                className="truncate max-w-full"
                                                placeholder="Filter by barber"
                                            />
                                            <span className="filter-chevron">
                                                <ChevronDown size={12} />
                                            </span>
                                        </SelectTrigger>
                                        <SelectContent className="admin-status-menu rounded-md border border-gray-200 bg-white text-gray-900 shadow-md p-0 min-w-[180px]">
                                            <SelectItem
                                                value="all"
                                                className="px-3 py-2 text-sm bg-white hover:bg-gray-50 focus:bg-gray-50 data-[highlighted]:bg-gray-50 data-[state=checked]:bg-gray-100 data-[state=checked]:font-medium cursor-pointer border-0 hover:border-0 focus:border-0 outline-none focus:outline-none ring-0 focus:ring-0 focus-visible:ring-0">
                                                All Barbers
                                            </SelectItem>
                                            {uniqueBarbers.map((name) => (
                                                <SelectItem
                                                    key={name}
                                                    value={name}
                                                    className="px-3 py-2 text-sm bg-white hover:bg-gray-50 focus:bg-gray-50 data-[highlighted]:bg-gray-50 data-[state=checked]:bg-gray-100 data-[state=checked]:font-medium cursor-pointer border-0 hover:border-0 focus:border-0 outline-none focus:outline-none ring-0 focus:ring-0 focus-visible:ring-0">
                                                    {name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            );
                        })()}

                        <div
                            className="flex-none shrink-0"
                            style={{ width: 140 }}>
                            <Select
                                value={statusFilter}
                                onValueChange={setStatusFilter}>
                                <SelectTrigger
                                    hideIcon
                                    className="admin-filter-trigger fixed-select-trigger status-select-trigger filter-trigger h-12 w-full border border-gray-300 rounded-md bg-white hover:bg-gray-100 hover:shadow-sm hover:border-gray-300 transition-colors cursor-pointer outline-none focus:outline-none ring-0 focus:ring-0 focus-visible:ring-0 ring-offset-0 focus-visible:ring-offset-0 data-[state=open]:ring-0 data-[state=open]:ring-offset-0 focus:border-gray-400 overflow-hidden"
                                    style={{
                                        width: "100%",
                                        backgroundColor: "#ffffff",
                                    }}
                                    onMouseEnter={(e) => {
                                        (
                                            e.currentTarget as HTMLElement
                                        ).style.backgroundColor = "#f1f5f9";
                                    }}
                                    onMouseLeave={(e) => {
                                        (
                                            e.currentTarget as HTMLElement
                                        ).style.backgroundColor = "#ffffff";
                                    }}>
                                    <SelectValue
                                        className="truncate max-w-full"
                                        placeholder="Filter by status"
                                    />
                                    <span className="filter-chevron">
                                        <ChevronDown size={12} />
                                    </span>
                                </SelectTrigger>
                                <SelectContent className="admin-status-menu rounded-md border border-gray-200 bg-white text-gray-900 shadow-md p-0 min-w-[180px]">
                                    <SelectItem
                                        value="all"
                                        className="px-3 py-2 text-sm bg-white hover:bg-gray-50 focus:bg-gray-50 data-[highlighted]:bg-gray-50 data-[state=checked]:bg-gray-100 data-[state=checked]:font-medium cursor-pointer border-0 hover:border-0 focus:border-0 outline-none focus:outline-none ring-0 focus:ring-0 focus-visible:ring-0">
                                        Status
                                    </SelectItem>
                                    <SelectItem
                                        value="pending"
                                        className="px-3 py-2 text-sm bg-white hover:bg-gray-50 focus:bg-gray-50 data-[highlighted]:bg-gray-50 data-[state=checked]:bg-gray-100 data-[state=checked]:font-medium cursor-pointer border-0 hover:border-0 focus:border-0 outline-none focus:outline-none ring-0 focus:ring-0 focus-visible:ring-0">
                                        Pending
                                    </SelectItem>
                                    <SelectItem
                                        value="checked_in"
                                        className="px-3 py-2 text-sm bg-white hover:bg-gray-50 focus:bg-gray-50 data-[highlighted]:bg-gray-50 data-[state=checked]:bg-gray-100 data-[state=checked]:font-medium cursor-pointer border-0 hover:border-0 focus:border-0 outline-none focus:outline-none ring-0 focus:ring-0 focus-visible:ring-0">
                                        Checked In
                                    </SelectItem>
                                    <SelectItem
                                        value="no_show"
                                        className="px-3 py-2 text-sm bg-white hover:bg-gray-50 focus:bg-gray-50 data-[highlighted]:bg-gray-50 data-[state=checked]:bg-gray-100 data-[state=checked]:font-medium cursor-pointer border-0 hover-border-0 focus:border-0 outline-none focus:outline-none ring-0 focus:ring-0 focus-visible:ring-0">
                                        No Show
                                    </SelectItem>
                                    <SelectItem
                                        value="cancelled"
                                        className="px-3 py-2 text-sm bg-white hover:bg-gray-50 focus:bg-gray-50 data-[highlighted]:bg-gray-50 data-[state=checked]:bg-gray-100 data-[state=checked]:font-medium cursor-pointer border-0 hover-border-0 focus:border-0 outline-none focus:outline-none ring-0 focus:ring-0 focus-visible:ring-0">
                                        Cancelled
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Appointments section removed */}
        </div>
    );
}
