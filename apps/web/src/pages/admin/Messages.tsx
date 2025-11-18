// Updated: NO SCROLL in detail pane - v2
import React, { useEffect, useState, useRef } from "react";
import { supabase } from "../../lib/supabase";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../../components/ui/select";
import { MessageSquare, Search, Mail, MailOpen, Trash2 } from "lucide-react";
import { format } from "date-fns";

interface Message {
    id: string;
    customer_name: string;
    customer_email: string;
    customer_phone: string | null;
    message: string;
    is_read: boolean;
    created_at: string;
    appointment_id: string | null;
}

interface AppointmentMessage {
    id: string;
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    customer_message: string;
    appointment_date: string;
    appointment_time: string;
    created_at: string;
    services: { name: string } | null;
}

export default function Messages() {
    const [contactMessages, setContactMessages] = useState<Message[]>([]);
    const [appointmentMessages, setAppointmentMessages] = useState<
        AppointmentMessage[]
    >([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterType, setFilterType] = useState("all"); // all, contact, appointment
    const [filterRead, setFilterRead] = useState("all"); // all, read, unread
    const [selectedMessage, setSelectedMessage] = useState<
        (Message | (AppointmentMessage & { type: "appointment" })) | null
    >(null);
    const [deleteConfirm, setDeleteConfirm] = useState<{
        open: boolean;
        id?: string;
        type?: "contact" | "appointment";
    }>({ open: false });

    useEffect(() => {
        fetchMessages();
    }, []);

    const fetchMessages = async () => {
        setLoading(true);

        const { data: contactData, error: contactError } = await supabase
            .from("messages")
            .select("*")
            .order("created_at", { ascending: false });

        if (contactError) {
            console.error("Error fetching contact messages:", contactError);
        } else {
            setContactMessages(contactData || []);
        }

        const { data: appointmentData, error: appointmentError } =
            await supabase
                .from("appointments")
                .select(
                    `
        id,
        customer_name,
        customer_email,
        customer_phone,
        customer_message,
        appointment_date,
        appointment_time,
        created_at,
        is_read,
        services (name)
      `
                )
                .not("customer_message", "is", null)
                .order("created_at", { ascending: false });

        if (appointmentError) {
            console.error(
                "Error fetching appointment messages:",
                appointmentError
            );
        } else {
            setAppointmentMessages(appointmentData || []);
        }

        setLoading(false);
    };

    const formatPhone = (raw?: string | null) => {
        if (!raw) return "";
        const digits = raw.replace(/\D/g, "");
        // Format 10-digit numbers as pairs: 05 95 59 43 34
        if (digits.length === 10) {
            const pairs = digits.match(/.{1,2}/g);
            return pairs ? pairs.join(" ") : digits;
        }
        // If even length, group by 2s
        if (digits.length % 2 === 0) {
            const groups = digits.match(/.{1,2}/g);
            return groups ? groups.join(" ") : digits;
        }
        // Fallback: return digits
        return digits;
    };

    const handleMarkAsRead = async (id: string) => {
        const { error } = await supabase
            .from("messages")
            .update({ is_read: true })
            .eq("id", id);

        if (error) {
            console.error("Error marking as read:", error);
            alert("Failed to mark as read");
        } else {
            fetchMessages();
            if (
                selectedMessage &&
                "is_read" in selectedMessage &&
                selectedMessage.id === id
            ) {
                setSelectedMessage({
                    ...selectedMessage,
                    is_read: true,
                } as Message);
            }
        }
    };

    const handleMarkAsUnread = async (id: string) => {
        const { error } = await supabase
            .from("messages")
            .update({ is_read: false })
            .eq("id", id);

        if (error) {
            console.error("Error marking as unread:", error);
            alert("Failed to mark as unread");
        } else {
            fetchMessages();
            if (
                selectedMessage &&
                "is_read" in selectedMessage &&
                selectedMessage.id === id
            ) {
                // close the details pane after marking unread
                setSelectedMessage(null);
            }
        }
    };

    const handleMarkAppointmentAsRead = async (id: string) => {
        console.log("Marking appointment as read:", id);
        const { error, data } = await supabase
            .from("appointments")
            .update({ is_read: true })
            .eq("id", id)
            .select();

        if (error) {
            // Log but don't alert the user; we already updated UI optimistically
            console.error("Error marking appointment as read:", error);
        } else {
            console.log("Successfully marked appointment as read:", data);
            fetchMessages();
            if (
                selectedMessage &&
                "is_read" in selectedMessage &&
                selectedMessage.id === id
            ) {
                setSelectedMessage({
                    ...selectedMessage,
                    is_read: true,
                } as Message);
            }
        }
    };

    const handleMarkAppointmentAsUnread = async (id: string) => {
        const { error } = await supabase
            .from("appointments")
            .update({ is_read: false })
            .eq("id", id);

        if (error) {
            // Log but don't alert the user; keep UI consistent
            console.error("Error marking appointment as unread:", error);
        } else {
            fetchMessages();
            if (
                selectedMessage &&
                "is_read" in selectedMessage &&
                selectedMessage.id === id
            ) {
                // close the details pane after marking unread
                setSelectedMessage(null);
            }
        }
    };

    const handleDelete = async (id: string) => {
        const { error } = await supabase.from("messages").delete().eq("id", id);

        if (error) {
            console.error("Error deleting message:", error);
            alert("Failed to delete message");
        } else {
            fetchMessages();
            if (selectedMessage && selectedMessage.id === id) {
                setSelectedMessage(null);
            }
        }
        setDeleteConfirm({ open: false });
    };

    const handleDeleteAppointment = async (id: string) => {
        // Only clear the message field, don't delete the appointment
        const { error } = await supabase
            .from("appointments")
            .update({ customer_message: null })
            .eq("id", id);
        if (error) {
            console.error("Error deleting appointment message:", error);
            alert("Failed to delete message");
        } else {
            fetchMessages();
            if (selectedMessage && selectedMessage.id === id) {
                setSelectedMessage(null);
            }
        }
        setDeleteConfirm({ open: false });
    };

    const allMessages = [
        ...contactMessages.map((m) => ({ ...m, type: "contact" as const })),
        ...appointmentMessages.map((m) => ({
            ...m,
            type: "appointment" as const,
            message: m.customer_message,
            // preserve is_read if present, otherwise default to false so unread appointments can be indicated
            is_read: (m as any).is_read ?? false,
        })),
    ].sort(
        (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    const filteredMessages = allMessages.filter((msg) => {
        const searchMatch =
            msg.customer_name
                .toLowerCase()
                .includes(searchTerm.toLowerCase()) ||
            msg.customer_email
                .toLowerCase()
                .includes(searchTerm.toLowerCase()) ||
            msg.message.toLowerCase().includes(searchTerm.toLowerCase());

        if (!searchMatch) return false;

        if (filterType === "contact" && msg.type !== "contact") return false;
        if (filterType === "appointment" && msg.type !== "appointment")
            return false;

        // Apply read filter to all message types (not only contact)
        if (filterRead === "read" && !(msg as any).is_read) return false;
        if (filterRead === "unread" && (msg as any).is_read) return false;

        return true;
    });

    const totalAll = allMessages.length;
    const totalContact = contactMessages.length;
    const totalAppointment = appointmentMessages.length;
    const unreadAll = allMessages.filter((m) => !(m as any).is_read).length;
    const unreadContact = contactMessages.filter((m) => !m.is_read).length;
    const unreadAppointment = appointmentMessages.filter(
        (m: any) => !m.is_read
    ).length;
    const fmt = (label: string, count: number) =>
        count > 0 ? `${label} (${count})` : label;
    // lighter chip colors for less visual weight
    const chipBg = "rgba(223, 224, 219, 0.22)";
    const chipHoverBg = "rgba(213,210,206,0.28)";
    const chipActiveBg = "rgba(183, 197, 237, 0.18)";
    const [lastActiveChip, setLastActiveChip] = useState<string | null>(
        "read-all"
    );
    const allButtonRef = useRef<HTMLButtonElement>(null);
    const [isWideScreen, setIsWideScreen] = useState(window.innerWidth >= 1150);
    const detailsRef = useRef<HTMLDivElement | null>(null);
    const [isDetailsWide, setIsDetailsWide] = useState(true);
    const [isDetailFullscreen, setIsDetailFullscreen] = useState(false);
    const [isSmallScreen, setIsSmallScreen] = useState(
        typeof window !== "undefined" ? window.innerWidth < 820 : false
    );

    useEffect(() => {
        const handleResize = () => {
            setIsWideScreen(window.innerWidth >= 1150);
        };
        window.addEventListener("resize", handleResize);
        const handleSmall = () => setIsSmallScreen(window.innerWidth < 820);
        window.addEventListener("resize", handleSmall);
        // initial
        handleSmall();
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    useEffect(() => {
        // Re-attach observer whenever the selected message changes so we always
        // observe the current details pane element. This avoids the race where
        // the ref wasn't present when the effect first ran.
        const el = detailsRef.current;
        if (!el) return;

        // Set initial state based on current width
        setIsDetailsWide(el.getBoundingClientRect().width >= 750);

        const ro = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setIsDetailsWide(entry.contentRect.width >= 750);
            }
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, [selectedMessage]);

    const relativeTime = (input: Date | string | number) => {
        const date = new Date(input);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const minute = 60 * 1000;
        const hour = 60 * minute;
        const day = 24 * hour;
        const week = 7 * day;

        if (diffMs < minute) return "just now";
        if (diffMs < hour) {
            const m = Math.floor(diffMs / minute);
            return `${m} ${m === 1 ? "minute" : "minutes"} ago`;
        }
        if (diffMs < day) {
            const h = Math.floor(diffMs / hour);
            return `${h} ${h === 1 ? "hour" : "hours"} ago`;
        }

        const days = Math.floor(diffMs / day);
        if (days === 1) return "yesterday";
        if (days < 7) return `${days} days ago`;

        const weeks = Math.floor(diffMs / week);
        if (weeks === 1) return "1 week ago";
        if (weeks === 2) return "2 weeks ago";
        return `${weeks} weeks ago`;
    };

    return (
        <div
            className="pt-6 pb-0 px-0 flex flex-col"
            style={{
                backgroundColor: "#FAFAFA",
                height: "100vh",
                overflow: "hidden",
            }}>
            {/* Delete Confirmation Modal */}
            {deleteConfirm.open && (
                <div
                    className="fixed inset-0 flex items-center justify-center"
                    style={{ zIndex: 2147483647 }}>
                    <div
                        className="absolute inset-0 bg-black/70"
                        style={{
                            backdropFilter: "blur(4px)",
                            WebkitBackdropFilter: "blur(4px)",
                        }}
                        onClick={() => setDeleteConfirm({ open: false })}
                    />
                    <div
                        className="relative rounded-lg bg-white p-6 md:p-8 shadow-lg"
                        style={{
                            backgroundColor: "#ffffff",
                            zIndex: 2147483648,
                            width: "min(90vw, 400px)",
                        }}
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}>
                        <div className="mb-6 text-center">
                            <div
                                className="mx-auto mb-4 w-16 h-16 rounded-full flex items-center justify-center"
                                style={{
                                    backgroundColor: "rgba(255, 228, 227, 0.6)",
                                }}>
                                <svg
                                    width="32"
                                    height="32"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="#DC2626"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round">
                                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                    <line x1="12" y1="9" x2="12" y2="13" />
                                    <line x1="12" y1="17" x2="12.01" y2="17" />
                                </svg>
                            </div>
                            <h3
                                className="text-xl font-bold mb-2"
                                style={{ color: "#111827", fontWeight: 600 }}>
                                Delete Message?
                            </h3>
                            <p className="text-sm" style={{ color: "#6B7280" }}>
                                Are you sure you want to delete this message?
                                <br />
                                This action cannot be undone.
                            </p>
                        </div>
                        <div className="flex justify-center gap-3">
                            <Button
                                variant="outline"
                                className="h-9 px-6 rounded-md transition-colors"
                                style={{
                                    backgroundColor: "#FFFFFF",
                                    color: "#374151",
                                    border: "1px solid #D1D5DB",
                                }}
                                onMouseEnter={(e) => {
                                    (
                                        e.currentTarget as HTMLButtonElement
                                    ).style.backgroundColor =
                                        "rgba(243, 244, 246, 0.7)";
                                }}
                                onMouseLeave={(e) => {
                                    (
                                        e.currentTarget as HTMLButtonElement
                                    ).style.backgroundColor = "#FFFFFF";
                                }}
                                onClick={() =>
                                    setDeleteConfirm({ open: false })
                                }>
                                Cancel
                            </Button>
                            <Button
                                className="h-9 px-4 rounded-md transition-colors admin-cancel-btn"
                                onClick={() => {
                                    if (deleteConfirm.id) {
                                        if (
                                            deleteConfirm.type === "appointment"
                                        ) {
                                            handleDeleteAppointment(
                                                deleteConfirm.id
                                            );
                                        } else {
                                            handleDelete(deleteConfirm.id);
                                        }
                                    }
                                }}>
                                Confirm Delete
                            </Button>
                        </div>
                    </div>
                </div>
            )}
            <style>{`
                @keyframes flash {
                    20%, 100% { opacity: 1; }
                    50% { opacity: 0.3; }
                }
                /* Restore normal borders inside the messages list (remove previous override) */
                #messagesListScroll, #messagesListScroll * {
                    border: initial !important;
                    box-shadow: initial !important;
                }
                /* Hide the native scrollbar track/border for the messages list (thin vertical strip) */
                #messagesListScroll::-webkit-scrollbar {
                    width: 14px;
                }
                #messagesListScroll::-webkit-scrollbar-track {
                    background: transparent !important;
                    border: none !important;
                }
                #messagesListScroll::-webkit-scrollbar-thumb {
                    background-color: rgba(0,0,0,0.12) !important;
                    border-radius: 9999px !important;
                    border: 4px solid transparent !important;
                    background-clip: padding-box !important;
                }
                /* Firefox */
                #messagesListScroll {
                    scrollbar-width: thin;
                    scrollbar-color: rgba(0,0,0,0.15) transparent;
                }
                /* Ensure each message row has a visible bottom border */
                #messagesListScroll .message-row {
                    border-bottom: 1px solid #E5E7EB !important;
                }
                /* stronger hover background for message rows */
                #messagesListScroll .message-row:hover {
                    background-color: #F3F4F6 !important;
                }
            `}</style>
            <div
                className="border-gray-200 pb-6"
                style={{ paddingLeft: "24px" }}>
                <h2 className="text-3xl font-bold text-gray-900">Messages</h2>
            </div>

            {/* Responsive Two-Pane Layout */}
            <div
                className={`flex-1 pl-6 ${
                    isDetailFullscreen
                        ? "detail-open messages-container"
                        : "messages-container"
                }`}
                style={{
                    display: "grid",
                    gridTemplateColumns: isSmallScreen
                        ? "1fr"
                        : "minmax(0, 2fr) minmax(0, 3fr)",
                    gap: 0,
                    height: "100%",
                    overflow: "hidden",
                    paddingBottom: "1rem",
                    paddingLeft: "8px",
                }}>
                {/* List Pane */}
                <Card
                    className="lg:col-span-1 rounded-none shadow-none border-0 bg-transparent messages-list"
                    style={{ height: "100%", overflow: "hidden" }}>
                    <CardContent
                        className="p-0 flex flex-col bg-transparent"
                        style={{ height: "100%", overflow: "hidden" }}>
                        <div className="p-4">
                            <div
                                className="relative"
                                style={{
                                    minWidth: 170,
                                    width: "100%",
                                    paddingRight: "12px",
                                    paddingLeft: "16px",
                                    paddingTop: isSmallScreen ? "0px" : "14px",
                                }}>
                                <style>{`#searchMessages::placeholder { color:rgb(133, 133, 139) !important; }`}</style>
                                <Search
                                    className="absolute"
                                    style={{
                                        color: "rgb(133,133,139)",
                                        top: isSmallScreen ? "50%" : "60%",
                                        left: "30px",
                                        transform: "translateY(-50%)",
                                        pointerEvents: "none",
                                    }}
                                    size={16}
                                    strokeWidth={1.9}
                                />
                                <Input
                                    id="searchMessages"
                                    placeholder="Search messages..."
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
                        <div className="px-4 py-3 border-b flex flex-wrap gap-2">
                            <Button
                                ref={allButtonRef}
                                key={`all-${lastActiveChip}`}
                                variant="outline"
                                className={`h-9 px-3 text-sm rounded-full border transition-colors outline-none focus:outline-none ring-0 focus:ring-0 text-gray-900 hover:text-gray-900 focus:text-gray-900 active:text-gray-900`}
                                onClick={() => {
                                    setFilterRead("all");
                                    setFilterType("all");
                                    setLastActiveChip("read-all");
                                }}
                                style={{
                                    backgroundColor:
                                        lastActiveChip === "read-all"
                                            ? chipActiveBg
                                            : chipBg,
                                    borderColor:
                                        lastActiveChip === "read-all"
                                            ? "rgba(102, 140, 247, 0.45)"
                                            : "#E4E5E3",
                                    color:
                                        lastActiveChip === "read-all"
                                            ? "rgba(0, 26, 96, 0.86)"
                                            : undefined,
                                }}
                                onLoad={() => {
                                    console.log(
                                        "All button loaded, lastActiveChip:",
                                        lastActiveChip
                                    );
                                }}
                                onMouseEnter={(e) => {
                                    if (lastActiveChip !== "read-all") {
                                        (
                                            e.currentTarget as HTMLButtonElement
                                        ).style.backgroundColor = chipHoverBg;
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (lastActiveChip === "read-all") {
                                        (
                                            e.currentTarget as HTMLButtonElement
                                        ).style.backgroundColor = chipActiveBg;
                                    } else {
                                        (
                                            e.currentTarget as HTMLButtonElement
                                        ).style.backgroundColor = chipBg;
                                    }
                                }}>
                                {fmt("All", totalAll)}
                            </Button>
                            <Button
                                variant="outline"
                                className={`h-9 px-3 text-sm rounded-full border transition-colors outline-none focus:outline-none ring-0 focus:ring-0 text-gray-900 hover:text-gray-900 focus:text-gray-900 active:text-gray-900`}
                                onClick={() => {
                                    setFilterRead("unread");
                                    setFilterType("all");
                                    setLastActiveChip("read-unread");
                                }}
                                style={{
                                    backgroundColor:
                                        lastActiveChip === "read-unread"
                                            ? chipActiveBg
                                            : chipBg,
                                    borderColor:
                                        lastActiveChip === "read-unread"
                                            ? "rgba(102, 140, 247, 0.45)"
                                            : "#E4E5E3",
                                    color:
                                        lastActiveChip === "read-unread"
                                            ? "rgba(0, 26, 96, 0.86)"
                                            : undefined,
                                }}
                                onMouseEnter={(e) => {
                                    if (lastActiveChip !== "read-unread") {
                                        (
                                            e.currentTarget as HTMLButtonElement
                                        ).style.backgroundColor = chipHoverBg;
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    (
                                        e.currentTarget as HTMLButtonElement
                                    ).style.backgroundColor =
                                        lastActiveChip === "read-unread"
                                            ? chipActiveBg
                                            : chipBg;
                                }}>
                                {fmt("Unread", unreadAll)}
                            </Button>
                            <Button
                                variant="outline"
                                className={`h-9 px-3 text-sm rounded-full border transition-colors outline-none focus:outline-none ring-0 focus:ring-0 text-gray-900 hover:text-gray-900 focus:text-gray-900 active:text-gray-900`}
                                onClick={() => {
                                    setFilterRead("read");
                                    setFilterType("all");
                                    setLastActiveChip("read-read");
                                }}
                                style={{
                                    backgroundColor:
                                        lastActiveChip === "read-read"
                                            ? chipActiveBg
                                            : chipBg,
                                    borderColor:
                                        lastActiveChip === "read-read"
                                            ? "rgba(102, 140, 247, 0.45)"
                                            : "#E4E5E3",
                                    color:
                                        lastActiveChip === "read-read"
                                            ? "rgba(0, 26, 96, 0.86)"
                                            : undefined,
                                }}
                                onMouseEnter={(e) => {
                                    if (lastActiveChip !== "read-read") {
                                        (
                                            e.currentTarget as HTMLButtonElement
                                        ).style.backgroundColor = chipHoverBg;
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    (
                                        e.currentTarget as HTMLButtonElement
                                    ).style.backgroundColor =
                                        lastActiveChip === "read-read"
                                            ? chipActiveBg
                                            : chipBg;
                                }}>
                                {fmt("Read", totalAll - unreadAll)}
                            </Button>
                            <span className="w-px h-6 bg-gray-200 mx-1" />
                            <Button
                                variant="outline"
                                className={`h-9 px-3 text-sm rounded-full border transition-colors outline-none focus:outline-none ring-0 focus:ring-0 text-gray-900 hover:text-gray-900 focus:text-gray-900 active:text-gray-900`}
                                onClick={() => {
                                    setFilterRead("all");
                                    setFilterType("appointment");
                                    setLastActiveChip("type-appointment");
                                }}
                                style={{
                                    backgroundColor:
                                        lastActiveChip === "type-appointment"
                                            ? chipActiveBg
                                            : chipBg,
                                    borderColor:
                                        lastActiveChip === "type-appointment"
                                            ? "rgba(102, 140, 247, 0.45)"
                                            : "#E4E5E3",
                                    color:
                                        lastActiveChip === "type-appointment"
                                            ? "rgba(0, 26, 96, 0.86)"
                                            : undefined,
                                }}
                                onMouseEnter={(e) => {
                                    if (lastActiveChip !== "type-appointment") {
                                        (
                                            e.currentTarget as HTMLButtonElement
                                        ).style.backgroundColor = chipHoverBg;
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    (
                                        e.currentTarget as HTMLButtonElement
                                    ).style.backgroundColor =
                                        lastActiveChip === "type-appointment"
                                            ? chipActiveBg
                                            : chipBg;
                                }}>
                                {fmt("From Appointments", totalAppointment)}
                            </Button>
                            <Button
                                variant="outline"
                                className={`h-9 px-3 text-sm rounded-full border transition-colors outline-none focus:outline-none ring-0 focus:ring-0 text-gray-900 hover:text-gray-900 focus:text-gray-900 active:text-gray-900`}
                                onClick={() => {
                                    setFilterRead("all");
                                    setFilterType("contact");
                                    setLastActiveChip("type-contact");
                                }}
                                style={{
                                    backgroundColor:
                                        lastActiveChip === "type-contact"
                                            ? chipActiveBg
                                            : chipBg,
                                    borderColor:
                                        lastActiveChip === "type-contact"
                                            ? "rgba(102, 140, 247, 0.45)"
                                            : "#E4E5E3",
                                    color:
                                        lastActiveChip === "type-contact"
                                            ? "rgba(0, 26, 96, 0.86)"
                                            : undefined,
                                }}
                                onMouseEnter={(e) => {
                                    if (lastActiveChip !== "type-contact") {
                                        (
                                            e.currentTarget as HTMLButtonElement
                                        ).style.backgroundColor = chipHoverBg;
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    (
                                        e.currentTarget as HTMLButtonElement
                                    ).style.backgroundColor =
                                        lastActiveChip === "type-contact"
                                            ? chipActiveBg
                                            : chipBg;
                                }}>
                                {fmt("Contact Form", totalContact)}
                            </Button>
                        </div>
                        <style>{`
                            #messagesListScroll .message-row:hover{background-color: #F3F4F6 !important;} 
                            .delete-btn:hover{ background-color: rgba(211, 81, 76, 0.08) !important; border-color: rgba(212,66,61,0.9) !important; }
                            @media (min-width: 1150px) {
                                .message-header-content {
                                    flex-direction: row !important;
                                    align-items: center !important;
                                    justify-content: space-between !important;
                                }
                                .message-date {
                                    flex-shrink: 0 !important;
                                }
                            }
                        `}</style>
                        <div
                            id="messagesListScroll"
                            className="flex-1 overflow-y-auto"
                            style={{ border: "none" }}>
                            {loading ? (
                                <div className="text-center py-12">
                                    <p className="text-gray-500">
                                        Loading messages...
                                    </p>
                                </div>
                            ) : filteredMessages.length === 0 ? (
                                <div className="text-center py-12">
                                    <MessageSquare
                                        className="mx-auto h-12 w-12 mb-4"
                                        style={{ color: "#878787" }}
                                    />
                                    <p style={{ color: "#878787" }}>
                                        No messages found
                                    </p>
                                </div>
                            ) : (
                                filteredMessages.map((msg) => (
                                    <div
                                        key={`${msg.type}-${msg.id}`}
                                        onClick={() => {
                                            setSelectedMessage(msg as any);
                                            if (
                                                typeof window !== "undefined" &&
                                                window.innerWidth < 820
                                            ) {
                                                setIsDetailFullscreen(true);
                                            }
                                            // Optimistically mark as read locally so the unread dot disappears immediately
                                            if (
                                                (msg as any).is_read === false
                                            ) {
                                                // optimistically mark the clicked message as read
                                                setSelectedMessage({
                                                    ...(msg as any),
                                                    is_read: true,
                                                } as any);

                                                if (msg.type === "contact") {
                                                    setContactMessages((prev) =>
                                                        prev.map((m) =>
                                                            m.id === msg.id
                                                                ? {
                                                                      ...m,
                                                                      is_read:
                                                                          true,
                                                                  }
                                                                : m
                                                        )
                                                    );
                                                    // persist change for contact messages
                                                    handleMarkAsRead(msg.id);
                                                } else {
                                                    // appointment messages: update local state so dot disappears
                                                    setAppointmentMessages(
                                                        (prev: any) =>
                                                            prev.map((m: any) =>
                                                                m.id === msg.id
                                                                    ? {
                                                                          ...m,
                                                                          is_read:
                                                                              true,
                                                                      }
                                                                    : m
                                                            )
                                                    );
                                                    // persist appointment read status
                                                    handleMarkAppointmentAsRead(
                                                        msg.id
                                                    );
                                                }
                                            }
                                        }}
                                        className="message-row px-4 py-6 cursor-pointer transition-colors border-b border-gray-200"
                                        onMouseEnter={(e) => {
                                            const isSelected =
                                                selectedMessage?.id === msg.id;
                                            if (!isSelected) {
                                                (
                                                    e.currentTarget as HTMLDivElement
                                                ).style.backgroundColor =
                                                    "#F3F4F6";
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            const isSelected =
                                                selectedMessage?.id === msg.id;
                                            if (!isSelected) {
                                                (
                                                    e.currentTarget as HTMLDivElement
                                                ).style.backgroundColor = "";
                                            }
                                        }}
                                        style={{
                                            borderBottom: "1px solid #E5E7EB",
                                            ...(selectedMessage?.id === msg.id
                                                ? {
                                                      backgroundColor:
                                                          "rgba(120, 151, 202, 0.12)",
                                                  }
                                                : {}),
                                        }}>
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0 flex-1 flex items-start gap-3">
                                                <div className="flex-shrink-0 relative">
                                                    {(msg as any).is_read ===
                                                        false && (
                                                        <div
                                                            className="absolute w-4 h-4 rounded-full border-2"
                                                            style={{
                                                                left: "-6px",
                                                                top: "-6px",
                                                                zIndex: 10,
                                                                backgroundColor:
                                                                    "#3B82F6",
                                                                borderColor:
                                                                    "#3B82F6",
                                                                animation:
                                                                    "flash 2s ease-in-out infinite",
                                                            }}></div>
                                                    )}
                                                    <div
                                                        className="rounded-full flex items-center justify-center overflow-hidden"
                                                        style={{
                                                            width: 45,
                                                            height: 45,
                                                            backgroundColor:
                                                                "#F5F5DC",
                                                        }}>
                                                        <span className="text-sm font-bold text-black">
                                                            {msg.customer_name
                                                                .split(" ")
                                                                .map(
                                                                    (n) => n[0]
                                                                )
                                                                .join("")
                                                                .toUpperCase()
                                                                .slice(0, 2)}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="min-w-0 flex-1 overflow-hidden">
                                                    <div className="flex items-center gap-2">
                                                        <h3
                                                            className="font-semibold text-gray-900 truncate"
                                                            style={{
                                                                fontWeight: 500,
                                                            }}>
                                                            {msg.customer_name}
                                                        </h3>
                                                        {/* type badge removed */}
                                                    </div>
                                                    <p
                                                        className="mt-1 text-sm text-gray-600"
                                                        style={{
                                                            overflow: "hidden",
                                                            textOverflow:
                                                                "ellipsis",
                                                            whiteSpace:
                                                                "nowrap",
                                                            maxWidth: "100%",
                                                            color: "#818189",
                                                        }}>
                                                        {msg.message}
                                                    </p>
                                                </div>
                                            </div>
                                            <span
                                                className="text-xs text-gray-500 flex-shrink-0 whitespace-nowrap"
                                                style={{ color: "#818189" }}>
                                                {relativeTime(msg.created_at)}
                                            </span>
                                            <div
                                                style={{
                                                    height: 1,
                                                    backgroundColor: "#E5E7EB",
                                                    marginTop: 8,
                                                }}
                                            />
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Detail Pane */}
                <Card
                    className="lg:col-span-1 rounded-lg shadow-none bg-transparent messages-detail"
                    style={{
                        height: "100%",
                        overflow: "hidden",
                        border: "1px solid #E5E7EB",
                        borderRadius: "0.5rem",
                        backgroundColor: "#ffffff",
                        marginRight: "1rem",
                        marginBottom: "1rem",
                    }}>
                    <CardContent
                        className="p-0 flex flex-col bg-transparent"
                        style={{ height: "100%", overflow: "hidden" }}>
                        {selectedMessage ? (
                            <div
                                className={`flex flex-col h-full ${
                                    isDetailFullscreen
                                        ? "messages-detail-fullscreen"
                                        : ""
                                }`}>
                                <div
                                    className="border-b message-header-responsive"
                                    style={{ padding: "1rem 1.25rem" }}>
                                    {isDetailFullscreen && isSmallScreen && (
                                        <button
                                            className="back-btn"
                                            aria-label="Back to list"
                                            onClick={() => {
                                                setIsDetailFullscreen(false);
                                                setSelectedMessage(null);
                                            }}>
                                            <svg
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                xmlns="http://www.w3.org/2000/svg"
                                                aria-hidden="true">
                                                <path
                                                    d="M15 18L9 12L15 6"
                                                    stroke="currentColor"
                                                    strokeWidth="2.5"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                />
                                            </svg>
                                        </button>
                                    )}
                                    <div
                                        className="flex gap-1"
                                        style={{
                                            flexDirection: isDetailsWide
                                                ? "row"
                                                : "column",
                                            alignItems: isDetailsWide
                                                ? "center"
                                                : "flex-start",
                                            justifyContent: isDetailsWide
                                                ? "space-between"
                                                : "flex-start",
                                        }}>
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div
                                                className="rounded-full flex items-center justify-center overflow-hidden"
                                                style={{
                                                    width: 50,
                                                    height: 50,
                                                    backgroundColor: "#F5F5DC",
                                                    alignSelf: isDetailsWide
                                                        ? "flex-start"
                                                        : "center",
                                                }}>
                                                <span className="text-lg font-bold text-black">
                                                    {selectedMessage.customer_name
                                                        .split(" ")
                                                        .map((n) => n[0])
                                                        .join("")
                                                        .toUpperCase()
                                                        .slice(0, 2)}
                                                </span>
                                            </div>
                                            <div
                                                className="min-w-0"
                                                style={{
                                                    display: "flex",
                                                    flexDirection: "column",
                                                    justifyContent:
                                                        isDetailsWide
                                                            ? "flex-start"
                                                            : "space-between",
                                                    minHeight: isDetailsWide
                                                        ? undefined
                                                        : 50,
                                                }}>
                                                <div className="flex items-center gap-4">
                                                    <div
                                                        className="text-lg font-semibold text-gray-900 truncate"
                                                        style={{
                                                            fontWeight: 500,
                                                        }}>
                                                        {
                                                            selectedMessage.customer_name
                                                        }
                                                    </div>
                                                    {"type" in
                                                        selectedMessage &&
                                                        ((
                                                            selectedMessage as any
                                                        ).type ===
                                                        "appointment" ? (
                                                            <span
                                                                className={`inline-flex items-center gap-1 rounded-md text-xs font-small border whitespace-nowrap`}
                                                                style={{
                                                                    backgroundColor:
                                                                        "#bfdbfe",
                                                                    color: "#1e3a8a",
                                                                    borderWidth: 0.5,
                                                                    borderStyle:
                                                                        "solid",
                                                                    borderColor:
                                                                        "#60a5fa",
                                                                    minWidth: 50,
                                                                    justifyContent:
                                                                        "center",
                                                                    whiteSpace:
                                                                        "nowrap",
                                                                    padding:
                                                                        "2px 6px",
                                                                }}>
                                                                Appointment
                                                            </span>
                                                        ) : (
                                                              selectedMessage as any
                                                          ).type ===
                                                          "contact" ? (
                                                            <span
                                                                className={`inline-flex items-center gap-1 rounded-md text-xs font-small border whitespace-nowrap`}
                                                                style={{
                                                                    backgroundColor:
                                                                        "#fecaca",
                                                                    color: "#7f1d1d",
                                                                    borderWidth: 1,
                                                                    borderStyle:
                                                                        "solid",
                                                                    borderColor:
                                                                        "#f87171",
                                                                    minWidth: 72,
                                                                    justifyContent:
                                                                        "center",
                                                                    whiteSpace:
                                                                        "nowrap",
                                                                    padding:
                                                                        "2px 6px",
                                                                }}>
                                                                Contact
                                                            </span>
                                                        ) : null)}
                                                </div>

                                                <div
                                                    className="text-sm text-gray-600 message-date"
                                                    style={{
                                                        color: "#71717A",
                                                        paddingLeft: 0,
                                                        marginTop: isDetailsWide
                                                            ? 0
                                                            : 4,
                                                    }}>
                                                    {format(
                                                        new Date(
                                                            selectedMessage.created_at
                                                        ),
                                                        "MMMM d, yyyy 'at' h:mm a"
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div
                                    ref={detailsRef}
                                    className="flex-1 flex flex-col justify-between"
                                    style={{
                                        padding: "1rem",
                                        overflowY: "auto",
                                        overflowX: "hidden",
                                        minHeight: 0,
                                    }}>
                                    <div className="flex flex-col gap-4">
                                        <div>
                                            {"type" in selectedMessage &&
                                                (selectedMessage as any)
                                                    .type === "appointment" &&
                                                "appointment_date" in
                                                    selectedMessage && (
                                                    <div className="p-3 bg-gray-50 rounded-lg">
                                                        <p
                                                            className="text-sm font-medium"
                                                            style={{
                                                                color: "rgb(93, 93, 93)",
                                                            }}>
                                                            Related Appointment
                                                        </p>
                                                        <p
                                                            className="text-sm"
                                                            style={{
                                                                color: "rgb(93, 93, 93)",
                                                            }}>
                                                            {
                                                                (
                                                                    selectedMessage as any
                                                                ).services?.name
                                                            }{" "}
                                                            -{" "}
                                                            {format(
                                                                new Date(
                                                                    (
                                                                        selectedMessage as any
                                                                    ).appointment_date
                                                                ),
                                                                "MMM dd, yyyy"
                                                            )}{" "}
                                                            at{" "}
                                                            {(
                                                                selectedMessage as any
                                                            ).appointment_time.slice(
                                                                0,
                                                                5
                                                            )}
                                                        </p>
                                                    </div>
                                                )}
                                        </div>

                                        <div className="flex-1 p-4 bg-gray-50 rounded-lg">
                                            <p
                                                className="text-gray-800 whitespace-pre-wrap break-words"
                                                style={{
                                                    overflowWrap: "anywhere",
                                                    fontWeight: 400,
                                                }}>
                                                {"message" in selectedMessage
                                                    ? (selectedMessage as any)
                                                          .message
                                                    : ""}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="pt-4">
                                        <div
                                            className="rounded-lg bg-gray-50"
                                            style={{
                                                backgroundColor: "#F3F4F6",
                                                padding: "0.75rem",
                                            }}>
                                            <h5
                                                className="text-base md:text-lg text-gray-900 mb-1"
                                                style={{ fontWeight: 600 }}>
                                                Customer Info
                                            </h5>

                                            <div className="text-sm md:text-base text-gray-700 ">
                                                <span
                                                    className="font-medium"
                                                    style={{
                                                        color: "#71717A",
                                                        fontWeight: 400,
                                                    }}>
                                                    Email:
                                                </span>{" "}
                                                <span
                                                    className="ml-1 text-sm md:text-base text-gray-400"
                                                    style={{
                                                        color: "#71717A",
                                                    }}>
                                                    {
                                                        selectedMessage.customer_email
                                                    }
                                                </span>
                                            </div>

                                            {"customer_phone" in
                                                selectedMessage &&
                                                selectedMessage.customer_phone && (
                                                    <div className="text-sm md:text-base text-gray-700">
                                                        <span
                                                            className="font-medium"
                                                            style={{
                                                                color: "#71717A",
                                                                fontWeight: 400,
                                                            }}>
                                                            Phone:
                                                        </span>{" "}
                                                        <span
                                                            className="ml-1 text-sm md:text-base text-gray-400"
                                                            style={{
                                                                color: "#71717A",
                                                            }}>
                                                            {formatPhone(
                                                                selectedMessage.customer_phone
                                                            )}
                                                        </span>
                                                    </div>
                                                )}
                                        </div>
                                    </div>
                                </div>

                                <div
                                    className="border-t bg-gray-50 flex flex-row items-center justify-end gap-3 overflow-x-auto whitespace-nowrap"
                                    style={{ padding: "0.75rem 1.25rem" }}>
                                    {"is_read" in selectedMessage &&
                                        (selectedMessage as Message)
                                            .is_read && (
                                            <Button
                                                className="admin-primary-btn h-10 px-6 rounded-md outline-none focus:outline-none ring-0 focus:ring-0 focus-visible:ring-0 ring-offset-0 focus-visible:ring-offset-0 transition-colors"
                                                onClick={() => {
                                                    if (
                                                        (selectedMessage as any)
                                                            .type ===
                                                        "appointment"
                                                    ) {
                                                        handleMarkAppointmentAsUnread(
                                                            selectedMessage.id
                                                        );
                                                    } else {
                                                        handleMarkAsUnread(
                                                            selectedMessage.id
                                                        );
                                                    }
                                                }}>
                                                Mark as Unread
                                            </Button>
                                        )}
                                    {"is_read" in selectedMessage && (
                                        <Button
                                            variant="destructive"
                                            className="h-10 px-6 delete-btn"
                                            style={{
                                                backgroundColor: "#ffffff",
                                                color: "#d4183d",
                                                border: "1px solid #d4183d",
                                            }}
                                            onClick={() => {
                                                setDeleteConfirm({
                                                    open: true,
                                                    id: selectedMessage.id,
                                                    type:
                                                        (selectedMessage as any)
                                                            .type ===
                                                        "appointment"
                                                            ? "appointment"
                                                            : "contact",
                                                });
                                            }}>
                                            Delete
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div
                                className="flex flex-col items-center justify-center h-full min-h-[400px] p-10"
                                style={{ color: "#6b7280" }}>
                                <div className="relative mb-6">
                                    <svg
                                        width="64"
                                        height="64"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        className="text-gray-500"
                                        style={{ color: "#878787" }}>
                                        <path
                                            d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
                                            stroke="currentColor"
                                            strokeWidth="1.5"
                                            fill="none"
                                        />
                                        <path
                                            d="M22 6l-10 7L2 6"
                                            stroke="currentColor"
                                            strokeWidth="1.5"
                                            fill="none"
                                        />
                                    </svg>
                                    <div
                                        className="absolute -top-1 -right-1 w-3 h-3 bg-gray-500 rounded-full"
                                        style={{
                                            backgroundColor: "#878787",
                                        }}></div>
                                </div>
                                <h3
                                    className="text-lg font-semibold text-gray-500 mb-2"
                                    style={{ color: "#878787" }}>
                                    Select a message
                                </h3>
                                <p
                                    className="text-sm text-gray-500 text-center whitespace-nowrap"
                                    style={{ color: "#878787" }}>
                                    Choose a message from the list to view its
                                    details.
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
