import * as React from "react";
import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "../../components/ui/card";
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
    Clock,
    User,
    Plus,
    ChevronLeft,
    ChevronRight,
    Search,
    ChevronDown,
    Phone,
    Mail,
} from "lucide-react";
import { Calendar as DayPickerCalendar } from "../../components/ui/calendar";
import { BookingFlow } from "../../components/BookingFlow";

export default function Appointments() {
    const [todayCount, setTodayCount] = useState(0);
    const [upcomingCount, setUpcomingCount] = useState(0);
    const [pendingCheckIn, setPendingCheckIn] = useState(0);
    const [todaysAppointments, setTodaysAppointments] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [barbers, setBarbers] = useState<any[]>([]);
    const [services, setServices] = useState<any[]>([]);
    const [selectedBarber, setSelectedBarber] = useState<string>("all");
    const [selectedStatus, setSelectedStatus] = useState<string>("all");
    const [selectedDate, setSelectedDate] = useState<string>(
        new Date().toISOString().split("T")[0]
    );
    const [datePickerOpen, setDatePickerOpen] = useState(false);
    const [datePickerSelected, setDatePickerSelected] = useState<
        Date | undefined
    >(undefined);
    const datePickerRef = useRef<HTMLDivElement | null>(null);
    const navigate = useNavigate();
    const [showUpcoming, setShowUpcoming] = useState<boolean>(false);
    const [showNewBooking, setShowNewBooking] = useState<boolean>(false);
    const [newBookingInitialId, setNewBookingInitialId] = useState<
        string | null
    >(null);
    const [prevSelectedDate, setPrevSelectedDate] = useState<string | null>(
        null
    );
    const [statusMenuOpenFor, setStatusMenuOpenFor] = useState<string | null>(
        null
    );
    const [statusMenuPos, setStatusMenuPos] = useState<{
        top: number;
        left: number;
    } | null>(null);
    const [barberMenuOpen, setBarberMenuOpen] = useState<boolean>(false);
    const [barberMenuPos, setBarberMenuPos] = useState<{
        top: number;
        left: number;
    } | null>(null);

    const openBarberMenu = (e: React.MouseEvent<HTMLElement>) => {
        const el = e.currentTarget as HTMLElement;
        const rect = el.getBoundingClientRect();
        const menuWidth = 220;
        // use document coordinates so the menu follows the element when scrolling
        let left = Math.round(rect.right + window.scrollX - menuWidth);
        if (left < 8) left = 8;
        const top = Math.round(rect.bottom + window.scrollY + 6);
        // Close any open status menus to avoid overlap when opening the barber menu
        setStatusMenuOpenFor(null);
        setStatusMenuPos(null);
        // Also close the toolbar status dropdown if it's open
        setToolbarStatusOpen(false);
        setToolbarStatusPos(null);
        setBarberMenuPos({ top, left });
        setBarberMenuOpen((v) => !v);
    };
    const [toolbarStatusOpen, setToolbarStatusOpen] = useState<boolean>(false);
    const [toolbarStatusPos, setToolbarStatusPos] = useState<{
        top: number;
        left: number;
    } | null>(null);
    // Details modal state
    const [detailsOpen, setDetailsOpen] = useState<boolean>(false);
    const [selectedAppointment, setSelectedAppointment] = useState<any | null>(
        null
    );
    // Whether to show the appointment id in the details header (toggled by clicking the title)
    const [showAppointmentId, setShowAppointmentId] = useState<boolean>(false);
    // Small-screen flag used to apply an inline left margin when CSS isn't taking effect
    const [isSmallScreenTitleMargin, setIsSmallScreenTitleMargin] =
        useState<boolean>(false);
    // confirmation state for deleting an already-cancelled appointment
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState<boolean>(false);

    // set up resize listener to toggle the small-screen flag
    useEffect(() => {
        const update = () => {
            const w = window.innerWidth;
            // apply margin only when viewport is greater than 400px and less than 480px
            setIsSmallScreenTitleMargin(w < 480 && w > 400);
        };
        update();
        window.addEventListener("resize", update);
        return () => window.removeEventListener("resize", update);
    }, []);

    // Ref for the title so we can force an !important inline margin if a stylesheet is overriding
    const appointmentTitleRef = useRef<HTMLHeadingElement | null>(null);

    // Ensure margin-left with priority when small screen and the details modal is open.
    // Include `detailsOpen` so we also apply the style when the modal mounts after a resize.
    useEffect(() => {
        const el = appointmentTitleRef.current;
        if (!el) return;
        const w = window.innerWidth;
        // enforce 0px margin for very small screens (<= 400px)
        if (w <= 400 && detailsOpen) {
            el.style.setProperty("margin-left", "0px", "important");
            return;
        }
        // enforce 20px margin for 401-479px when modal is open
        if (w > 400 && w < 480 && detailsOpen) {
            el.style.setProperty("margin-left", "20px", "important");
            return;
        }
        // otherwise remove any inline override so external CSS applies
        el.style.removeProperty("margin-left");
    }, [isSmallScreenTitleMargin, detailsOpen]);

    const openDetails = (apt: any) => {
        // normalize common phone/email field names and log for debugging
        const phone =
            apt?.phone ||
            apt?.customer_phone ||
            apt?.contact_phone ||
            apt?.mobile ||
            apt?.phone_number ||
            apt?.client_phone ||
            null;
        const email =
            apt?.email ||
            apt?.customer_email ||
            apt?.contact_email ||
            apt?.client_email ||
            null;
        // normalize common message/note field names
        const message =
            apt?.message ||
            apt?.notes ||
            apt?.note ||
            apt?.customer_message ||
            apt?.customer_note ||
            apt?.comment ||
            apt?.comments ||
            apt?.special_requests ||
            apt?.instructions ||
            null;
        const normalized = { ...apt, phone, email };
        // eslint-disable-next-line no-console
        console.log("openDetails", normalized);
        setSelectedAppointment({ ...normalized, message });
        setDetailsOpen(true);
        // hide id by default whenever opening details for a new appointment
        setShowAppointmentId(false);
        // reset delete confirmation when opening details
        setDeleteConfirmOpen(false);
    };
    const closeDetails = () => {
        setDetailsOpen(false);
        setSelectedAppointment(null);
    };

    // Prevent background scrolling when the details modal is open.
    // Use a robust approach that works on desktop and mobile (iOS).
    useEffect(() => {
        if (typeof document === "undefined") return;
        if (!detailsOpen) return;

        const prevBodyOverflow = document.body.style.overflow;
        const prevHtmlOverflow = document.documentElement.style.overflow;
        const prevBodyPosition = document.body.style.position;
        const prevBodyTop = document.body.style.top;
        const prevBodyLeft = document.body.style.left;
        const prevBodyRight = document.body.style.right;

        const scrollY = window.scrollY || window.pageYOffset || 0;
        // Lock scroll by fixing the body in place
        document.body.style.position = "fixed";
        document.body.style.top = `-${scrollY}px`;
        document.body.style.left = "0";
        document.body.style.right = "0";
        document.body.style.overflow = "hidden";
        document.documentElement.style.overflow = "hidden";

        return () => {
            // restore previous body/html styles
            document.body.style.position = prevBodyPosition;
            document.body.style.top = prevBodyTop;
            document.body.style.left = prevBodyLeft;
            document.body.style.right = prevBodyRight;
            document.body.style.overflow = prevBodyOverflow;
            document.documentElement.style.overflow = prevHtmlOverflow;
            // restore scroll position
            window.scrollTo(0, scrollY);
        };
    }, [detailsOpen]);

    const openToolbarStatus = (e: React.MouseEvent<HTMLElement>) => {
        const el = e.currentTarget as HTMLElement;
        const rect = el.getBoundingClientRect();
        const menuWidth = 180;
        // use document coordinates so the menu follows the element when scrolling
        let left = Math.round(rect.right + window.scrollX - menuWidth);
        if (left < 8) left = 8;
        const top = Math.round(rect.bottom + window.scrollY + 6);
        setToolbarStatusPos({ top, left });
        setToolbarStatusOpen((v) => !v);
    };

    const openStatusMenu = (id: any, e: React.MouseEvent<HTMLElement>) => {
        const already = statusMenuOpenFor === id;
        if (already) {
            setStatusMenuOpenFor(null);
            setStatusMenuPos(null);
            return;
        }
        // Close toolbar/barber portal menus when opening a status menu to avoid overlapping menus
        setBarberMenuOpen(false);
        setBarberMenuPos(null);
        setToolbarStatusOpen(false);
        setToolbarStatusPos(null);
        const el = e.currentTarget as HTMLElement;
        const rect = el.getBoundingClientRect();
        const menuWidth = 160;
        // use document coordinates so the menu scrolls with the page
        let left = Math.round(rect.right + window.scrollX - menuWidth);
        if (left < 8) left = 8;
        const top = Math.round(rect.bottom + window.scrollY + 6);
        setStatusMenuOpenFor(id);
        setStatusMenuPos({ top, left });
    };
    const getStatusMenuStyle = () => {
        if (statusMenuPos && statusMenuPos.top != null) {
            return {
                position: "fixed" as const,
                left: statusMenuPos.left,
                top: statusMenuPos.top,
                zIndex: 2147483647,
                minWidth: 160,
                padding: "8px",
            };
        }
        return {
            position: "absolute" as const,
            right: 0,
            top: "calc(100% + 6px)",
            zIndex: 2147483647,
            minWidth: 160,
            padding: "8px 0",
        };
    };

    const formatStatusLabel = (st?: string | null) => {
        if (!st) return "Unknown";
        if (st === "checked_in") return "Checked In";
        if (st === "no_show") return "No Show";
        if (st === "pending") return "Pending";
        if (st === "confirmed") return "Confirmed";
        if (st === "cancelled") return "Cancelled";
        return st
            .split("_")
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" ");
    };

    const getStatusStyles = (s?: string | null) => {
        if (s === "pending")
            return {
                backgroundColor: "rgba(164, 202, 251, 0.35)",
                borderColor: "#1D4ED8",
                color: "#1D4ED8",
            };
        if (s === "confirmed")
            return {
                backgroundColor: "#ECFDF5",
                borderColor: "#059669",
                color: "#059669",
            };
        if (s === "checked_in")
            return {
                backgroundColor: "#ECFDF5",
                borderColor: "#059669",
                color: "#059669",
            };
        if (s === "cancelled")
            return {
                backgroundColor: "#FEF2F2",
                borderColor: "#DC2626",
                color: "#DC2626",
            };
        if (s === "no_show")
            return {
                backgroundColor: "#F3F4F6",
                borderColor: "#E5E7EB",
                color: "#6B7280",
            };
        return {
            backgroundColor: "#F3F4F6",
            borderColor: "#E5E7EB",
            color: "#6B7280",
        };
    };

    const handleChangeStatus = async (id: any, newStatus: string) => {
        // Optimistic update to ensure UI reflects change even if events are tricky
        // eslint-disable-next-line no-console
        console.log("handleChangeStatus", { id, newStatus });
        setTodaysAppointments((prev: any) =>
            (prev as any[]).map((p) =>
                p.id === id ? { ...p, status: newStatus } : p
            )
        );
        try {
            const { data, error } = await supabase
                .from("appointments")
                .update({ status: newStatus })
                .eq("id", id);
            if (error) {
                console.error("Failed to update status (supabase)", error);
            } else {
                // update succeeded; ensure local state matches returned row if present
                if (Array.isArray(data) && data[0]) {
                    const updated: any = data[0];
                    setTodaysAppointments((prev: any) =>
                        (prev as any[]).map((p) =>
                            p.id === id ? { ...p, status: updated.status } : p
                        )
                    );
                }
            }
        } catch (err) {
            console.error("Unexpected error updating status", err);
        } finally {
            setStatusMenuOpenFor(null);
            setStatusMenuPos(null);
        }
    };

    const handleDeleteAppointment = async (id: any) => {
        if (!id) return;
        // optimistic UI removal (actual confirmation handled via UI)
        setTodaysAppointments((prev: any[]) =>
            (prev || []).filter((p) => String(p.id) !== String(id))
        );
        try {
            const { data, error } = await supabase
                .from("appointments")
                .delete()
                .eq("id", id);
            if (error) {
                console.error("Failed to delete appointment (supabase)", error);
            } else {
                console.log("Deleted appointment", data);
            }
        } catch (err) {
            console.error("Unexpected error deleting appointment", err);
        } finally {
            // close modal regardless
            setDetailsOpen(false);
            setSelectedAppointment(null);
            setDeleteConfirmOpen(false);
        }
    };

    const getAppointmentTotal = (apt: any): number | null => {
        if (!apt) return null;
        if (apt.total != null && !isNaN(Number(apt.total)))
            return Number(apt.total);
        // try common alternative fields
        if (apt.price != null && !isNaN(Number(apt.price)))
            return Number(apt.price);
        if (apt.amount != null && !isNaN(Number(apt.amount)))
            return Number(apt.amount);
        // lookup service price
        if (apt.service_id) {
            const s = services.find(
                (sv) => String(sv.id) === String(apt.service_id)
            );
            if (s && s.price != null && !isNaN(Number(s.price)))
                return Number(s.price);
        }
        // fallback null
        return null;
    };

    const getContactPhone = (apt: any) => {
        if (!apt) return null;
        return (
            apt.phone ||
            apt.customer_phone ||
            apt.contact_phone ||
            apt.mobile ||
            apt.phone_number ||
            apt.client_phone ||
            apt.customer?.phone ||
            null
        );
    };

    const getContactEmail = (apt: any) => {
        if (!apt) return null;
        return (
            apt.email ||
            apt.customer_email ||
            apt.contact_email ||
            apt.client_email ||
            apt.customer?.email ||
            null
        );
    };

    const formatPhoneForDisplay = (raw?: string | null) => {
        if (!raw) return "";
        const digits = String(raw).replace(/\D/g, "");
        if (digits.length === 0) return raw;
        // first 4 digits as area code in parentheses, rest in groups of 2
        const area = digits.slice(0, 4);
        const rest = digits.slice(4);
        const groups: string[] = [];
        for (let i = 0; i < rest.length; i += 2) {
            groups.push(rest.slice(i, i + 2));
        }
        return `(${area})${groups.length ? " " + groups.join(" ") : ""}`;
    };

    useEffect(() => {
        let mounted = true;

        async function fetchCounts() {
            const { data, error } = await supabase
                .from("appointments")
                .select("appointment_date, status");

            if (error || !data) {
                console.error("Error fetching appointment counts:", error);
                return;
            }

            const today = new Date().toISOString().split("T")[0];
            let t = 0;
            let u = 0;
            let p = 0;

            for (const apt of data) {
                const date = apt.appointment_date;
                const status = apt.status;
                if (date === today && status !== "cancelled") t++;
                if (date >= today && status === "pending") u++;
                if (date === today && status === "pending") p++;
            }

            if (!mounted) return;
            setTodayCount(t);
            setUpcomingCount(u);
            setPendingCheckIn(p);
        }

        fetchCounts();
        return () => {
            mounted = false;
        };
    }, []);

    useEffect(() => {
        let mounted = true;

        async function fetchBarbers() {
            const { data, error } = await supabase
                .from("barbers")
                .select("id, name");

            if (error || !data) {
                console.error("Error fetching barbers:", error);
                return;
            }

            if (!mounted) return;
            setBarbers(data);
        }

        fetchBarbers();
        // fetch services as well
        async function fetchServices() {
            const { data, error } = await supabase
                .from("services")
                .select("id, name, price");
            if (!error && data && mounted) setServices(data);
        }
        fetchServices();
        return () => {
            mounted = false;
        };
    }, []);

    // Fetch appointments for the currently selected date
    useEffect(() => {
        let mounted = true;

        async function fetchAppointmentsForDate() {
            try {
                // eslint-disable-next-line no-console
                console.log("fetchAppointmentsForDate", {
                    selectedDate,
                    showUpcoming,
                });
                let query = supabase
                    .from("appointments")
                    .select("*")
                    .order("appointment_date", { ascending: true })
                    .order("appointment_time", { ascending: true });

                // apply barber filter when a specific barber is selected
                if (selectedBarber && selectedBarber !== "all") {
                    query = query.eq("barber_id", selectedBarber);
                }
                // apply status filter when a specific status is selected
                if (selectedStatus && selectedStatus !== "all") {
                    query = query.eq("status", selectedStatus);
                }

                if (showUpcoming) {
                    query = query
                        .gte("appointment_date", selectedDate)
                        .limit(1000);
                } else {
                    query = query.eq("appointment_date", selectedDate);
                }

                const { data, error } = await query;
                // eslint-disable-next-line no-console
                console.log("appointments query result", {
                    count: Array.isArray(data) ? data.length : 0,
                    error,
                });

                if (error) {
                    console.error(
                        "Error fetching today's appointments:",
                        error
                    );
                    return;
                }

                if (!mounted) return;
                setTodaysAppointments(data || []);
            } catch (err) {
                console.error(
                    "Unexpected error fetching today's appointments:",
                    err
                );
            }
        }

        fetchAppointmentsForDate();
        // refresh every 60 seconds while on the page
        const id = setInterval(fetchAppointmentsForDate, 60_000);
        return () => {
            mounted = false;
            clearInterval(id);
        };
    }, [selectedDate, showUpcoming, selectedBarber, selectedStatus]);

    // Date navigation helpers
    const addDaysToISO = (isoDate: string, days: number) => {
        // robust ISO date arithmetic that avoids timezone shifts
        const parts = isoDate.split("-").map((p) => Number(p));
        if (parts.length === 3 && parts.every((n) => !Number.isNaN(n))) {
            const [y, m, d] = parts;
            const dt = new Date(y, m - 1, d + days);
            const yyyy = dt.getFullYear();
            const mm = String(dt.getMonth() + 1).padStart(2, "0");
            const dd = String(dt.getDate()).padStart(2, "0");
            return `${yyyy}-${mm}-${dd}`;
        }
        // fallback to Date parsing if input isn't a simple yyyy-mm-dd
        const fallback = new Date(isoDate + "T00:00:00");
        fallback.setDate(fallback.getDate() + days);
        return fallback.toISOString().split("T")[0];
    };

    const handlePrevDay = () =>
        setSelectedDate((prev) => {
            // eslint-disable-next-line no-console
            console.log("handlePrevDay prev:", prev);
            const next = addDaysToISO(prev, -1);
            // eslint-disable-next-line no-console
            console.log("handlePrevDay next:", next);
            return next;
        });
    const handleNextDay = () =>
        setSelectedDate((prev) => {
            // eslint-disable-next-line no-console
            console.log("handleNextDay prev:", prev);
            const next = addDaysToISO(prev, 1);
            // eslint-disable-next-line no-console
            console.log("handleNextDay next:", next);
            return next;
        });
    // Toolbar click logger for debugging event targets
    const handleToolbarClick = (e: React.MouseEvent<HTMLDivElement>) => {
        // eslint-disable-next-line no-console
        console.log(
            "toolbar click",
            "target:",
            (e.target as HTMLElement)?.tagName,
            "class:",
            (e.target as HTMLElement)?.className,
            "selectedDate:",
            selectedDate
        );
    };
    // keyboard navigation for debugging / accessibility
    React.useEffect(() => {
        const onKey = (ev: KeyboardEvent) => {
            if (ev.key === "ArrowLeft") handlePrevDay();
            if (ev.key === "ArrowRight") handleNextDay();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    // Log when selectedDate actually changes
    React.useEffect(() => {
        // eslint-disable-next-line no-console
        console.log("selectedDate changed ->", selectedDate);
    }, [selectedDate]);
    // Close status menu when clicking outside (use capture to be robust)
    React.useEffect(() => {
        if (!statusMenuOpenFor && !barberMenuOpen && !toolbarStatusOpen) return;
        const handler = (e: Event) => {
            const tgt = e.target as Element | null;
            if (!tgt) return;
            if (statusMenuOpenFor) {
                const menuSel = `[data-status-menu="apt-${statusMenuOpenFor}"]`;
                const toggleSel = `[data-status-toggle="apt-${statusMenuOpenFor}"]`;
                if (tgt.closest(menuSel) || tgt.closest(toggleSel)) return;
                setStatusMenuOpenFor(null);
                setStatusMenuPos(null);
            }
            if (barberMenuOpen) {
                const bMenuSel = `[data-barber-menu="barber-filter"]`;
                const bToggleSel = `[data-barber-toggle="barber-filter"]`;
                if (tgt.closest(bMenuSel) || tgt.closest(bToggleSel)) return;
                setBarberMenuOpen(false);
                setBarberMenuPos(null);
            }
            if (toolbarStatusOpen) {
                const tsMenuSel = `[data-toolbar-status-menu="toolbar-status"]`;
                const tsToggleSel = `[data-toolbar-status-toggle="toolbar-status"]`;
                if (tgt.closest(tsMenuSel) || tgt.closest(tsToggleSel)) return;
                setToolbarStatusOpen(false);
                setToolbarStatusPos(null);
            }
        };
        document.addEventListener("click", handler);
        return () => document.removeEventListener("click", handler);
    }, [statusMenuOpenFor, barberMenuOpen, toolbarStatusOpen]);
    const handleSetToday = () => {
        const today = new Date().toISOString().split("T")[0];
        // If we're in upcoming mode, override it and show today's appointments.
        if (showUpcoming) {
            setShowUpcoming(false);
            setPrevSelectedDate(null);
            setSelectedDate(today);
            return;
        }
        setSelectedDate(today);
    };

    // Combined small-screen day nav click handler:
    const handleDayNavCombinedClick = (
        e: React.MouseEvent<HTMLButtonElement>
    ) => {
        const btn = e.currentTarget;
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left;
        // left 40% = prev, right 40% = next, middle = set today
        if (x < rect.width * 0.4) {
            handlePrevDay();
        } else if (x > rect.width * 0.6) {
            handleNextDay();
        } else {
            handleSetToday();
        }
    };

    const formatDayLabel = (isoDate: string) => {
        // compute day difference in UTC to avoid timezone shifts
        const parseISO = (s: string) => {
            const parts = s.split("-").map((p) => Number(p));
            if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
                return null;
            }
            return Date.UTC(parts[0], parts[1] - 1, parts[2]);
        };
        const isoUTC = parseISO(isoDate);
        const now = new Date();
        const todayUTC = Date.UTC(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
        );
        if (isoUTC == null) {
            return isoDate;
        }
        const diff = Math.round((isoUTC - todayUTC) / (24 * 60 * 60 * 1000));
        if (diff === 0) return "Today";
        if (diff === -1) return "Yesterday";
        if (diff === 1) return "Tomorrow";
        // otherwise show long month name like "November 16"
        const d = new Date(isoDate + "T00:00:00");
        return d.toLocaleDateString(undefined, {
            month: "long",
            day: "numeric",
        });
    };

    const getServiceLabel = (apt: any) => {
        // prefer explicit service text, then service_name, then lookup by service_id
        if (apt.service && String(apt.service).trim() !== "")
            return apt.service;
        if (apt.service_name && String(apt.service_name).trim() !== "")
            return apt.service_name;
        if (apt.service_id) {
            const s = services.find(
                (sv) => String(sv.id) === String(apt.service_id)
            );
            if (s && s.name) return s.name;
        }
        return "Service not specified";
    };

    return (
        <div className="p-6 min-h-screen">
            {showNewBooking && (
                <div
                    role="dialog"
                    aria-modal="true"
                    className="fixed inset-0 z-50 flex items-start justify-center"
                    style={{ paddingTop: 56 }}>
                    <div
                        className="fixed inset-0"
                        onClick={() => setShowNewBooking(false)}
                        style={{
                            position: "fixed",
                            inset: 0,
                            background: "rgba(0,0,0,0.6)",
                            zIndex: 2147483600,
                            backdropFilter: "blur(4px)",
                            WebkitBackdropFilter: "blur(4px)",
                        }}
                    />
                    <div
                        className="bg-white rounded-lg shadow-lg"
                        style={{
                            backgroundColor: "#ffffff",
                            width: "1000px",
                            maxWidth: "95%",
                            maxHeight: "82vh",
                            display: "flex",
                            flexDirection: "column",
                            overflow: "hidden",
                            zIndex: 2147483601,
                        }}
                        onClick={(e) => e.stopPropagation()}>
                        <div
                            style={{
                                padding: "20px 24px",
                                borderBottom: "1px solid #E5E7EB",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                            }}>
                            <h2
                                style={{
                                    margin: 0,
                                    fontSize: 22,
                                    fontWeight: 600,
                                }}>
                                New Appointment
                            </h2>
                            <button
                                aria-label="Close"
                                onClick={() => setShowNewBooking(false)}
                                style={{
                                    border: "none",
                                    background: "transparent",
                                    fontSize: 28,
                                    fontWeight: 200,
                                    lineHeight: 1,
                                    padding: "6px 10px",
                                    cursor: "pointer",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}>
                                ×
                            </button>
                        </div>
                        <div
                            style={{
                                padding: 20,
                                flex: "1 1 auto",
                                overflow: "auto",
                            }}>
                            <BookingFlow
                                appointmentId={newBookingInitialId || undefined}
                                hideHeader={true}
                                onClose={() => setShowNewBooking(false)}
                            />
                        </div>
                    </div>
                </div>
            )}
            {/* Appointment Details Modal */}
            {detailsOpen && selectedAppointment ? (
                <div
                    role="dialog"
                    aria-modal="true"
                    className="fixed inset-0 z-50 flex items-start justify-center"
                    style={{ paddingTop: 56 }}>
                    <div
                        className="fixed inset-0"
                        onClick={() => closeDetails()}
                        style={{
                            position: "fixed",
                            inset: 0,
                            background: "rgba(0,0,0,0.6)",
                            zIndex: 2147483600,
                            backdropFilter: "blur(4px)",
                            WebkitBackdropFilter: "blur(4px)",
                        }}
                    />
                    <div
                        className="bg-white rounded-lg shadow-lg"
                        style={{
                            backgroundColor: "#ffffff",
                            width: "760px",
                            maxWidth: "95%",
                            maxHeight: "80vh",
                            display: "flex",
                            flexDirection: "column",
                            overflow: "hidden",
                            zIndex: 2147483601,
                        }}
                        onClick={(e) => e.stopPropagation()}>
                        <div
                            style={{
                                padding: "20px 24px",
                                borderBottom: "1px solid #E5E7EB",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                            }}>
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 12,
                                }}>
                                <h2
                                    ref={appointmentTitleRef}
                                    className="appointment-title"
                                    style={{
                                        marginTop: 0,
                                        marginRight: 0,
                                        marginBottom: 0,
                                        marginLeft: isSmallScreenTitleMargin
                                            ? 20
                                            : undefined,
                                        fontSize: 22,
                                        fontWeight: 600,
                                    }}>
                                    {!showAppointmentId ? (
                                        <span
                                            role="button"
                                            tabIndex={0}
                                            onClick={() =>
                                                setShowAppointmentId((v) => !v)
                                            }
                                            onKeyDown={(
                                                e: React.KeyboardEvent
                                            ) => {
                                                if (
                                                    e.key === "Enter" ||
                                                    e.key === " "
                                                ) {
                                                    e.preventDefault();
                                                    setShowAppointmentId(
                                                        (v) => !v
                                                    );
                                                }
                                            }}
                                            style={{
                                                cursor: "pointer",
                                                display: "inline-block",
                                            }}>
                                            Appointment
                                        </span>
                                    ) : (
                                        <span
                                            role="button"
                                            tabIndex={0}
                                            onClick={() =>
                                                setShowAppointmentId((v) => !v)
                                            }
                                            onKeyDown={(
                                                e: React.KeyboardEvent
                                            ) => {
                                                if (
                                                    e.key === "Enter" ||
                                                    e.key === " "
                                                ) {
                                                    e.preventDefault();
                                                    setShowAppointmentId(
                                                        (v) => !v
                                                    );
                                                }
                                            }}
                                            style={{
                                                cursor: "pointer",
                                                display: "inline-block",
                                            }}>
                                            #
                                            {String(
                                                selectedAppointment.id
                                            ).slice(0, 8)}
                                        </span>
                                    )}
                                </h2>
                                <span
                                    style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: 8,
                                        height: 28,
                                        lineHeight: "28px",
                                        padding: "0 8px",
                                        borderRadius: 6,
                                        fontSize: 14,
                                        fontWeight: 500,
                                        border: `1px solid ${
                                            getStatusStyles(
                                                selectedAppointment.status
                                            ).borderColor
                                        }`,
                                        backgroundColor: getStatusStyles(
                                            selectedAppointment.status
                                        ).backgroundColor,
                                        color: getStatusStyles(
                                            selectedAppointment.status
                                        ).color,
                                    }}>
                                    {formatStatusLabel(
                                        selectedAppointment.status
                                    )}
                                </span>
                            </div>
                            <button
                                aria-label="Close"
                                onClick={() => closeDetails()}
                                style={{
                                    border: "none",
                                    background: "transparent",
                                    fontSize: 28,
                                    fontWeight: 200,
                                    lineHeight: 1,
                                    padding: "6px 10px",
                                    cursor: "pointer",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}>
                                ×
                            </button>
                        </div>
                        <div
                            style={{
                                padding: 20,
                                flex: "1 1 auto",
                                overflow: "auto",
                            }}>
                            <div style={{ display: "flex", gap: 16 }}>
                                <div
                                    className="appointment-avatar"
                                    style={{
                                        width: 64,
                                        height: 64,
                                        borderRadius: 32,
                                        background: "#F3F4F6",
                                        flexShrink: 0,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                    }}>
                                    <span
                                        style={{
                                            fontSize: 20,
                                            fontWeight: 600,
                                            color: "#374151",
                                        }}>
                                        {(() => {
                                            const n =
                                                selectedAppointment.customer_name ||
                                                selectedAppointment.name ||
                                                selectedAppointment.customer ||
                                                "";
                                            const parts = String(n)
                                                .trim()
                                                .split(/\s+/)
                                                .filter(Boolean);
                                            if (parts.length === 0) return "";
                                            if (parts.length === 1)
                                                return parts[0]
                                                    .slice(0, 2)
                                                    .toUpperCase();
                                            return (
                                                (parts[0][0] || "") +
                                                (parts[1][0] || "")
                                            ).toUpperCase();
                                        })()}
                                    </span>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div
                                        style={{
                                            fontSize: 18,
                                            fontWeight: 600,
                                        }}>
                                        {selectedAppointment.customer_name ||
                                            selectedAppointment.name ||
                                            "Unknown"}
                                    </div>
                                    <div
                                        className="appointment-contact"
                                        style={{
                                            marginTop: 8,
                                            color: "#6B7280",
                                            display: "flex",
                                            flexDirection: "row",
                                            gap: 16,
                                            alignItems: "center",
                                            flexWrap: "wrap",
                                        }}>
                                        {(() => {
                                            const phone =
                                                getContactPhone(
                                                    selectedAppointment
                                                );
                                            const email =
                                                getContactEmail(
                                                    selectedAppointment
                                                );
                                            return (
                                                <>
                                                    {phone ? (
                                                        <div
                                                            style={{
                                                                display: "flex",
                                                                alignItems:
                                                                    "center",
                                                                gap: 8,
                                                                color: "#6B7280",
                                                            }}>
                                                            <Phone
                                                                size={17}
                                                                color="#6B7280"
                                                            />
                                                            <a
                                                                href={`tel:${String(
                                                                    phone
                                                                ).replace(
                                                                    /\D/g,
                                                                    ""
                                                                )}`}
                                                                style={{
                                                                    color: "#6B7280",
                                                                    textDecoration:
                                                                        "underline",
                                                                    textDecorationThickness:
                                                                        "1.2px",
                                                                    textUnderlineOffset:
                                                                        "1.5px",
                                                                }}>
                                                                {formatPhoneForDisplay(
                                                                    phone
                                                                )}
                                                            </a>
                                                        </div>
                                                    ) : null}
                                                    {email ? (
                                                        <div
                                                            style={{
                                                                display: "flex",
                                                                alignItems:
                                                                    "center",
                                                                gap: 8,
                                                                color: "#6B7280",
                                                            }}>
                                                            <Mail
                                                                size={17}
                                                                color="#6B7280"
                                                            />
                                                            <a
                                                                href={`mailto:${email}`}
                                                                style={{
                                                                    color: "#6B7280",
                                                                    textDecoration:
                                                                        "underline",
                                                                    textDecorationThickness:
                                                                        "1.2px",
                                                                    textUnderlineOffset:
                                                                        "1.5px",
                                                                }}>
                                                                {email}
                                                            </a>
                                                        </div>
                                                    ) : null}
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </div>
                            <div
                                style={{
                                    height: 1.2,
                                    backgroundColor: "#E5E7EB",
                                    marginTop: 20,
                                    marginBottom: 12,
                                    marginLeft: -20,
                                    marginRight: -20,
                                }}
                            />

                            <div
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: "1fr 1fr",
                                    columnGap: 30,
                                    rowGap: 20,
                                    marginTop: 20,
                                }}>
                                <div>
                                    <div
                                        style={{
                                            fontSize: 13,
                                            color: "#6B7280",
                                            fontWeight: 400,
                                        }}>
                                        Date & Time
                                    </div>
                                    <div
                                        style={{
                                            marginTop: 8,
                                            fontWeight: 500,
                                        }}>
                                        {new Date(
                                            (selectedAppointment.appointment_date ||
                                                selectedDate) +
                                                "T" +
                                                (selectedAppointment.appointment_time ||
                                                    selectedAppointment.time ||
                                                    selectedAppointment.start_time ||
                                                    "00:00:00")
                                        ).toLocaleString(undefined, {
                                            weekday: "long",
                                            month: "long",
                                            day: "numeric",
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        })}
                                    </div>
                                </div>
                                <div>
                                    <div
                                        style={{
                                            fontSize: 13,
                                            color: "#6B7280",
                                            fontWeight: 400,
                                        }}>
                                        Assigned Barber
                                    </div>
                                    <div
                                        style={{
                                            marginTop: 8,
                                            fontWeight: 500,
                                        }}>
                                        {barbers.find(
                                            (b) =>
                                                String(b.id) ===
                                                String(
                                                    selectedAppointment.barber_id
                                                )
                                        )?.name || "Unassigned"}
                                    </div>
                                </div>
                                <div>
                                    <div
                                        style={{
                                            fontSize: 13,
                                            color: "#6B7280",
                                            fontWeight: 400,
                                            marginTop: 8,
                                        }}>
                                        Services
                                    </div>
                                    <div
                                        style={{
                                            marginTop: 8,
                                            fontWeight: 500,
                                        }}>
                                        {getServiceLabel(selectedAppointment)}
                                    </div>
                                </div>
                                <div>
                                    <div
                                        style={{
                                            fontSize: 13,
                                            color: "#6B7280",
                                            fontWeight: 400,
                                            marginTop: 8,
                                        }}>
                                        Total
                                    </div>
                                    <div
                                        style={{
                                            marginTop: 8,
                                            fontSize: 18,
                                            fontWeight: 600,
                                        }}>
                                        {(() => {
                                            const t =
                                                getAppointmentTotal(
                                                    selectedAppointment
                                                );
                                            return t != null
                                                ? `$${t.toFixed(2)}`
                                                : "$0.00";
                                        })()}
                                    </div>
                                </div>
                            </div>

                            <div style={{ marginTop: 24 }}>
                                <div
                                    style={{
                                        fontSize: 16,
                                        color: "#6B7280",
                                        fontWeight: 600,
                                    }}>
                                    Message
                                </div>
                                <div
                                    className={
                                        selectedAppointment.message
                                            ? "appointment-message"
                                            : undefined
                                    }
                                    style={{
                                        marginTop: 8,
                                        color: "#374151",
                                        whiteSpace: "pre-wrap",
                                    }}>
                                    {selectedAppointment.message || (
                                        <span style={{ color: "#9CA3AF" }}>
                                            No message provided
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div
                            className="appointment-modal-footer"
                            style={{
                                padding: 24,
                                borderTop: "1px solid #E0E1E2",
                                display: "flex",
                                gap: 12,
                                justifyContent: "flex-end",
                                backgroundColor: "rgba(236, 238, 242, 0.48)",
                            }}>
                            {deleteConfirmOpen ? (
                                <div
                                    className="delete-confirm"
                                    style={{
                                        display: "flex",
                                        gap: 8,
                                        alignItems: "center",
                                        justifyContent: "flex-end",
                                        width: "100%",
                                    }}>
                                    <div
                                        style={{
                                            flex: 1,
                                            color: "#DC2626",
                                            fontWeight: 500,
                                        }}>
                                        Are you sure you want to permanently
                                        delete this appointment? This action
                                        cannot be undone.
                                    </div>
                                    <div style={{ display: "flex", gap: 8 }}>
                                        <button
                                            className="btn"
                                            style={{
                                                background: "#DC2626",
                                                border: "1px solid #DC2626",
                                                color: "#fff",
                                                padding: "8px 16px",
                                                fontWeight: 500,
                                                whiteSpace: "nowrap",
                                                borderRadius: 8,
                                                cursor: "pointer",
                                            }}
                                            onMouseEnter={(e) => {
                                                const t =
                                                    e.currentTarget as HTMLButtonElement;
                                                t.style.backgroundColor =
                                                    "#b91c1c";
                                                t.style.border =
                                                    "1px solid #b91c1c";
                                            }}
                                            onMouseLeave={(e) => {
                                                const t =
                                                    e.currentTarget as HTMLButtonElement;
                                                t.style.backgroundColor =
                                                    "#DC2626";
                                                t.style.border =
                                                    "1px solid #DC2626";
                                            }}
                                            onClick={async () => {
                                                if (!selectedAppointment)
                                                    return;
                                                await handleDeleteAppointment(
                                                    selectedAppointment.id
                                                );
                                            }}>
                                            Confirm Delete
                                        </button>
                                        <button
                                            className="btn"
                                            style={{
                                                background:
                                                    "rgb(255, 255, 255)",
                                                border: "1px solid #E5E7EB",
                                                color: "#374151",
                                                padding: "8px 16px",
                                                fontWeight: 500,
                                                whiteSpace: "nowrap",
                                                borderRadius: 8,
                                                cursor: "pointer",
                                            }}
                                            onMouseEnter={(e) => {
                                                const t =
                                                    e.currentTarget as HTMLButtonElement;
                                                t.style.backgroundColor =
                                                    "#F3F4F6";
                                                t.style.border =
                                                    "1px solid #D1D5DB";
                                            }}
                                            onMouseLeave={(e) => {
                                                const t =
                                                    e.currentTarget as HTMLButtonElement;
                                                t.style.backgroundColor =
                                                    "rgb(255, 255, 255)";
                                                t.style.border =
                                                    "1px solid #E5E7EB";
                                            }}
                                            onClick={() =>
                                                setDeleteConfirmOpen(false)
                                            }>
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <button
                                        className="btn"
                                        style={{
                                            background: " #FEF2F2",
                                            border: "1px solid #FBCACA",
                                            color: "rgb(178, 56, 56)",
                                            padding: "8px 16px",
                                            fontWeight: 500,
                                            whiteSpace: "nowrap",
                                            borderRadius: 8,
                                            cursor: "pointer",
                                        }}
                                        onMouseEnter={(e) => {
                                            const t =
                                                e.currentTarget as HTMLButtonElement;
                                            t.style.backgroundColor = "#FDE8E8";
                                            t.style.border =
                                                "1px solid #F3C2C2";
                                        }}
                                        onMouseLeave={(e) => {
                                            const t =
                                                e.currentTarget as HTMLButtonElement;
                                            t.style.backgroundColor = "#FEF2F2";
                                            t.style.border =
                                                "1px solid #FBCACA";
                                        }}
                                        onClick={async () => {
                                            if (!selectedAppointment) return;
                                            if (
                                                selectedAppointment.status ===
                                                "cancelled"
                                            ) {
                                                setDeleteConfirmOpen(true);
                                            } else {
                                                await handleChangeStatus(
                                                    selectedAppointment.id,
                                                    "cancelled"
                                                );
                                                closeDetails();
                                            }
                                        }}>
                                        {selectedAppointment.status ===
                                        "cancelled"
                                            ? "Delete Appointment"
                                            : "Cancel Appointment"}
                                    </button>
                                    <button
                                        className="btn"
                                        style={{
                                            background: "#F3F4F6",
                                            border: "1px solid #E5E7EB",
                                            color: "#374151",
                                            padding: "8px 16px",
                                            fontWeight: 500,
                                            whiteSpace: "nowrap",
                                            borderRadius: 8,
                                            cursor: "pointer",
                                        }}
                                        onMouseEnter={(e) => {
                                            const t =
                                                e.currentTarget as HTMLButtonElement;
                                            t.style.backgroundColor = "#ECEFF1";
                                            t.style.border =
                                                "1px solid #D1D5DB";
                                        }}
                                        onMouseLeave={(e) => {
                                            const t =
                                                e.currentTarget as HTMLButtonElement;
                                            t.style.backgroundColor = "#F3F4F6";
                                            t.style.border =
                                                "1px solid #E5E7EB";
                                        }}
                                        onClick={() => {
                                            // open booking flow modal prefilled for reschedule
                                            if (!selectedAppointment) return;
                                            setDetailsOpen(false);
                                            setNewBookingInitialId(
                                                String(selectedAppointment.id)
                                            );
                                            setShowNewBooking(true);
                                        }}>
                                        Reschedule
                                    </button>
                                    <button
                                        className="btn"
                                        style={{
                                            background: "#2563EB",
                                            border: "1px solid #2563EB",
                                            color: "#fff",
                                            padding: "8px 16px",
                                            fontWeight: 500,
                                            whiteSpace: "nowrap",
                                            borderRadius: 8,
                                            cursor: "pointer",
                                        }}
                                        onMouseEnter={(e) => {
                                            const t =
                                                e.currentTarget as HTMLButtonElement;
                                            t.style.backgroundColor = "#1F4ED8";
                                            t.style.border =
                                                "1px solid #1F4ED8";
                                        }}
                                        onMouseLeave={(e) => {
                                            const t =
                                                e.currentTarget as HTMLButtonElement;
                                            t.style.backgroundColor = "#2563EB";
                                            t.style.border =
                                                "1px solid #2563EB";
                                        }}
                                        onClick={() => {
                                            if (!selectedAppointment) return;
                                            setDetailsOpen(false);
                                            setNewBookingInitialId(
                                                String(selectedAppointment.id)
                                            );
                                            setShowNewBooking(true);
                                        }}>
                                        Edit Appointment
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            ) : null}
            <div className="mb-6 flex items-center justify-between">
                <style>{`
                    @media (max-width: 420px) {
                        .admin-primary-btn .btn-text-full,
                        .admin-primary-btn .btn-text-short {
                            display: none !important;
                        }
                        .admin-primary-btn {
                            padding: 0 !important;
                            min-width: 40px !important;
                            width: 40px !important;
                            height: 40px !important;
                            display: inline-flex !important;
                            align-items: center !important;
                            justify-content: center !important;
                        }
                        /* force svg to center and ignore margin utility like mr-2 */
                        .admin-primary-btn > svg,
                        .admin-primary-btn svg {
                            margin-left: auto !important;
                            margin-right: auto !important;
                            width: 20px !important;
                            height: 20px !important;
                            transform: scale(1.25);
                            display: block;
                        }
                    }
                `}</style>
                <div>
                    <h2 className="text-3xl font-bold text-gray-900">
                        Appointments
                    </h2>
                </div>
                <Button
                    className="admin-primary-btn h-10 px-4 rounded-md outline-none focus:outline-none appointments-new-btn"
                    onClick={() => {
                        setNewBookingInitialId(null);
                        setShowNewBooking(true);
                    }}>
                    <Plus className="h-4 w-4 mr-2" />
                    <span className="btn-text-full">New Appointment</span>
                    <span className="btn-text-short">New</span>
                </Button>
            </div>

            <div
                className="service-stats appointments-stats"
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

            {/* Toolbar */}
            <div className="mb-6">
                <style>{`
                    /* Default: show full labels, hide short variants */
                    .select-date-full { display: inline !important; }
                    .select-date-short { display: none !important; }
                    .upcoming-full { display: inline !important; }
                    .upcoming-short { display: none !important; }
                    /* Reduce font weight for the day label to make it less bold */
                    .appointments-toolbar .date-label .text-sm {
                        font-weight: 500 !important;
                    }
                    .appointments-toolbar .date-label .text-xs {
                        font-weight: 400 !important;
                    }

                    @media (max-width: 1150px) {
                        .appointments-toolbar {
                            grid-template-columns: 1fr !important;
                            grid-auto-rows: auto !important;
                            gap: 8px !important;
                            column-gap: 8px !important;
                        }
                        /* hide the thin separator line and stack the search row */
                        .appointments-toolbar > :nth-child(2) {
                            display: none !important;
                        }
                        /* make the left controls stay on the first row */
                        .appointments-toolbar > :nth-child(1) {
                            grid-column: 1 !important;
                        }
                        /* place the search+filters on the second row */
                        .appointments-toolbar > :nth-child(3) {
                            grid-column: 1 !important;
                            margin-top: 0 !important;
                        }
                        /* ensure select triggers and search shrink appropriately */
                        .appointments-toolbar .fixed-select-trigger,
                        .appointments-toolbar .status-select-trigger {
                            min-width: 100px !important;
                            width: auto !important;
                        }
                        .appointments-toolbar .relative {
                            width: 100% !important;
                        }
                        /* Keep the Today button from shrinking on small screens */
                        .appointments-toolbar .admin-primary-btn {
                            flex: 0 0 auto !important;
                            min-width: 88px !important;
                            white-space: nowrap !important;
                            height: 48px !important;
                            min-height: 48px !important;
                            padding-top: 0.5rem !important;
                            padding-bottom: 0.5rem !important;
                            display: inline-flex !important;
                            align-items: center !important;
                            justify-content: center !important;
                            line-height: 1 !important;
                        }
                    }

                    @media (max-width: 680px) {
                        .select-date-full { display: none !important; }
                        .select-date-short { display: inline !important; }
                    }

                    @media (max-width: 630px) {
                        .upcoming-full { display: none !important; }
                        .upcoming-short { display: inline !important; }
                    }
                    
                    @media (max-width: 430px) {
                        /* combine the day navigation into a single button on very small screens */
                        .left-chevron,
                        .date-label,
                        .right-chevron {
                            display: none !important;
                        }
                        .day-nav-combined {
                            display: inline-flex !important;
                            align-items: center !important;
                            justify-content: center !important;
                            gap: 0.5rem !important;
                            height: 48px !important;
                            width: 150px !important;
                            min-width: 150px !important;
                            max-width: 150px !important;
                            padding: 0 0.75rem !important;
                            box-sizing: border-box !important;
                            border-radius: 0.5rem !important;
                            border: 1px solid #E5E7EB !important;
                            background-color: #ffffff !important;
                        }
                        /* Fix arrow/icon positions inside the combined button */
                        .day-nav-combined {
                            position: relative !important;
                        }
                        .day-nav-combined svg:first-child {
                            position: absolute !important;
                            left: 12px !important;
                        }
                        .day-nav-combined svg:last-child {
                            position: absolute !important;
                            right: 12px !important;
                        }
                        .day-nav-combined .day-label {
                            display: inline-block !important;
                            text-align: center !important;
                            width: 100% !important;
                            padding: 0 18px !important;
                        }
                        .day-nav-combined svg {
                            width: 18px !important;
                            height: 18px !important;
                        }
                        .day-nav-combined .day-label {
                            font-weight: 500 !important;
                        }
                        /* Make Today button width variable on very small screens */
                        .appointments-toolbar .admin-primary-btn {
                            min-width: 64px !important;
                            width: clamp(64px, 20vw, 140px) !important;
                            padding-left: 0.5rem !important;
                            padding-right: 0.5rem !important;
                        }
                        /* For very small screens, split the third area: search row + filters row */
                        .appointments-toolbar > :nth-child(3) {
                            display: block !important;
                        }
                        .appointments-toolbar .filters-row {
                            display: flex !important;
                            gap: 8px !important;
                            margin-top: 8px !important;
                            justify-content: flex-start !important;
                        }
                        .appointments-toolbar .filters-row .flex-none {
                            flex: 0 0 auto !important;
                            width: auto !important;
                        }
                        /* ensure search area takes full width above filters */
                        .appointments-toolbar .flex-auto {
                            width: 100% !important;
                        }
                    }

                    @media (max-width: 545px) {
                        /* completely hide the upcoming button on very small screens */
                        .upcoming-btn { display: none !important; }
                    }
                    /* Modal footer responsive layout */
                    @media (max-width: 600px) {
                        .appointment-modal-footer {
                            flex-direction: column !important;
                            align-items: stretch !important;
                            gap: 12px !important;
                        }
                        .appointment-modal-footer .btn {
                            width: 100% !important;
                            display: block !important;
                        }
                        /* swap Cancel (1) and Edit (3) buttons order on small screens */
                        .appointment-modal-footer .btn:nth-child(1) {
                            order: 2 !important;
                        }
                        .appointment-modal-footer .btn:nth-child(2) {
                            order: 3 !important;
                        }
                        .appointment-modal-footer .btn:nth-child(3) {
                            order: 1 !important;
                        }
                    }
                `}</style>
                <div
                    className="w-full appointments-toolbar"
                    style={{
                        display: "grid",
                        gridTemplateColumns: "auto 1fr auto",
                        alignItems: "center",
                        gap: 12,
                        columnGap: 12,
                    }}>
                    <div className="flex items-center gap-2 flex-none">
                        <Button
                            variant="outline"
                            className="h-12 w-12 flex items-center justify-center border border-gray-300 bg-white hover:bg-gray-100 hover:border-gray-400 transition-colors cursor-pointer text-gray-900 hover:text-gray-900 left-chevron"
                            style={{ backgroundColor: "#ffffff", zIndex: 20 }}
                            onClick={handlePrevDay}
                            onMouseEnter={(e) => {
                                (
                                    e.currentTarget as HTMLButtonElement
                                ).style.backgroundColor = "#F9FAFB";
                                (
                                    e.currentTarget as HTMLButtonElement
                                ).style.boxShadow = "none";
                            }}
                            onMouseLeave={(e) => {
                                (
                                    e.currentTarget as HTMLButtonElement
                                ).style.backgroundColor = "#ffffff";
                                (
                                    e.currentTarget as HTMLButtonElement
                                ).style.boxShadow = "none";
                            }}>
                            <ChevronLeft
                                className="h-4 w-4"
                                onClick={handlePrevDay}
                            />
                        </Button>
                        <div
                            className="flex-none px-3 py-2 text-center overflow-hidden date-label"
                            style={{
                                width: 90,
                                minWidth: 90,
                                maxWidth: 90,
                            }}>
                            <div
                                className="text-sm text-gray-600"
                                style={{ fontWeight: 500 }}>
                                {new Date(
                                    selectedDate + "T00:00:00"
                                ).toLocaleDateString(undefined, {
                                    month: "short",
                                    day: "numeric",
                                })}
                            </div>
                            <div className="text-xs text-gray-500">
                                {new Date(
                                    selectedDate + "T00:00:00"
                                ).toLocaleDateString(undefined, {
                                    weekday: "long",
                                })}
                            </div>
                        </div>
                        <Button
                            variant="outline"
                            className="h-12 w-12 flex items-center justify-center border border-gray-300 bg-white hover:bg-gray-100 hover:border-gray-400 transition-colors cursor-pointer text-gray-900 hover:text-gray-900 right-chevron"
                            style={{ backgroundColor: "#ffffff", zIndex: 20 }}
                            onClick={handleNextDay}
                            onMouseEnter={(e) => {
                                (
                                    e.currentTarget as HTMLButtonElement
                                ).style.backgroundColor = "#F9FAFB";
                                (
                                    e.currentTarget as HTMLButtonElement
                                ).style.boxShadow = "none";
                            }}
                            onMouseLeave={(e) => {
                                (
                                    e.currentTarget as HTMLButtonElement
                                ).style.backgroundColor = "#ffffff";
                                (
                                    e.currentTarget as HTMLButtonElement
                                ).style.boxShadow = "none";
                            }}>
                            <ChevronRight
                                className="h-4 w-4"
                                onClick={handleNextDay}
                            />
                        </Button>
                        {/* Combined nav for very small screens */}
                        <Button
                            variant="outline"
                            className="day-nav-combined"
                            style={{ display: "none" }}
                            onClick={handleDayNavCombinedClick}
                            aria-label="Day navigation (small screens)">
                            <ChevronLeft className="h-4 w-4" />
                            <span className="day-label">
                                {formatDayLabel(selectedDate)}
                            </span>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Button
                            className="admin-primary-btn h-12 px-4 rounded-md text-white"
                            style={{
                                backgroundColor: "#1D4ED8",
                                borderColor: "#1D4ED8",
                            }}
                            onClick={handleSetToday}
                            onPointerDown={handleSetToday}
                            aria-label="Jump to today">
                            <span
                                style={{
                                    display: "inline-block",
                                    width: "100%",
                                }}>
                                Today
                            </span>
                        </Button>
                        <Button
                            variant="outline"
                            className="h-12 px-3 flex items-center gap-2 border border-gray-300 bg-white hover:bg-gray-100 hover:border-gray-300 transition-colors cursor-pointer text-gray-900 hover:text-gray-900"
                            style={{ backgroundColor: "#ffffff" }}
                            onMouseEnter={(e) => {
                                (
                                    e.currentTarget as HTMLButtonElement
                                ).style.backgroundColor = "#F9FAFB";
                            }}
                            onMouseLeave={(e) => {
                                (
                                    e.currentTarget as HTMLButtonElement
                                ).style.backgroundColor = "#ffffff";
                            }}
                            onClick={() => {
                                setDatePickerSelected(
                                    new Date(selectedDate + "T00:00:00")
                                );
                                setDatePickerOpen((v) => !v);
                            }}>
                            <Calendar className="h-4 w-4" />
                            <span className="select-date-full">
                                Select Date
                            </span>
                            <span className="select-date-short">Date</span>
                        </Button>
                        {datePickerOpen && (
                            <>
                                <div
                                    aria-hidden={true}
                                    style={{
                                        position: "fixed",
                                        inset: 0,
                                        zIndex: 2499,
                                        background: "transparent",
                                    }}
                                    onClick={() => setDatePickerOpen(false)}
                                />
                                <div
                                    ref={datePickerRef}
                                    className="availability-date-picker"
                                    style={{
                                        position: "fixed",
                                        left: "50%",
                                        top: "50%",
                                        transform: "translate(-50%, -50%)",
                                        zIndex: 2500,
                                        background: "#fff",
                                        borderRadius: 8,
                                        boxShadow:
                                            "0 10px 30px rgba(0,0,0,0.12)",
                                        padding: 12,
                                    }}>
                                    <DayPickerCalendar
                                        mode="single"
                                        fixedWeeks
                                        selected={datePickerSelected}
                                        className="availability-calendar"
                                        classNames={{
                                            day: "availability-day",
                                            day_outside: "availability-outside",
                                            day_today: "availability-today",
                                            day_selected:
                                                "availability-selected",
                                        }}
                                        onSelect={(d) => {
                                            if (!d) return;
                                            const y = d.getFullYear();
                                            const m = String(
                                                d.getMonth() + 1
                                            ).padStart(2, "0");
                                            const day = String(
                                                d.getDate()
                                            ).padStart(2, "0");
                                            const iso = `${y}-${m}-${day}`;
                                            setSelectedDate(iso);
                                            // If selecting a date while in Upcoming mode, disable Upcoming
                                            if (showUpcoming) {
                                                setShowUpcoming(false);
                                                setPrevSelectedDate(null);
                                            }
                                            setDatePickerOpen(false);
                                        }}
                                    />
                                </div>
                            </>
                        )}
                        <Button
                            variant={showUpcoming ? undefined : "outline"}
                            className={`h-12 px-3 flex items-center gap-2 border border-gray-300 rounded-md ${
                                showUpcoming
                                    ? "text-white"
                                    : "bg-white hover:bg-gray-100 hover:border-gray-300 text-gray-900 hover:text-gray-900"
                            } upcoming-btn`}
                            style={
                                showUpcoming
                                    ? {
                                          backgroundColor: " #2663EB",
                                          borderColor: " #2663EB",
                                      }
                                    : { backgroundColor: "#ffffff" }
                            }
                            onMouseEnter={(e) => {
                                if (!showUpcoming) {
                                    (
                                        e.currentTarget as HTMLButtonElement
                                    ).style.backgroundColor = " #F9FAFB";
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!showUpcoming) {
                                    (
                                        e.currentTarget as HTMLButtonElement
                                    ).style.backgroundColor = "#ffffff";
                                }
                            }}
                            onClick={() => {
                                // toggle upcoming mode; when enabling, jump to today.
                                // preserve the previously selected date so we can restore it.
                                setShowUpcoming((v) => {
                                    const next = !v;
                                    if (next) {
                                        // enabling upcoming -> save current date and jump to today
                                        setPrevSelectedDate(selectedDate);
                                        const today = new Date()
                                            .toISOString()
                                            .split("T")[0];
                                        setSelectedDate(today);
                                    } else {
                                        // disabling upcoming -> restore previous selected date if available
                                        if (prevSelectedDate) {
                                            setSelectedDate(prevSelectedDate);
                                            setPrevSelectedDate(null);
                                        }
                                    }
                                    return next;
                                });
                            }}>
                            <span className="upcoming-full">
                                Upcoming Appointments
                            </span>
                            <span className="upcoming-short">Upcoming</span>
                        </Button>
                    </div>

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
                                    minWidth: 0,
                                    flex: "1 1 2000px" /* allow the search to grow up to available space */,
                                    maxWidth: "100%",
                                    width: "auto",
                                }}>
                                <style>{`#searchAppointments::placeholder { color:rgb(133, 133, 139) !important; }`}</style>
                                <Search
                                    className="absolute"
                                    style={{
                                        color: "rgb(133,133,139)",
                                        top: "50%",
                                        left: "15px",
                                        transform: "translateY(-50%)",
                                        pointerEvents: "none",
                                    }}
                                    size={16}
                                    strokeWidth={1.9}
                                />
                                <Input
                                    id="searchAppointments"
                                    placeholder="Search by name, phone, or email..."
                                    value={searchTerm}
                                    onChange={(e) =>
                                        setSearchTerm(e.target.value)
                                    }
                                    type="text"
                                    className="pl-10 h-12 w-full text-base text-gray-600 placeholder:text-gray-400 border border-gray-300 rounded-md bg-white hover:bg-gray-100 hover:shadow-sm hover:ring-1 hover:ring-gray-200 transition-colors outline-none focus:outline-none ring-0 focus:ring-0 focus-visible:ring-0 ring-offset-0 focus-visible:ring-offset-0 hover:border-gray-300 focus:border-gray-400"
                                    style={{
                                        backgroundColor: "#ffffff",
                                        color: "#000000",
                                        caretColor: "#000000",
                                        width: "640px",
                                        maxWidth: "100%",
                                    }}
                                    onMouseEnter={(e) => {
                                        (
                                            e.currentTarget as HTMLInputElement
                                        ).style.backgroundColor = "#F9FAFB";
                                    }}
                                    onMouseLeave={(e) => {
                                        (
                                            e.currentTarget as HTMLInputElement
                                        ).style.backgroundColor = "#ffffff";
                                    }}
                                />
                            </div>
                        </div>

                        <div className="filters-row flex items-center gap-2">
                            <div className="flex-none shrink-0">
                                <div className="relative">
                                    <button
                                        type="button"
                                        data-barber-toggle="barber-filter"
                                        onPointerDown={(e) => {
                                            e.preventDefault();
                                            openBarberMenu(e as any);
                                        }}
                                        className="admin-filter-trigger fixed-select-trigger filter-trigger h-12 w-full border border-gray-300 rounded-md bg-white hover:bg-gray-100 hover:shadow-sm transition-colors cursor-pointer outline-none focus:outline-none"
                                        style={{ borderColor: "#E4E5E3" }}>
                                        <span
                                            data-slot="select-value"
                                            className="truncate max-w-full"
                                            style={{
                                                pointerEvents: "none",
                                                fontSize: "14px",
                                            }}>
                                            {selectedBarber === "all"
                                                ? "All Barbers"
                                                : barbers.find(
                                                      (b) =>
                                                          String(b.id) ===
                                                          String(selectedBarber)
                                                  )?.name || "All Barbers"}
                                        </span>
                                        <span className="filter-chevron">
                                            <ChevronDown size={17} />
                                        </span>
                                    </button>
                                    {barberMenuOpen && barberMenuPos
                                        ? createPortal(
                                              <div
                                                  data-barber-menu="barber-filter"
                                                  className="admin-status-menu rounded-md border border-gray-200 bg-white text-gray-900 shadow-md p-0"
                                                  style={{
                                                      fontSize: "14px",
                                                      position: "absolute",
                                                      left: barberMenuPos.left,
                                                      top: barberMenuPos.top,
                                                      zIndex: 2147483647,
                                                      minWidth: 220,
                                                      padding: 8,
                                                  }}>
                                                  <div
                                                      style={{
                                                          display: "flex",
                                                          flexDirection:
                                                              "column",
                                                          gap: 6,
                                                          padding: 4,
                                                      }}>
                                                      <div
                                                          role="option"
                                                          data-state={
                                                              selectedBarber ===
                                                              "all"
                                                                  ? "checked"
                                                                  : undefined
                                                          }
                                                          className="px-3 py-2 rounded-md hover:bg-gray-100"
                                                          style={{
                                                              fontSize: "14px",
                                                              cursor: "pointer",
                                                          }}
                                                          onClick={() => {
                                                              setSelectedBarber(
                                                                  "all"
                                                              );
                                                              setBarberMenuOpen(
                                                                  false
                                                              );
                                                              setBarberMenuPos(
                                                                  null
                                                              );
                                                          }}>
                                                          All Barbers
                                                      </div>
                                                      {barbers.map((b) => (
                                                          <div
                                                              key={b.id}
                                                              role="option"
                                                              data-state={
                                                                  selectedBarber ===
                                                                  String(b.id)
                                                                      ? "checked"
                                                                      : undefined
                                                              }
                                                              className="px-3 py-2 rounded-md hover:bg-gray-100"
                                                              style={{
                                                                  fontSize:
                                                                      "14px",
                                                                  cursor: "pointer",
                                                              }}
                                                              onClick={() => {
                                                                  setSelectedBarber(
                                                                      String(
                                                                          b.id
                                                                      )
                                                                  );
                                                                  setBarberMenuOpen(
                                                                      false
                                                                  );
                                                                  setBarberMenuPos(
                                                                      null
                                                                  );
                                                              }}>
                                                              {b.name}
                                                          </div>
                                                      ))}
                                                  </div>
                                              </div>,
                                              document.body
                                          )
                                        : null}
                                </div>
                            </div>

                            <div className="flex-none shrink-0">
                                <div className="relative">
                                    <button
                                        type="button"
                                        data-toolbar-status-toggle="toolbar-status"
                                        onPointerDown={(e) => {
                                            e.preventDefault();
                                            openToolbarStatus(e as any);
                                        }}
                                        className="admin-filter-trigger fixed-select-trigger status-select-trigger filter-trigger h-12 w-full border border-gray-300 rounded-md bg-white hover:bg-gray-100 hover:shadow-sm transition-colors cursor-pointer outline-none focus:outline-none">
                                        <span
                                            data-slot="select-value"
                                            className="truncate max-w-full"
                                            style={{
                                                pointerEvents: "none",
                                                fontSize: "14px",
                                            }}>
                                            {selectedStatus === "all"
                                                ? "Status"
                                                : formatStatusLabel(
                                                      selectedStatus
                                                  )}
                                        </span>
                                        <span className="filter-chevron">
                                            <ChevronDown size={17} />
                                        </span>
                                    </button>
                                    {toolbarStatusOpen && toolbarStatusPos
                                        ? createPortal(
                                              <div
                                                  data-toolbar-status-menu="toolbar-status"
                                                  className="admin-status-menu rounded-md border border-gray-200 bg-white text-gray-900 shadow-md p-0"
                                                  style={{
                                                      fontSize: "14px",
                                                      position: "absolute",
                                                      left: toolbarStatusPos.left,
                                                      top: toolbarStatusPos.top,
                                                      zIndex: 2147483647,
                                                      minWidth: 180,
                                                      padding: 4,
                                                  }}>
                                                  <div
                                                      style={{
                                                          padding: 8,
                                                          minWidth: 180,
                                                      }}>
                                                      <div
                                                          style={{
                                                              display: "flex",
                                                              flexDirection:
                                                                  "column",
                                                              gap: 6,
                                                          }}>
                                                          <div
                                                              role="option"
                                                              data-state={
                                                                  selectedStatus ===
                                                                  "all"
                                                                      ? "checked"
                                                                      : undefined
                                                              }
                                                              className="px-3 py-2 rounded-md hover:bg-gray-100"
                                                              style={{
                                                                  fontSize:
                                                                      "14px",
                                                                  cursor: "pointer",
                                                              }}
                                                              onClick={() => {
                                                                  setSelectedStatus(
                                                                      "all"
                                                                  );
                                                                  setToolbarStatusOpen(
                                                                      false
                                                                  );
                                                                  setToolbarStatusPos(
                                                                      null
                                                                  );
                                                              }}>
                                                              Status
                                                          </div>
                                                          <div
                                                              role="option"
                                                              data-state={
                                                                  selectedStatus ===
                                                                  "pending"
                                                                      ? "checked"
                                                                      : undefined
                                                              }
                                                              className="px-3 py-2 rounded-md hover:bg-gray-100"
                                                              style={{
                                                                  fontSize:
                                                                      "14px",
                                                              }}
                                                              onClick={() => {
                                                                  setSelectedStatus(
                                                                      "pending"
                                                                  );
                                                                  setToolbarStatusOpen(
                                                                      false
                                                                  );
                                                                  setToolbarStatusPos(
                                                                      null
                                                                  );
                                                              }}>
                                                              Pending
                                                          </div>
                                                          <div
                                                              role="option"
                                                              data-state={
                                                                  selectedStatus ===
                                                                  "confirmed"
                                                                      ? "checked"
                                                                      : undefined
                                                              }
                                                              className="px-3 py-2 rounded-md hover:bg-gray-100"
                                                              style={{
                                                                  fontSize:
                                                                      "14px",
                                                              }}
                                                              onClick={() => {
                                                                  setSelectedStatus(
                                                                      "confirmed"
                                                                  );
                                                                  setToolbarStatusOpen(
                                                                      false
                                                                  );
                                                                  setToolbarStatusPos(
                                                                      null
                                                                  );
                                                              }}>
                                                              Confirmed
                                                          </div>
                                                          <div
                                                              role="option"
                                                              data-state={
                                                                  selectedStatus ===
                                                                  "checked_in"
                                                                      ? "checked"
                                                                      : undefined
                                                              }
                                                              className="px-3 py-2 rounded-md hover:bg-gray-100"
                                                              style={{
                                                                  fontSize:
                                                                      "14px",
                                                              }}
                                                              onClick={() => {
                                                                  setSelectedStatus(
                                                                      "checked_in"
                                                                  );
                                                                  setToolbarStatusOpen(
                                                                      false
                                                                  );
                                                                  setToolbarStatusPos(
                                                                      null
                                                                  );
                                                              }}>
                                                              Checked In
                                                          </div>
                                                          <div
                                                              role="option"
                                                              data-state={
                                                                  selectedStatus ===
                                                                  "cancelled"
                                                                      ? "checked"
                                                                      : undefined
                                                              }
                                                              className="px-3 py-2 rounded-md hover:bg-gray-100"
                                                              style={{
                                                                  fontSize:
                                                                      "14px",
                                                              }}
                                                              onClick={() => {
                                                                  setSelectedStatus(
                                                                      "cancelled"
                                                                  );
                                                                  setToolbarStatusOpen(
                                                                      false
                                                                  );
                                                                  setToolbarStatusPos(
                                                                      null
                                                                  );
                                                              }}>
                                                              Cancelled
                                                          </div>
                                                          <div
                                                              role="option"
                                                              data-state={
                                                                  selectedStatus ===
                                                                  "no_show"
                                                                      ? "checked"
                                                                      : undefined
                                                              }
                                                              className="px-3 py-2 rounded-md hover:bg-gray-100"
                                                              style={{
                                                                  fontSize:
                                                                      "14px",
                                                              }}
                                                              onClick={() => {
                                                                  setSelectedStatus(
                                                                      "no_show"
                                                                  );
                                                                  setToolbarStatusOpen(
                                                                      false
                                                                  );
                                                                  setToolbarStatusPos(
                                                                      null
                                                                  );
                                                              }}>
                                                              No show
                                                          </div>
                                                      </div>
                                                  </div>
                                              </div>,
                                              document.body
                                          )
                                        : null}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Today's appointments list */}
            <div className="mb-6">
                <Card
                    style={{
                        backgroundColor: "transparent",
                        boxShadow: "none",
                        border: "none",
                    }}>
                    <CardContent className="p-0">
                        {todaysAppointments.length === 0 ? (
                            <div className="text-sm text-gray-500 flex items-center justify-center py-8">
                                {showUpcoming
                                    ? "No upcoming appointments."
                                    : `No appointments for ${formatDayLabel(
                                          selectedDate
                                      )}.`}
                            </div>
                        ) : showUpcoming ? (
                            // Group appointments by date and render a section per date
                            (() => {
                                const byDate: Record<string, any[]> = {};
                                for (const apt of todaysAppointments) {
                                    const d = apt.appointment_date || apt.date;
                                    (byDate[d] = byDate[d] || []).push(apt);
                                }
                                const dates = Object.keys(byDate).sort();
                                return (
                                    <div className="space-y-6">
                                        {dates.map((date) => (
                                            <div
                                                key={date}
                                                id={`upcoming-${date}`}>
                                                <div className="mb-4 text-sm font-semibold text-gray-700">
                                                    {new Date(
                                                        date + "T00:00:00"
                                                    ).toLocaleDateString(
                                                        undefined,
                                                        {
                                                            weekday: "long",
                                                            month: "long",
                                                            day: "numeric",
                                                        }
                                                    )}
                                                </div>
                                                <div
                                                    className="barber-row px-0"
                                                    style={{
                                                        paddingLeft: 0,
                                                        paddingRight: 0,
                                                    }}>
                                                    {byDate[date]
                                                        .sort(
                                                            (
                                                                a: any,
                                                                b: any
                                                            ) => {
                                                                const ta =
                                                                    a.appointment_time ||
                                                                    a.time ||
                                                                    a.start_time ||
                                                                    "";
                                                                const tb =
                                                                    b.appointment_time ||
                                                                    b.time ||
                                                                    b.start_time ||
                                                                    "";
                                                                return ta.localeCompare(
                                                                    tb
                                                                );
                                                            }
                                                        )
                                                        .map((apt: any) => {
                                                            const barberName =
                                                                barbers.find(
                                                                    (b) =>
                                                                        String(
                                                                            b.id
                                                                        ) ===
                                                                        String(
                                                                            apt.barber_id
                                                                        )
                                                                )?.name ||
                                                                "Unassigned";
                                                            const customer =
                                                                apt.customer_name ||
                                                                apt.name ||
                                                                apt.customer ||
                                                                apt.email ||
                                                                "Unknown";
                                                            const time =
                                                                apt.appointment_time ||
                                                                apt.time ||
                                                                apt.start_time ||
                                                                "";
                                                            return (
                                                                <Card
                                                                    key={
                                                                        apt.id ||
                                                                        `${apt.customer}_${time}_${date}`
                                                                    }
                                                                    className="bg-white rounded-lg overflow-hidden"
                                                                    style={{
                                                                        backgroundColor:
                                                                            "#ffffff",
                                                                        borderColor:
                                                                            "#E5E7EB",
                                                                        borderWidth: 1,
                                                                        borderStyle:
                                                                            "solid",
                                                                        height: "220px",
                                                                        borderBottomLeftRadius:
                                                                            "1rem",
                                                                        borderBottomRightRadius:
                                                                            "1rem",
                                                                        display:
                                                                            "flex",
                                                                        flexDirection:
                                                                            "column",
                                                                    }}>
                                                                    <div
                                                                        className="pt-4 px-6 pb-0"
                                                                        style={{
                                                                            flex: 1,
                                                                            minHeight:
                                                                                "130px",
                                                                            overflow:
                                                                                "hidden",
                                                                            position:
                                                                                "relative",
                                                                            zIndex: 10,
                                                                        }}>
                                                                        <div
                                                                            style={{
                                                                                display:
                                                                                    "block",
                                                                                alignItems:
                                                                                    "flex-start",
                                                                                justifyContent:
                                                                                    "space-between",
                                                                                gap: "8px",
                                                                                width: "100%",
                                                                            }}>
                                                                            <div className="min-w-0 text-left">
                                                                                <div
                                                                                    style={{
                                                                                        display:
                                                                                            "block",
                                                                                        alignItems:
                                                                                            "flex-start",
                                                                                        justifyContent:
                                                                                            "space-between",
                                                                                        gap: "12px",
                                                                                    }}>
                                                                                    <div
                                                                                        style={{
                                                                                            minWidth: 0,
                                                                                            paddingRight:
                                                                                                "140px",
                                                                                        }}>
                                                                                        <h3
                                                                                            className="text-xl font-medium text-gray-700"
                                                                                            style={{
                                                                                                display:
                                                                                                    "-webkit-box",
                                                                                                WebkitLineClamp: 2,
                                                                                                WebkitBoxOrient:
                                                                                                    "vertical",
                                                                                                overflow:
                                                                                                    "hidden",
                                                                                            }}>
                                                                                            <span className="font-extrabold">
                                                                                                {
                                                                                                    customer
                                                                                                }
                                                                                            </span>
                                                                                        </h3>
                                                                                        <div
                                                                                            className="text-sm mt-1 truncate"
                                                                                            style={{
                                                                                                color: "#6B7280",
                                                                                                WebkitLineClamp: 1,
                                                                                                display:
                                                                                                    "-webkit-box",
                                                                                                WebkitBoxOrient:
                                                                                                    "vertical",
                                                                                                overflow:
                                                                                                    "hidden",
                                                                                            }}>
                                                                                            {new Date(
                                                                                                (apt.appointment_date ||
                                                                                                    date ||
                                                                                                    selectedDate) +
                                                                                                    "T" +
                                                                                                    (apt.appointment_time ||
                                                                                                        apt.time ||
                                                                                                        apt.start_time ||
                                                                                                        "00:00:00")
                                                                                            ).toLocaleString(
                                                                                                undefined,
                                                                                                {
                                                                                                    month: "short",
                                                                                                    day: "numeric",
                                                                                                    year: "numeric",
                                                                                                    hour: "numeric",
                                                                                                    minute: "2-digit",
                                                                                                }
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                    <div
                                                                                        style={{
                                                                                            position:
                                                                                                "absolute",
                                                                                            right: 24,
                                                                                            top: 18,
                                                                                            zIndex: 20,
                                                                                        }}>
                                                                                        {(() => {
                                                                                            const s =
                                                                                                apt.status;
                                                                                            const styles =
                                                                                                s ===
                                                                                                "pending"
                                                                                                    ? {
                                                                                                          backgroundColor:
                                                                                                              "#EFF6FF",
                                                                                                          borderColor:
                                                                                                              "#1D4ED8",
                                                                                                          color: "#1D4ED8",
                                                                                                      }
                                                                                                    : s ===
                                                                                                      "confirmed"
                                                                                                    ? {
                                                                                                          backgroundColor:
                                                                                                              "#ECFDF5",
                                                                                                          borderColor:
                                                                                                              "#059669",
                                                                                                          color: "#059669",
                                                                                                      }
                                                                                                    : s ===
                                                                                                      "checked_in"
                                                                                                    ? {
                                                                                                          backgroundColor:
                                                                                                              " #ECFDF5",
                                                                                                          borderColor:
                                                                                                              " #059669",
                                                                                                          color: " #059669",
                                                                                                      }
                                                                                                    : s ===
                                                                                                      "cancelled"
                                                                                                    ? {
                                                                                                          backgroundColor:
                                                                                                              "#FEF2F2",
                                                                                                          borderColor:
                                                                                                              "#DC2626",
                                                                                                          color: "#DC2626",
                                                                                                      }
                                                                                                    : s ===
                                                                                                      "no_show"
                                                                                                    ? {
                                                                                                          backgroundColor:
                                                                                                              "#F3F4F6",
                                                                                                          borderColor:
                                                                                                              "#E5E7EB",
                                                                                                          color: "#6B7280",
                                                                                                      }
                                                                                                    : {
                                                                                                          backgroundColor:
                                                                                                              "#F3F4F6",
                                                                                                          borderColor:
                                                                                                              "#E5E7EB",
                                                                                                          color: "#6B7280",
                                                                                                      };
                                                                                            const menuStyle =
                                                                                                statusMenuPos &&
                                                                                                statusMenuPos.top !=
                                                                                                    null
                                                                                                    ? {
                                                                                                          position:
                                                                                                              "fixed",
                                                                                                          left: statusMenuPos.left,
                                                                                                          top: statusMenuPos.top,
                                                                                                          zIndex: 2147483647,
                                                                                                          background:
                                                                                                              "#ffffff",
                                                                                                          border: "1px solid #E5E7EB",
                                                                                                          borderRadius: 8,
                                                                                                          boxShadow:
                                                                                                              "0 6px 18px rgba(0,0,0,0.08)",
                                                                                                          minWidth: 160,
                                                                                                      }
                                                                                                    : {
                                                                                                          position:
                                                                                                              "absolute",
                                                                                                          right: 0,
                                                                                                          top: "calc(100% + 6px)",
                                                                                                          zIndex: 2147483647,
                                                                                                          background:
                                                                                                              "#ffffff",
                                                                                                          border: "1px solid #E5E7EB",
                                                                                                          borderRadius: 8,
                                                                                                          boxShadow:
                                                                                                              "0 6px 18px rgba(0,0,0,0.08)",
                                                                                                          minWidth: 160,
                                                                                                      };
                                                                                            return (
                                                                                                <div
                                                                                                    style={{
                                                                                                        position:
                                                                                                            "relative",
                                                                                                        display:
                                                                                                            "inline-block",
                                                                                                    }}>
                                                                                                    <button
                                                                                                        type="button"
                                                                                                        data-status-toggle={`apt-${apt.id}`}
                                                                                                        onClick={(
                                                                                                            e
                                                                                                        ) =>
                                                                                                            openStatusMenu(
                                                                                                                apt.id,
                                                                                                                e as any
                                                                                                            )
                                                                                                        }
                                                                                                        style={{
                                                                                                            display:
                                                                                                                "inline-flex",
                                                                                                            alignItems:
                                                                                                                "center",
                                                                                                            gap: 8,
                                                                                                            height: "25px",
                                                                                                            lineHeight:
                                                                                                                "22.5px",
                                                                                                            paddingLeft:
                                                                                                                "8px",
                                                                                                            paddingRight:
                                                                                                                "6px",
                                                                                                            borderRadius: 6,
                                                                                                            fontSize:
                                                                                                                "13px",
                                                                                                            fontWeight: 500,
                                                                                                            border: `1px solid ${styles.borderColor}`,
                                                                                                            backgroundColor:
                                                                                                                styles.backgroundColor,
                                                                                                            color: styles.color,
                                                                                                            cursor: "pointer",
                                                                                                        }}>
                                                                                                        <span
                                                                                                            style={{
                                                                                                                display:
                                                                                                                    "inline-block",
                                                                                                            }}>
                                                                                                            {formatStatusLabel(
                                                                                                                s
                                                                                                            )}
                                                                                                        </span>
                                                                                                        <ChevronDown
                                                                                                            size={
                                                                                                                18
                                                                                                            }
                                                                                                        />
                                                                                                    </button>
                                                                                                    {statusMenuOpenFor ===
                                                                                                        apt.id &&
                                                                                                        (statusMenuPos ? (
                                                                                                            createPortal(
                                                                                                                <div
                                                                                                                    data-status-menu={`apt-${apt.id}`}
                                                                                                                    className="admin-status-menu rounded-md border border-gray-200 bg-white text-gray-900 shadow-md p-0"
                                                                                                                    style={{
                                                                                                                        position:
                                                                                                                            "absolute",
                                                                                                                        left: statusMenuPos.left,
                                                                                                                        top: statusMenuPos.top,
                                                                                                                        zIndex: 2147483647,
                                                                                                                        minWidth: 160,
                                                                                                                        padding:
                                                                                                                            "8px",
                                                                                                                    }}>
                                                                                                                    <div
                                                                                                                        style={{
                                                                                                                            display:
                                                                                                                                "flex",
                                                                                                                            flexDirection:
                                                                                                                                "column",
                                                                                                                            gap: "8px",
                                                                                                                        }}>
                                                                                                                        {[
                                                                                                                            "pending",
                                                                                                                            "confirmed",
                                                                                                                            "checked_in",
                                                                                                                            "cancelled",
                                                                                                                            "no_show",
                                                                                                                        ].map(
                                                                                                                            (
                                                                                                                                opt
                                                                                                                            ) => (
                                                                                                                                <div
                                                                                                                                    key={
                                                                                                                                        opt
                                                                                                                                    }
                                                                                                                                    onClick={() =>
                                                                                                                                        handleChangeStatus(
                                                                                                                                            apt.id,
                                                                                                                                            opt
                                                                                                                                        )
                                                                                                                                    }
                                                                                                                                    className="px-3 py-2 rounded-md hover:bg-gray-100"
                                                                                                                                    onMouseEnter={(
                                                                                                                                        e
                                                                                                                                    ) => {
                                                                                                                                        const el =
                                                                                                                                            e.currentTarget as HTMLDivElement;
                                                                                                                                        if (
                                                                                                                                            opt !==
                                                                                                                                            s
                                                                                                                                        )
                                                                                                                                            el.style.backgroundColor =
                                                                                                                                                "#F9FAFB";
                                                                                                                                    }}
                                                                                                                                    onMouseLeave={(
                                                                                                                                        e
                                                                                                                                    ) => {
                                                                                                                                        const el =
                                                                                                                                            e.currentTarget as HTMLDivElement;
                                                                                                                                        if (
                                                                                                                                            opt !==
                                                                                                                                            s
                                                                                                                                        )
                                                                                                                                            el.style.backgroundColor =
                                                                                                                                                "#ffffff";
                                                                                                                                    }}
                                                                                                                                    style={{
                                                                                                                                        cursor: "pointer",
                                                                                                                                        borderBottom:
                                                                                                                                            "none",
                                                                                                                                        background:
                                                                                                                                            opt ===
                                                                                                                                            s
                                                                                                                                                ? "#F3F4F6"
                                                                                                                                                : "#ffffff",
                                                                                                                                        fontSize:
                                                                                                                                            "14px",
                                                                                                                                    }}>
                                                                                                                                    {opt ===
                                                                                                                                    "checked_in"
                                                                                                                                        ? "Checked in"
                                                                                                                                        : opt ===
                                                                                                                                          "no_show"
                                                                                                                                        ? "No show"
                                                                                                                                        : opt
                                                                                                                                              .charAt(
                                                                                                                                                  0
                                                                                                                                              )
                                                                                                                                              .toUpperCase() +
                                                                                                                                          opt.slice(
                                                                                                                                              1
                                                                                                                                          )}
                                                                                                                                </div>
                                                                                                                            )
                                                                                                                        )}
                                                                                                                    </div>
                                                                                                                </div>,
                                                                                                                document.body
                                                                                                            )
                                                                                                        ) : (
                                                                                                            <div
                                                                                                                data-status-menu={`apt-${apt.id}`}
                                                                                                                className="admin-status-menu rounded-md border border-gray-200 bg-white text-gray-900 shadow-md p-0"
                                                                                                                style={getStatusMenuStyle()}>
                                                                                                                {[
                                                                                                                    "pending",
                                                                                                                    "confirmed",
                                                                                                                    "checked_in",
                                                                                                                    "cancelled",
                                                                                                                    "no_show",
                                                                                                                ].map(
                                                                                                                    (
                                                                                                                        opt
                                                                                                                    ) => (
                                                                                                                        <div
                                                                                                                            key={
                                                                                                                                opt
                                                                                                                            }
                                                                                                                            onClick={() =>
                                                                                                                                handleChangeStatus(
                                                                                                                                    apt.id,
                                                                                                                                    opt
                                                                                                                                )
                                                                                                                            }
                                                                                                                            className="px-3 py-2 rounded-md hover:bg-gray-100"
                                                                                                                            onMouseEnter={(
                                                                                                                                e
                                                                                                                            ) => {
                                                                                                                                const el =
                                                                                                                                    e.currentTarget as HTMLDivElement;
                                                                                                                                if (
                                                                                                                                    opt !==
                                                                                                                                    s
                                                                                                                                )
                                                                                                                                    el.style.backgroundColor =
                                                                                                                                        "#F9FAFB";
                                                                                                                            }}
                                                                                                                            onMouseLeave={(
                                                                                                                                e
                                                                                                                            ) => {
                                                                                                                                const el =
                                                                                                                                    e.currentTarget as HTMLDivElement;
                                                                                                                                if (
                                                                                                                                    opt !==
                                                                                                                                    s
                                                                                                                                )
                                                                                                                                    el.style.backgroundColor =
                                                                                                                                        "#ffffff";
                                                                                                                            }}
                                                                                                                            style={{
                                                                                                                                cursor: "pointer",
                                                                                                                                borderBottom:
                                                                                                                                    "none",
                                                                                                                                background:
                                                                                                                                    opt ===
                                                                                                                                    s
                                                                                                                                        ? "#F3F4F6"
                                                                                                                                        : "#ffffff",
                                                                                                                                fontSize:
                                                                                                                                    "14px",
                                                                                                                            }}>
                                                                                                                            {opt ===
                                                                                                                            "checked_in"
                                                                                                                                ? "Checked in"
                                                                                                                                : opt ===
                                                                                                                                  "no_show"
                                                                                                                                ? "No show"
                                                                                                                                : opt
                                                                                                                                      .charAt(
                                                                                                                                          0
                                                                                                                                      )
                                                                                                                                      .toUpperCase() +
                                                                                                                                  opt.slice(
                                                                                                                                      1
                                                                                                                                  )}
                                                                                                                        </div>
                                                                                                                    )
                                                                                                                )}
                                                                                                            </div>
                                                                                                        ))}
                                                                                                </div>
                                                                                            );
                                                                                        })()}
                                                                                    </div>
                                                                                </div>
                                                                                <div
                                                                                    style={{
                                                                                        height: 1.2,
                                                                                        backgroundColor:
                                                                                            "#E5E7EB",
                                                                                        marginTop: 12,
                                                                                        marginBottom: 12,
                                                                                    }}
                                                                                />
                                                                                <p
                                                                                    className="text-sm mt-1 truncate"
                                                                                    style={{
                                                                                        color: "#6B7280",
                                                                                        fontWeight: 500,
                                                                                    }}>
                                                                                    Service:{" "}
                                                                                    {getServiceLabel(
                                                                                        apt
                                                                                    )}
                                                                                </p>
                                                                                <p
                                                                                    className="text-sm mt-1 truncate"
                                                                                    style={{
                                                                                        color: "#6B7280",
                                                                                        fontWeight: 500,
                                                                                    }}>
                                                                                    Barber:{" "}
                                                                                    {
                                                                                        barberName
                                                                                    }
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    <div
                                                                        className="px-6 py-4 bg-gray-100 appointments-card-footer flex items-center justify-center"
                                                                        style={{
                                                                            backgroundColor:
                                                                                "#F3F4F6",
                                                                        }}>
                                                                        <button
                                                                            type="button"
                                                                            className="h-6 px-4 bg-transparent"
                                                                            style={{
                                                                                color: "#2663EB",
                                                                                fontWeight: 500,
                                                                                fontSize:
                                                                                    "18px",
                                                                                lineHeight:
                                                                                    "22px",
                                                                                border: "none",
                                                                                background:
                                                                                    "transparent",
                                                                            }}
                                                                            onMouseEnter={(
                                                                                e
                                                                            ) => {
                                                                                const s =
                                                                                    (
                                                                                        e.currentTarget as HTMLButtonElement
                                                                                    ).querySelector(
                                                                                        "span"
                                                                                    ) as HTMLSpanElement | null;
                                                                                if (
                                                                                    s
                                                                                )
                                                                                    s.style.backgroundSize =
                                                                                        "100% 2px";
                                                                            }}
                                                                            onMouseLeave={(
                                                                                e
                                                                            ) => {
                                                                                const s =
                                                                                    (
                                                                                        e.currentTarget as HTMLButtonElement
                                                                                    ).querySelector(
                                                                                        "span"
                                                                                    ) as HTMLSpanElement | null;
                                                                                if (
                                                                                    s
                                                                                )
                                                                                    s.style.backgroundSize =
                                                                                        "0% 2px";
                                                                            }}
                                                                            onClick={() =>
                                                                                navigate(
                                                                                    `/admin/appointments/${apt.id}`
                                                                                )
                                                                            }>
                                                                            <span
                                                                                style={{
                                                                                    display:
                                                                                        "inline-block",
                                                                                    backgroundImage:
                                                                                        "linear-gradient(currentColor, currentColor)",
                                                                                    backgroundRepeat:
                                                                                        "no-repeat",
                                                                                    backgroundPosition:
                                                                                        "bottom left",
                                                                                    backgroundSize:
                                                                                        "0% 2px",
                                                                                    transition:
                                                                                        "background-size 180ms ease",
                                                                                }}>
                                                                                View
                                                                                details
                                                                            </span>
                                                                        </button>
                                                                    </div>
                                                                </Card>
                                                            );
                                                        })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                );
                            })()
                        ) : (
                            <div
                                className="barber-row px-0"
                                style={{ paddingLeft: 0, paddingRight: 0 }}>
                                {todaysAppointments.map((apt: any) => {
                                    const barberName =
                                        barbers.find(
                                            (b) =>
                                                String(b.id) ===
                                                String(apt.barber_id)
                                        )?.name || "Unassigned";
                                    const customer =
                                        apt.customer_name ||
                                        apt.name ||
                                        apt.customer ||
                                        apt.email ||
                                        "Unknown";
                                    const time =
                                        apt.appointment_time ||
                                        apt.time ||
                                        apt.start_time ||
                                        "";

                                    return (
                                        <Card
                                            key={
                                                apt.id ||
                                                `${apt.customer}_${time}`
                                            }
                                            className="bg-white rounded-lg overflow-hidden"
                                            style={{
                                                backgroundColor: "#ffffff",
                                                borderColor: "#E5E7EB",
                                                borderWidth: 1,
                                                borderStyle: "solid",
                                                height: "220px",
                                                borderBottomLeftRadius: "1rem",
                                                borderBottomRightRadius: "1rem",
                                                display: "flex",
                                                flexDirection: "column",
                                            }}>
                                            <div
                                                className="pt-4 px-6 pb-0"
                                                style={{
                                                    flex: 1,
                                                    minHeight: "130px",
                                                    overflow: "hidden",
                                                    position: "relative",
                                                    zIndex: 10,
                                                }}>
                                                <div
                                                    style={{
                                                        display: "block",
                                                        alignItems:
                                                            "flex-start",
                                                        justifyContent:
                                                            "space-between",
                                                        gap: "8px",
                                                        width: "100%",
                                                    }}>
                                                    <div className="min-w-0 text-left">
                                                        <div
                                                            style={{
                                                                display:
                                                                    "block",
                                                                alignItems:
                                                                    "flex-start",
                                                                justifyContent:
                                                                    "space-between",
                                                                gap: "12px",
                                                            }}>
                                                            <div
                                                                style={{
                                                                    minWidth: 0,
                                                                    paddingRight:
                                                                        "140px",
                                                                }}>
                                                                <h3
                                                                    className="text-xl font-medium text-gray-700"
                                                                    style={{
                                                                        display:
                                                                            "-webkit-box",
                                                                        WebkitLineClamp: 2,
                                                                        WebkitBoxOrient:
                                                                            "vertical",
                                                                        overflow:
                                                                            "hidden",
                                                                    }}>
                                                                    <span className="font-extrabold">
                                                                        {
                                                                            customer
                                                                        }
                                                                    </span>
                                                                </h3>
                                                                <div
                                                                    className="text-sm mt-1 truncate"
                                                                    style={{
                                                                        color: "#6B7280",
                                                                        WebkitLineClamp: 1,
                                                                        display:
                                                                            "-webkit-box",
                                                                        WebkitBoxOrient:
                                                                            "vertical",
                                                                        overflow:
                                                                            "hidden",
                                                                    }}>
                                                                    {new Date(
                                                                        (apt.appointment_date ||
                                                                            selectedDate) +
                                                                            "T" +
                                                                            (apt.appointment_time ||
                                                                                apt.time ||
                                                                                apt.start_time ||
                                                                                "00:00:00")
                                                                    ).toLocaleString(
                                                                        undefined,
                                                                        {
                                                                            month: "short",
                                                                            day: "numeric",
                                                                            year: "numeric",
                                                                            hour: "numeric",
                                                                            minute: "2-digit",
                                                                        }
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div
                                                                style={{
                                                                    position:
                                                                        "absolute",
                                                                    right: 24,
                                                                    top: 18,
                                                                    zIndex: 20,
                                                                }}>
                                                                {(() => {
                                                                    const s =
                                                                        apt.status;
                                                                    const styles =
                                                                        s ===
                                                                        "pending"
                                                                            ? {
                                                                                  backgroundColor:
                                                                                      "rgba(164, 202, 251, 0.35)",
                                                                                  borderColor:
                                                                                      " #1D4ED8",
                                                                                  color: " #1D4ED8",
                                                                              }
                                                                            : s ===
                                                                              "confirmed"
                                                                            ? {
                                                                                  backgroundColor:
                                                                                      "#ECFDF5",
                                                                                  borderColor:
                                                                                      "#059669",
                                                                                  color: "#059669",
                                                                              }
                                                                            : s ===
                                                                              "checked_in"
                                                                            ? {
                                                                                  backgroundColor:
                                                                                      "#ECFDF5",
                                                                                  borderColor:
                                                                                      "#059669",
                                                                                  color: "#059669",
                                                                              }
                                                                            : s ===
                                                                              "cancelled"
                                                                            ? {
                                                                                  backgroundColor:
                                                                                      "#FEF2F2",
                                                                                  borderColor:
                                                                                      "#DC2626",
                                                                                  color: "#DC2626",
                                                                              }
                                                                            : s ===
                                                                              "no_show"
                                                                            ? {
                                                                                  backgroundColor:
                                                                                      "#F3F4F6",
                                                                                  borderColor:
                                                                                      "#E5E7EB",
                                                                                  color: "#6B7280",
                                                                              }
                                                                            : {
                                                                                  backgroundColor:
                                                                                      "#F3F4F6",
                                                                                  borderColor:
                                                                                      "#E5E7EB",
                                                                                  color: "#6B7280",
                                                                              };
                                                                    const menuStyle =
                                                                        statusMenuPos &&
                                                                        statusMenuPos.top !=
                                                                            null
                                                                            ? {
                                                                                  position:
                                                                                      "fixed",
                                                                                  left: statusMenuPos.left,
                                                                                  top: statusMenuPos.top,
                                                                                  zIndex: 2147483647,
                                                                                  background:
                                                                                      "#ffffff",
                                                                                  border: "1px solid #E5E7EB",
                                                                                  borderRadius: 8,
                                                                                  boxShadow:
                                                                                      "0 6px 18px rgba(0,0,0,0.08)",
                                                                                  minWidth: 160,
                                                                              }
                                                                            : {
                                                                                  position:
                                                                                      "absolute",
                                                                                  right: 0,
                                                                                  top: "calc(100% + 6px)",
                                                                                  zIndex: 2501,
                                                                                  background:
                                                                                      "#ffffff",
                                                                                  border: "1px solid #E5E7EB",
                                                                                  borderRadius: 8,
                                                                                  boxShadow:
                                                                                      "0 6px 18px rgba(0,0,0,0.08)",
                                                                                  minWidth: 160,
                                                                              };
                                                                    return (
                                                                        <div
                                                                            style={{
                                                                                position:
                                                                                    "relative",
                                                                                display:
                                                                                    "inline-block",
                                                                            }}>
                                                                            <button
                                                                                type="button"
                                                                                data-status-toggle={`apt-${apt.id}`}
                                                                                onClick={(
                                                                                    e
                                                                                ) =>
                                                                                    openStatusMenu(
                                                                                        apt.id,
                                                                                        e as any
                                                                                    )
                                                                                }
                                                                                style={{
                                                                                    display:
                                                                                        "inline-flex",
                                                                                    alignItems:
                                                                                        "center",
                                                                                    gap: 8,
                                                                                    height: "25px",
                                                                                    lineHeight:
                                                                                        "22.5px",
                                                                                    paddingLeft:
                                                                                        "8px",
                                                                                    paddingRight:
                                                                                        "6px",
                                                                                    borderRadius: 6,
                                                                                    fontSize:
                                                                                        "13px",
                                                                                    fontWeight: 500,
                                                                                    border: `1px solid ${styles.borderColor}`,
                                                                                    backgroundColor:
                                                                                        styles.backgroundColor,
                                                                                    color: styles.color,
                                                                                    cursor: "pointer",
                                                                                }}>
                                                                                <span
                                                                                    style={{
                                                                                        display:
                                                                                            "inline-block",
                                                                                    }}>
                                                                                    {formatStatusLabel(
                                                                                        s
                                                                                    )}
                                                                                </span>
                                                                                <ChevronDown
                                                                                    size={
                                                                                        18
                                                                                    }
                                                                                />
                                                                            </button>
                                                                            {statusMenuOpenFor ===
                                                                                apt.id &&
                                                                                (statusMenuPos ? (
                                                                                    createPortal(
                                                                                        <div
                                                                                            data-status-menu={`apt-${apt.id}`}
                                                                                            className="admin-status-menu rounded-md border border-gray-200 bg-white text-gray-900 shadow-md p-0"
                                                                                            style={{
                                                                                                position:
                                                                                                    "absolute",
                                                                                                left: statusMenuPos.left,
                                                                                                top: statusMenuPos.top,
                                                                                                zIndex: 2147483647,
                                                                                                minWidth: 160,
                                                                                                padding:
                                                                                                    "8px",
                                                                                            }}>
                                                                                            <div
                                                                                                style={{
                                                                                                    display:
                                                                                                        "flex",
                                                                                                    flexDirection:
                                                                                                        "column",
                                                                                                    gap: "8px",
                                                                                                }}>
                                                                                                {[
                                                                                                    "pending",
                                                                                                    "confirmed",
                                                                                                    "checked_in",
                                                                                                    "cancelled",
                                                                                                    "no_show",
                                                                                                ].map(
                                                                                                    (
                                                                                                        opt
                                                                                                    ) => (
                                                                                                        <div
                                                                                                            key={
                                                                                                                opt
                                                                                                            }
                                                                                                            onClick={() =>
                                                                                                                handleChangeStatus(
                                                                                                                    apt.id,
                                                                                                                    opt
                                                                                                                )
                                                                                                            }
                                                                                                            className="px-3 py-2 rounded-md hover:bg-gray-100"
                                                                                                            onMouseEnter={(
                                                                                                                e
                                                                                                            ) => {
                                                                                                                const el =
                                                                                                                    e.currentTarget as HTMLDivElement;
                                                                                                                if (
                                                                                                                    opt !==
                                                                                                                    s
                                                                                                                )
                                                                                                                    el.style.backgroundColor =
                                                                                                                        "#F9FAFB";
                                                                                                            }}
                                                                                                            onMouseLeave={(
                                                                                                                e
                                                                                                            ) => {
                                                                                                                const el =
                                                                                                                    e.currentTarget as HTMLDivElement;
                                                                                                                if (
                                                                                                                    opt !==
                                                                                                                    s
                                                                                                                )
                                                                                                                    el.style.backgroundColor =
                                                                                                                        "#ffffff";
                                                                                                            }}
                                                                                                            style={{
                                                                                                                cursor: "pointer",
                                                                                                                borderBottom:
                                                                                                                    "none",
                                                                                                                background:
                                                                                                                    opt ===
                                                                                                                    s
                                                                                                                        ? "#F3F4F6"
                                                                                                                        : "#ffffff",
                                                                                                            }}>
                                                                                                            {opt ===
                                                                                                            "checked_in"
                                                                                                                ? "Checked in"
                                                                                                                : opt ===
                                                                                                                  "no_show"
                                                                                                                ? "No show"
                                                                                                                : opt
                                                                                                                      .charAt(
                                                                                                                          0
                                                                                                                      )
                                                                                                                      .toUpperCase() +
                                                                                                                  opt.slice(
                                                                                                                      1
                                                                                                                  )}
                                                                                                        </div>
                                                                                                    )
                                                                                                )}
                                                                                            </div>
                                                                                        </div>,
                                                                                        document.body
                                                                                    )
                                                                                ) : (
                                                                                    <div
                                                                                        data-status-menu={`apt-${apt.id}`}
                                                                                        className="admin-status-menu rounded-md border border-gray-200 bg-white text-gray-900 shadow-md p-0"
                                                                                        style={getStatusMenuStyle()}>
                                                                                        {[
                                                                                            "pending",
                                                                                            "confirmed",
                                                                                            "checked_in",
                                                                                            "cancelled",
                                                                                            "no_show",
                                                                                        ].map(
                                                                                            (
                                                                                                opt
                                                                                            ) => (
                                                                                                <div
                                                                                                    key={
                                                                                                        opt
                                                                                                    }
                                                                                                    onClick={() =>
                                                                                                        handleChangeStatus(
                                                                                                            apt.id,
                                                                                                            opt
                                                                                                        )
                                                                                                    }
                                                                                                    className="px-3 py-2 rounded-md hover:bg-gray-100"
                                                                                                    onMouseEnter={(
                                                                                                        e
                                                                                                    ) => {
                                                                                                        const el =
                                                                                                            e.currentTarget as HTMLDivElement;
                                                                                                        if (
                                                                                                            opt !==
                                                                                                            s
                                                                                                        )
                                                                                                            el.style.backgroundColor =
                                                                                                                "#F9FAFB";
                                                                                                    }}
                                                                                                    onMouseLeave={(
                                                                                                        e
                                                                                                    ) => {
                                                                                                        const el =
                                                                                                            e.currentTarget as HTMLDivElement;
                                                                                                        if (
                                                                                                            opt !==
                                                                                                            s
                                                                                                        )
                                                                                                            el.style.backgroundColor =
                                                                                                                "#ffffff";
                                                                                                    }}
                                                                                                    style={{
                                                                                                        cursor: "pointer",
                                                                                                        borderBottom:
                                                                                                            "none",
                                                                                                        background:
                                                                                                            opt ===
                                                                                                            s
                                                                                                                ? "#F3F4F6"
                                                                                                                : "#ffffff",
                                                                                                        marginBottom:
                                                                                                            "6px",
                                                                                                    }}>
                                                                                                    {opt ===
                                                                                                    "checked_in"
                                                                                                        ? "Checked in"
                                                                                                        : opt ===
                                                                                                          "no_show"
                                                                                                        ? "No show"
                                                                                                        : opt
                                                                                                              .charAt(
                                                                                                                  0
                                                                                                              )
                                                                                                              .toUpperCase() +
                                                                                                          opt.slice(
                                                                                                              1
                                                                                                          )}
                                                                                                </div>
                                                                                            )
                                                                                        )}
                                                                                    </div>
                                                                                ))}
                                                                        </div>
                                                                    );
                                                                })()}
                                                            </div>
                                                        </div>
                                                        <div
                                                            style={{
                                                                height: 1.2,
                                                                backgroundColor:
                                                                    "#E5E7EB",
                                                                marginTop: 12,
                                                                marginBottom: 12,
                                                            }}
                                                        />
                                                        <p
                                                            className="text-sm mt-1 truncate"
                                                            style={{
                                                                color: "#6B7280",
                                                                fontWeight: 500,
                                                            }}>
                                                            Service:{" "}
                                                            {getServiceLabel(
                                                                apt
                                                            )}
                                                        </p>
                                                        <p
                                                            className="text-sm mt-1 truncate"
                                                            style={{
                                                                color: "#6B7280",
                                                                fontWeight: 500,
                                                            }}>
                                                            Barber: {barberName}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div
                                                className="px-6 py-4 bg-gray-100 appointments-card-footer flex items-center justify-center"
                                                style={{
                                                    backgroundColor: "#F3F4F6",
                                                }}>
                                                <button
                                                    type="button"
                                                    className="h-6 px-4 bg-transparent"
                                                    style={{
                                                        color: "#2663EB",
                                                        fontWeight: 500,
                                                        fontSize: "18px",
                                                        lineHeight: "22px",
                                                        border: "none",
                                                        background:
                                                            "transparent",
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        const s = (
                                                            e.currentTarget as HTMLButtonElement
                                                        ).querySelector(
                                                            "span"
                                                        ) as HTMLSpanElement | null;
                                                        if (s)
                                                            s.style.backgroundSize =
                                                                "100% 2px";
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        const s = (
                                                            e.currentTarget as HTMLButtonElement
                                                        ).querySelector(
                                                            "span"
                                                        ) as HTMLSpanElement | null;
                                                        if (s)
                                                            s.style.backgroundSize =
                                                                "0% 2px";
                                                    }}
                                                    onClick={() =>
                                                        openDetails(apt)
                                                    }>
                                                    <span
                                                        style={{
                                                            display:
                                                                "inline-block",
                                                            backgroundImage:
                                                                "linear-gradient(currentColor, currentColor)",
                                                            backgroundRepeat:
                                                                "no-repeat",
                                                            backgroundPosition:
                                                                "bottom left",
                                                            backgroundSize:
                                                                "0% 2px",
                                                            transition:
                                                                "background-size 180ms ease",
                                                        }}>
                                                        View details
                                                    </span>
                                                </button>
                                            </div>
                                        </Card>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
