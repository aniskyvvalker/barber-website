import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "../../lib/supabase";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { toast } from "../../hooks/use-toast";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Badge } from "../../components/ui/badge";
import { Switch } from "../../components/ui/switch";
import {
    Users,
    Plus,
    Edit,
    Trash2,
    UserCheck,
    UserX,
    Clock,
    X,
    Calendar,
} from "lucide-react";

interface Barber {
    id: string;
    name: string;
    title: string;
    photo_url: string | null;
    is_active: boolean;
    created_at: string;
}

interface BarberSchedule {
    id: string;
    barber_id: string;
    day_of_week: number;
    is_working: boolean;
    start_time: string | null;
    end_time: string | null;
}

const DAYS = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
];

type TimePickerState = {
    open: boolean;
    dayOfWeek?: number;
    type?: "start" | "end";
    dialog?: "new" | "manage";
    value?: string; // "HH:MM"
};

function TimePicker({
    initial,
    onCancel,
    onConfirm,
    onChange,
    align = "below",
    minTime,
}: {
    initial: string;
    onCancel: () => void;
    onConfirm?: (value: string) => void;
    onChange?: (value: string) => void;
    align?: "below" | "below-left" | "right";
    minTime?: string; // "HH:MM" in 24h
}) {
    const [hour, setHour] = React.useState(() => {
        const h = parseInt(initial.split(":")[0] || "0", 10);
        let hh = h % 12;
        if (hh === 0) hh = 12;
        return hh;
    });
    const [minute, setMinute] = React.useState(() => {
        const m = parseInt(initial.split(":")[1] || "0", 10);
        return Math.round(m / 5) * 5;
    });
    const [ampm, setAmpm] = React.useState(() => {
        const h = parseInt(initial.split(":")[0] || "0", 10);
        return h >= 12 ? "PM" : "AM";
    });

    const pad = (n: number) => String(n).padStart(2, "0");

    const emit = (h: number, m: number, ap: string) => {
        let hh = h % 12;
        if (ap === "PM") hh += 12;
        const val = `${pad(hh)}:${pad(m)}`;
        if (onChange) {
            onChange(val);
        } else if (onConfirm) {
            onConfirm(val);
        }
    };

    const wrapRef = React.useRef<HTMLDivElement | null>(null);

    // parse minTime into minutes since midnight if provided
    const minTotal = React.useMemo(() => {
        if (!minTime) return null;
        const parts = minTime.split(":");
        if (parts.length < 2) return null;
        const mh = parseInt(parts[0], 10) || 0;
        const mm = parseInt(parts[1], 10) || 0;
        return mh * 60 + mm;
    }, [minTime]);

    const hourTo24 = (h: number, ap: string) => {
        let hh = h % 12;
        if (ap === "PM") hh += 12;
        return hh;
    };

    React.useEffect(() => {
        function handleOutside(e: MouseEvent) {
            const el = wrapRef.current;
            if (!el) return;
            const target = e.target as Node | null;
            if (target && !el.contains(target)) {
                // apply current selection then close
                emit(hour, minute, ampm);
                onCancel();
            }
        }
        document.addEventListener("mousedown", handleOutside);
        return () => document.removeEventListener("mousedown", handleOutside);
    }, [hour, minute, ampm, onCancel]);

    // position the popover below by default, or to the right when requested
    let popStyle: React.CSSProperties;
    if (align === "right") {
        popStyle = {
            position: "absolute",
            zIndex: 30,
            left: "100%",
            top: 0,
            marginLeft: 8,
        };
    } else if (align === "below-left") {
        popStyle = {
            position: "absolute",
            zIndex: 30,
            left: 0,
            top: "100%",
            marginTop: 8,
        };
    } else {
        popStyle = {
            position: "absolute",
            zIndex: 30,
            right: 0,
            top: "100%",
            marginTop: 8,
        };
    }

    return (
        <div style={popStyle} ref={wrapRef as any}>
            <div
                style={{
                    background: "#fff",
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                    padding: 8,
                    boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
                }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <select
                        value={String(hour)}
                        className="timepicker-select"
                        onChange={(e) => {
                            const nh = parseInt(e.target.value, 10);
                            setHour(nh);
                            // auto-switch am/pm if current selection would be < minTotal
                            let newAmpm = ampm;
                            if (minTotal != null) {
                                const totalAsCurrent =
                                    hourTo24(nh, ampm) * 60 + minute;
                                const otherAp = ampm === "AM" ? "PM" : "AM";
                                const totalAsOther =
                                    hourTo24(nh, otherAp) * 60 + minute;
                                if (
                                    totalAsCurrent < minTotal &&
                                    totalAsOther >= minTotal
                                ) {
                                    newAmpm = otherAp;
                                    setAmpm(newAmpm);
                                }
                            }
                            emit(nh, minute, newAmpm);
                        }}
                        style={{ padding: 4, width: 50 }}>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(
                            (h) => {
                                const maxTotalForHourAM =
                                    hourTo24(h, "AM") * 60 + 55;
                                const maxTotalForHourPM =
                                    hourTo24(h, "PM") * 60 + 55;
                                const disabled =
                                    minTotal != null &&
                                    maxTotalForHourAM < minTotal &&
                                    maxTotalForHourPM < minTotal;
                                return (
                                    <option
                                        key={h}
                                        value={h}
                                        disabled={disabled}>
                                        {String(h).padStart(2, "0")}
                                    </option>
                                );
                            }
                        )}
                    </select>
                    <span
                        style={{
                            fontSize: 16,
                            color: "#9CA3AF",
                        }}>
                        :
                    </span>
                    <select
                        value={String(minute)}
                        className="timepicker-select"
                        onChange={(e) => {
                            const nm = parseInt(e.target.value, 10);
                            setMinute(nm);
                            // auto-switch am/pm if needed
                            let newAmpm = ampm;
                            if (minTotal != null) {
                                const totalAsCurrent =
                                    hourTo24(hour, ampm) * 60 + nm;
                                const otherAp = ampm === "AM" ? "PM" : "AM";
                                const totalAsOther =
                                    hourTo24(hour, otherAp) * 60 + nm;
                                if (
                                    totalAsCurrent < minTotal &&
                                    totalAsOther >= minTotal
                                ) {
                                    newAmpm = otherAp;
                                    setAmpm(newAmpm);
                                }
                            }
                            emit(hour, nm, newAmpm);
                        }}
                        style={{ padding: 4, width: 50 }}>
                        {Array.from({ length: 12 }, (_, i) => i * 5).map(
                            (m) => {
                                const totalAsAm = hourTo24(hour, "AM") * 60 + m;
                                const totalAsPm = hourTo24(hour, "PM") * 60 + m;
                                const disabled =
                                    minTotal != null &&
                                    totalAsAm < minTotal &&
                                    totalAsPm < minTotal;
                                return (
                                    <option
                                        key={m}
                                        value={m}
                                        disabled={disabled}>
                                        {String(m).padStart(2, "0")}
                                    </option>
                                );
                            }
                        )}
                    </select>
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                        }}>
                        <div
                            style={{
                                position: "relative",
                                display: "inline-flex",
                                background: "#eef2f6",
                                padding: 2,
                                borderRadius: 8,
                                alignItems: "center",
                                overflow: "hidden",
                            }}>
                            {/* sliding white indicator */}
                            <div
                                style={{
                                    position: "absolute",
                                    left: 2,
                                    top: 2,
                                    width: "45%",
                                    height: "calc(100% - 4px)",
                                    background: "#fff",
                                    borderRadius: 6,
                                    transform:
                                        ampm === "AM"
                                            ? "translateX(0)"
                                            : "translateX(110%)",
                                    transition:
                                        "transform 220ms cubic-bezier(.4,0,.2,1)",
                                }}
                            />
                            {
                                // determine whether AM/PM would produce a time >= minTotal
                            }
                            {(() => {
                                const hourAsAm = hourTo24(hour, "AM");
                                const hourAsPm = hourTo24(hour, "PM");
                                const totalAsAm = hourAsAm * 60 + minute;
                                const totalAsPm = hourAsPm * 60 + minute;
                                const allowAM =
                                    minTotal == null || totalAsAm >= minTotal;
                                const allowPM =
                                    minTotal == null || totalAsPm >= minTotal;
                                return (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (!allowAM) return;
                                                setAmpm("AM");
                                                emit(hour, minute, "AM");
                                            }}
                                            disabled={!allowAM}
                                            style={{
                                                position: "relative",
                                                zIndex: 1,
                                                border: "none",
                                                background: "transparent",
                                                color:
                                                    ampm === "AM"
                                                        ? "#2563EB"
                                                        : allowAM
                                                        ? "#6B7280"
                                                        : "#c7c9cc",
                                                padding: "4px 8px",
                                                borderRadius: 6,
                                                marginRight: 4,
                                                cursor: allowAM
                                                    ? "pointer"
                                                    : "not-allowed",
                                                fontSize: 12,
                                            }}>
                                            AM
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (!allowPM) return;
                                                setAmpm("PM");
                                                emit(hour, minute, "PM");
                                            }}
                                            disabled={!allowPM}
                                            style={{
                                                position: "relative",
                                                zIndex: 1,
                                                border: "none",
                                                background: "transparent",
                                                color:
                                                    ampm === "PM"
                                                        ? "#2563EB"
                                                        : allowPM
                                                        ? "#6B7280"
                                                        : "#c7c9cc",
                                                padding: "4px 8px",
                                                borderRadius: 6,
                                                cursor: allowPM
                                                    ? "pointer"
                                                    : "not-allowed",
                                                fontSize: 12,
                                            }}>
                                            PM
                                        </button>
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function snapTimeToStep(timeStr: string, stepMinutes = 5) {
    if (!timeStr) return timeStr;
    const parts = timeStr.split(":");
    if (parts.length < 2) return timeStr;
    let h = parseInt(parts[0], 10) || 0;
    let m = parseInt(parts[1], 10) || 0;
    let total = h * 60 + m;
    const snappedTotal = Math.round(total / stepMinutes) * stepMinutes;
    const newH = Math.floor((snappedTotal % (24 * 60)) / 60);
    const newM = snappedTotal % 60;
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(newH)}:${pad(newM)}`;
}

export default function Barbers() {
    const [barbers, setBarbers] = useState<Barber[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
    const [editingBarber, setEditingBarber] = useState<Barber | null>(null);
    const [selectedBarberForSchedule, setSelectedBarberForSchedule] = useState<
        string | null
    >(null);
    const [barberSchedules, setBarberSchedules] = useState<BarberSchedule[]>(
        []
    );
    const [submitting, setSubmitting] = useState(false);
    const [barberDelete, setBarberDelete] = useState<{
        open: boolean;
        id?: string;
        name?: string;
    }>({ open: false });

    const [formData, setFormData] = useState({
        name: "",
        title: "",
        photo_url: "",
    });

    const [newBarberSchedules, setNewBarberSchedules] = useState<
        Omit<BarberSchedule, "id" | "barber_id">[]
    >(
        // Initialize with default schedule (all days not working)
        Array.from({ length: 7 }, (_, i) => ({
            day_of_week: i,
            is_working: false,
            start_time: "10:00:00",
            end_time: "20:00:00",
        }))
    );

    const [isVerySmallScreen, setIsVerySmallScreen] = useState(false);
    const hasInvalidSchedule = useMemo(() => {
        return newBarberSchedules.some((s) => {
            if (!s.is_working) return false;
            const st = (s.start_time || "00:00:00").slice(0, 5);
            const et = (s.end_time || "00:00:00").slice(0, 5);
            const [sh, sm] = st.split(":").map(Number);
            const [eh, em] = et.split(":").map(Number);
            const startTotal = sh * 60 + sm;
            const endTotal = eh * 60 + em;
            return endTotal <= startTotal;
        });
    }, [newBarberSchedules]);
    const [isTinyScreen, setIsTinyScreen] = useState(false);
    const [timePicker, setTimePicker] = useState<TimePickerState>({
        open: false,
    });

    useEffect(() => {
        const check = () => {
            setIsVerySmallScreen(
                typeof window !== "undefined" ? window.innerWidth <= 377 : false
            );
            setIsTinyScreen(
                typeof window !== "undefined" ? window.innerWidth < 345 : false
            );
        };
        check();
        window.addEventListener("resize", check);
        return () => window.removeEventListener("resize", check);
    }, []);

    useEffect(() => {
        fetchBarbers();
    }, []);

    const fetchBarbers = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("barbers")
            .select("*")
            .order("created_at", { ascending: true });

        if (error) {
            console.error("Error fetching barbers:", error);
        } else {
            setBarbers(data || []);
        }
        setLoading(false);
    };

    const fetchBarberSchedule = async (barberId: string) => {
        const { data, error } = await supabase
            .from("barber_schedules")
            .select("*")
            .eq("barber_id", barberId)
            .order("day_of_week");

        if (error) {
            console.error("Error fetching schedule:", error);
            return [] as BarberSchedule[];
        }
        return (data || []) as BarberSchedule[];
    };

    const handleOpenScheduleDialog = async (barberId: string) => {
        setSelectedBarberForSchedule(barberId);
        const schedules = await fetchBarberSchedule(barberId);
        setBarberSchedules(schedules);
        console.log("Setting scheduleDialogOpen to true");
        setScheduleDialogOpen(true);
    };

    const handleManageBarber = async (barber: Barber) => {
        setEditingBarber(barber);
        setFormData({
            name: barber.name,
            title: barber.title,
            photo_url: barber.photo_url || "",
        });
        // try to load existing schedules for this barber
        try {
            const schedules = await fetchBarberSchedule(barber.id);
            if (schedules && schedules.length > 0) {
                setNewBarberSchedules(
                    schedules.map((s) => ({
                        day_of_week: s.day_of_week,
                        is_working: s.is_working,
                        start_time: s.start_time || "10:00:00",
                        end_time: s.end_time || "20:00:00",
                    }))
                );
            } else {
                setNewBarberSchedules(
                    Array.from({ length: 7 }, (_, i) => ({
                        day_of_week: i,
                        is_working: false,
                        start_time: "10:00:00",
                        end_time: "20:00:00",
                    }))
                );
            }
        } catch (e) {
            setNewBarberSchedules(
                Array.from({ length: 7 }, (_, i) => ({
                    day_of_week: i,
                    is_working: false,
                    start_time: "10:00:00",
                    end_time: "20:00:00",
                }))
            );
        }
        setDialogOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name || !formData.title) {
            toast({
                title: "Missing fields",
                description: "Please fill in all required fields",
                variant: "destructive",
            });
            return;
        }

        setSubmitting(true);

        try {
            if (editingBarber) {
                const { error } = await supabase
                    .from("barbers")
                    .update({
                        name: formData.name,
                        title: formData.title,
                        photo_url: formData.photo_url || null,
                    })
                    .eq("id", editingBarber.id);

                if (error) throw error;
                // Also persist schedule changes made in the Add/Edit dialog
                try {
                    console.debug(
                        "Saving schedules for barber:",
                        editingBarber.id,
                        newBarberSchedules
                    );
                    for (const schedule of newBarberSchedules) {
                        // check if a schedule row exists for this barber/day
                        const { data: existing, error: selErr } = await supabase
                            .from("barber_schedules")
                            .select("id")
                            .eq("barber_id", editingBarber.id)
                            .eq("day_of_week", schedule.day_of_week)
                            .maybeSingle();
                        if (selErr) throw selErr;

                        if (existing && (existing as any).id) {
                            const existingId = (existing as any).id;
                            console.debug(
                                "Updating schedule id",
                                existingId,
                                "for barber",
                                editingBarber.id
                            );
                            const { error: uErr } = await supabase
                                .from("barber_schedules")
                                .update({
                                    is_working: schedule.is_working,
                                    start_time: schedule.start_time,
                                    end_time: schedule.end_time,
                                })
                                .eq("id", existingId);
                            if (uErr) throw uErr;
                        } else {
                            console.debug(
                                "Inserting schedule for barber",
                                editingBarber.id,
                                "day",
                                schedule.day_of_week
                            );
                            const { error: iErr } = await supabase
                                .from("barber_schedules")
                                .insert({
                                    barber_id: editingBarber.id,
                                    day_of_week: schedule.day_of_week,
                                    is_working: schedule.is_working,
                                    start_time: schedule.start_time,
                                    end_time: schedule.end_time,
                                });
                            if (iErr) throw iErr;
                        }
                    }
                } catch (sErr) {
                    console.error("Error saving schedules for barber:", sErr);
                    // non-fatal: continue but notify user
                    toast({
                        title: "Warning",
                        description: "Failed to fully save schedule changes",
                    });
                }
                // update local array to preserve order
                setBarbers((prev) =>
                    prev.map((b) =>
                        b.id === editingBarber.id
                            ? {
                                  ...b,
                                  name: formData.name,
                                  title: formData.title,
                                  photo_url: formData.photo_url || null,
                              }
                            : b
                    )
                );
            } else {
                const { data: newBarber, error } = await supabase
                    .from("barbers")
                    .insert({
                        name: formData.name,
                        title: formData.title,
                        photo_url: formData.photo_url || null,
                        is_active: true,
                    })
                    .select()
                    .single();

                if (error) throw error;

                if (newBarber) {
                    const schedulesToInsert = newBarberSchedules.map(
                        (schedule) => ({
                            barber_id: newBarber.id,
                            ...schedule,
                        })
                    );

                    await supabase
                        .from("barber_schedules")
                        .insert(schedulesToInsert);
                    // append new barber locally (preserve existing order)
                    setBarbers((prev) => [...prev, newBarber]);
                }
            }

            setFormData({ name: "", title: "", photo_url: "" });
            setNewBarberSchedules(
                Array.from({ length: 7 }, (_, i) => ({
                    day_of_week: i,
                    is_working: false,
                    start_time: "10:00:00",
                    end_time: "20:00:00",
                }))
            );
            setEditingBarber(null);
            setDialogOpen(false);
        } catch (error) {
            console.error("Error saving barber:", error);
            toast({
                title: "Error",
                description: "Failed to save barber",
                variant: "destructive",
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = (barber: Barber) => {
        setEditingBarber(barber);
        setFormData({
            name: barber.name,
            title: barber.title,
            photo_url: barber.photo_url || "",
        });
        setDialogOpen(true);
    };

    const handleToggleActive = async (barber: Barber, checked?: boolean) => {
        const newVal =
            typeof checked === "boolean" ? checked : !barber.is_active;
        const { error } = await supabase
            .from("barbers")
            .update({ is_active: newVal })
            .eq("id", barber.id);

        if (error) {
            console.error("Error toggling barber status:", error);
            toast({
                title: "Error",
                description: "Failed to update barber status",
                variant: "destructive",
            });
        } else {
            toast({ title: "Success", description: "Barber status updated" });
            // update local array to preserve original order
            setBarbers((prev) =>
                prev.map((b) =>
                    b.id === barber.id ? { ...b, is_active: newVal } : b
                )
            );
        }
    };

    const handleDelete = async (barber: Barber) => {
        // legacy fallback - not used when using modal
        const { error } = await supabase
            .from("barbers")
            .delete()
            .eq("id", barber.id);
        if (error) {
            console.error("Error deleting barber:", error);
            toast({
                title: "Error",
                description: "Failed to delete barber",
                variant: "destructive",
            });
        } else {
            toast({
                title: "Deleted",
                description: "Barber deleted successfully",
            });
            setBarbers((prev) => prev.filter((b) => b.id !== barber.id));
        }
    };

    const handleUpdateSchedule = async (
        dayOfWeek: number,
        field: string,
        value: any
    ) => {
        const scheduleIndex = barberSchedules.findIndex(
            (s) => s.day_of_week === dayOfWeek
        );

        if (scheduleIndex >= 0) {
            const updated = [...barberSchedules];
            updated[scheduleIndex] = {
                ...updated[scheduleIndex],
                [field]: value,
            };
            setBarberSchedules(updated);
        }
    };

    const handleUpdateNewBarberSchedule = (
        dayOfWeek: number,
        field: string,
        value: any
    ) => {
        const scheduleIndex = newBarberSchedules.findIndex(
            (s) => s.day_of_week === dayOfWeek
        );

        if (scheduleIndex >= 0) {
            const updated = [...newBarberSchedules];
            updated[scheduleIndex] = {
                ...updated[scheduleIndex],
                [field]: value,
            };
            setNewBarberSchedules(updated);
        }
    };

    const handleSaveSchedule = async () => {
        if (!selectedBarberForSchedule) return;

        setSubmitting(true);

        try {
            for (const schedule of barberSchedules) {
                const { error } = await supabase
                    .from("barber_schedules")
                    .update({
                        is_working: schedule.is_working,
                        start_time: schedule.start_time,
                        end_time: schedule.end_time,
                    })
                    .eq("id", schedule.id);

                if (error) throw error;
            }

            toast({
                title: "Success",
                description: "Schedule updated successfully",
            });
            setScheduleDialogOpen(false);
        } catch (error) {
            console.error("Error updating schedule:", error);
            toast({
                title: "Error",
                description: "Failed to update schedule",
                variant: "destructive",
            });
        } finally {
            setSubmitting(false);
        }
    };

    const activeBarbers = barbers.filter((b) => b.is_active);
    const inactiveBarbers = barbers.filter((b) => !b.is_active);

    return (
        <div
            className="p-6 min-h-screen"
            style={{ backgroundColor: "#F9FAFB" }}>
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold text-gray-900">
                        Barber Management
                    </h2>
                    <p className="text-gray-600 mt-1">
                        Manage your team and their schedules
                    </p>
                </div>

                <Button
                    className="admin-primary-btn h-10 px-4 rounded-md outline-none focus:outline-none ring-0 focus:ring-0 focus-visible:ring-0 ring-offset-0 focus-visible:ring-offset-0 transition-colors"
                    onClick={() => {
                        console.log("Add Barber clicked");
                        setEditingBarber(null);
                        setFormData({ name: "", title: "", photo_url: "" });

                        // Initialize default schedules
                        const defaultSchedules: Omit<
                            BarberSchedule,
                            "id" | "barber_id"
                        >[] = [];
                        for (let day = 0; day <= 6; day++) {
                            if (day === 5) {
                                defaultSchedules.push({
                                    day_of_week: day,
                                    is_working: true,
                                    start_time: "14:00:00",
                                    end_time: "20:00:00",
                                });
                            } else {
                                defaultSchedules.push({
                                    day_of_week: day,
                                    is_working: true,
                                    start_time: "10:00:00",
                                    end_time: "20:00:00",
                                });
                            }
                        }
                        setNewBarberSchedules(defaultSchedules);
                        setDialogOpen(true);
                    }}>
                    <Plus className="h-4 w-4 mr-2" />
                    <span className="btn-text-full">Add Barber</span>
                    <span className="btn-text-short">Add</span>
                </Button>
                {dialogOpen && (
                    <div
                        className="fixed inset-0"
                        style={{
                            position: "fixed",
                            inset: 0,
                            background: "rgba(0,0,0,0.6)",
                            zIndex: 2147483600,
                            backdropFilter: "blur(4px)",
                            WebkitBackdropFilter: "blur(4px)",
                        }}
                        onClick={() => {
                            setDialogOpen(false);
                            setEditingBarber(null);
                            setFormData({ name: "", title: "", photo_url: "" });
                            setNewBarberSchedules(
                                Array.from({ length: 7 }, (_, i) => ({
                                    day_of_week: i,
                                    is_working: false,
                                    start_time: "10:00:00",
                                    end_time: "20:00:00",
                                }))
                            );
                        }}>
                        <div
                            className="relative rounded-xl bg-white shadow-lg overflow-hidden"
                            style={{
                                position: "fixed",
                                left: "50%",
                                top: "50%",
                                transform: "translate(-50%, -50%)",
                                zIndex: 2147483601,
                                width: "min(100%, 640px)",
                                height: "80vh",
                                maxHeight: "80vh",
                                backgroundColor: "#fff",
                                border: "none",
                            }}
                            onClick={(e) => e.stopPropagation()}>
                            <button
                                type="button"
                                onClick={() => {
                                    setDialogOpen(false);
                                    setEditingBarber(null);
                                    setFormData({
                                        name: "",
                                        title: "",
                                        photo_url: "",
                                    });
                                    setNewBarberSchedules(
                                        Array.from({ length: 7 }, (_, i) => ({
                                            day_of_week: i,
                                            is_working: false,
                                            start_time: "10:00:00",
                                            end_time: "20:00:00",
                                        }))
                                    );
                                }}
                                style={{
                                    position: "absolute",
                                    top: "16px",
                                    right: "16px",
                                    background: "none",
                                    border: "none",
                                    cursor: "pointer",
                                    padding: "4px",
                                    color: "#9CA3AF",
                                    transition: "color 0.2s",
                                    zIndex: 10,
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.color = "#4B5563";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.color = "#9CA3AF";
                                }}>
                                <X size={20} />
                            </button>
                            <div className="flex flex-col h-full">
                                {/* Scrollable Content */}
                                <div
                                    className="flex-1 overflow-y-auto barber-dialog-scroll"
                                    style={{ padding: "24px" }}>
                                    <div className="flex flex-col space-y-1.5 text-center sm:text-left">
                                        <h3
                                            className="text-xl font-bold leading-none tracking-tight mb-8"
                                            style={{
                                                color: "#111827",
                                                fontWeight: 600,
                                            }}>
                                            {editingBarber
                                                ? "Edit Barber"
                                                : "Add New Barber"}
                                        </h3>
                                        {editingBarber && (
                                            <p className="text-sm text-gray-500">
                                                Update barber information
                                            </p>
                                        )}
                                    </div>
                                    <form
                                        onSubmit={handleSubmit}
                                        className="space-y-4"
                                        id="addBarberForm">
                                        <div className="space-y-2">
                                            <Label>Name *</Label>
                                            <input
                                                type="text"
                                                placeholder="Marcus Chen"
                                                value={formData.name}
                                                onChange={(e) =>
                                                    setFormData({
                                                        ...formData,
                                                        name: e.target.value,
                                                    })
                                                }
                                                required
                                                maxLength={20}
                                                className="barber-dialog-input flex h-9 w-full rounded-md border px-3 py-1 text-sm outline-none transition-all"
                                                style={{
                                                    backgroundColor: "#F9FAFB",
                                                    color: "#111827",
                                                    borderColor: "#D1D5DB",
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.borderColor =
                                                        "#9CA3AF";
                                                }}
                                                onMouseLeave={(e) => {
                                                    if (
                                                        document.activeElement !==
                                                        e.currentTarget
                                                    ) {
                                                        e.currentTarget.style.borderColor =
                                                            "#D1D5DB";
                                                    }
                                                }}
                                                onFocus={(e) => {
                                                    e.currentTarget.style.borderColor =
                                                        "#9CA3AF";
                                                }}
                                                onBlur={(e) => {
                                                    e.currentTarget.style.borderColor =
                                                        "#D1D5DB";
                                                }}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Title *</Label>
                                            <input
                                                type="text"
                                                placeholder="Master Barber"
                                                value={formData.title}
                                                onChange={(e) =>
                                                    setFormData({
                                                        ...formData,
                                                        title: e.target.value,
                                                    })
                                                }
                                                required
                                                maxLength={25}
                                                className="barber-dialog-input flex h-9 w-full rounded-md border px-3 py-1 text-sm outline-none transition-all"
                                                style={{
                                                    backgroundColor: "#F9FAFB",
                                                    color: "#111827",
                                                    borderColor: "#D1D5DB",
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.borderColor =
                                                        "#9CA3AF";
                                                }}
                                                onMouseLeave={(e) => {
                                                    if (
                                                        document.activeElement !==
                                                        e.currentTarget
                                                    ) {
                                                        e.currentTarget.style.borderColor =
                                                            "#D1D5DB";
                                                    }
                                                }}
                                                onFocus={(e) => {
                                                    e.currentTarget.style.borderColor =
                                                        "#9CA3AF";
                                                }}
                                                onBlur={(e) => {
                                                    e.currentTarget.style.borderColor =
                                                        "#D1D5DB";
                                                }}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Photo URL (Optional)</Label>
                                            <input
                                                type="text"
                                                placeholder="https://example.com/photo.jpg"
                                                value={formData.photo_url}
                                                onChange={(e) =>
                                                    setFormData({
                                                        ...formData,
                                                        photo_url:
                                                            e.target.value,
                                                    })
                                                }
                                                className="barber-dialog-input flex h-9 w-full rounded-md border px-3 py-1 text-sm outline-none transition-all"
                                                style={{
                                                    backgroundColor: "#F9FAFB",
                                                    color: "#111827",
                                                    borderColor: "#D1D5DB",
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.borderColor =
                                                        "#9CA3AF";
                                                }}
                                                onMouseLeave={(e) => {
                                                    if (
                                                        document.activeElement !==
                                                        e.currentTarget
                                                    ) {
                                                        e.currentTarget.style.borderColor =
                                                            "#D1D5DB";
                                                    }
                                                }}
                                                onFocus={(e) => {
                                                    e.currentTarget.style.borderColor =
                                                        "#9CA3AF";
                                                }}
                                                onBlur={(e) => {
                                                    e.currentTarget.style.borderColor =
                                                        "#D1D5DB";
                                                }}
                                            />
                                        </div>

                                        {
                                            <div
                                                className="space-y-3 border-t"
                                                style={{
                                                    marginTop: "1.5rem",
                                                    paddingTop: "1.5rem",
                                                    marginLeft: "-24px",
                                                    marginRight: "-24px",
                                                }}>
                                                <div
                                                    style={{
                                                        paddingLeft: "24px",
                                                        paddingRight: "24px",
                                                    }}>
                                                    <Label
                                                        className="text-base"
                                                        style={{
                                                            fontWeight: 600,
                                                            fontSize: "1rem",
                                                            marginBottom:
                                                                "0.95rem",
                                                            display: "block",
                                                        }}>
                                                        Weekly Schedule
                                                    </Label>
                                                    <div className="space-y-3 max-h-[300px] overflow-y-auto">
                                                        {newBarberSchedules.map(
                                                            (schedule) => (
                                                                <div
                                                                    key={
                                                                        schedule.day_of_week
                                                                    }
                                                                    className="border rounded-lg"
                                                                    style={{
                                                                        backgroundColor:
                                                                            "#FFFFFF",
                                                                        borderColor:
                                                                            "#E5E7EB",
                                                                        padding:
                                                                            "16px",
                                                                    }}>
                                                                    <div
                                                                        className={`flex items-center gap-3 ${
                                                                            schedule.is_working
                                                                                ? "mb-3"
                                                                                : ""
                                                                        }`}>
                                                                        <Switch
                                                                            checked={
                                                                                schedule.is_working
                                                                            }
                                                                            onCheckedChange={(
                                                                                checked
                                                                            ) =>
                                                                                handleUpdateNewBarberSchedule(
                                                                                    schedule.day_of_week,
                                                                                    "is_working",
                                                                                    checked
                                                                                )
                                                                            }
                                                                        />
                                                                        <div>
                                                                            <div className="text-base font-semibold text-gray-900">
                                                                                {
                                                                                    DAYS[
                                                                                        schedule
                                                                                            .day_of_week
                                                                                    ]
                                                                                }
                                                                            </div>
                                                                            <div
                                                                                className="text-sm"
                                                                                style={{
                                                                                    color: "rgb(124, 130, 140)",
                                                                                }}>
                                                                                {schedule.is_working
                                                                                    ? "Available"
                                                                                    : "Unavailable"}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    {schedule.is_working && (
                                                                        <>
                                                                            <div
                                                                                style={{
                                                                                    borderTop:
                                                                                        "1px solid #E5E7EB",
                                                                                    marginTop:
                                                                                        "12px",
                                                                                    marginBottom:
                                                                                        "0px",
                                                                                    marginLeft:
                                                                                        "-16px",
                                                                                    marginRight:
                                                                                        "-16px",
                                                                                }}
                                                                            />
                                                                            <div
                                                                                className="schedule-time-grid"
                                                                                style={{
                                                                                    backgroundColor:
                                                                                        "#F9FAFB",
                                                                                    marginLeft:
                                                                                        "-16px",
                                                                                    marginRight:
                                                                                        "-16px",
                                                                                    marginBottom:
                                                                                        "-16px",
                                                                                    display:
                                                                                        "grid",
                                                                                    gridTemplateColumns:
                                                                                        "1fr auto 1fr",
                                                                                    gap: isVerySmallScreen
                                                                                        ? "12px"
                                                                                        : "24px",
                                                                                    alignItems:
                                                                                        "center",
                                                                                }}>
                                                                                <div
                                                                                    style={{
                                                                                        display:
                                                                                            "flex",
                                                                                        alignItems:
                                                                                            "center",
                                                                                        gap: 12,
                                                                                    }}>
                                                                                    <span
                                                                                        className="start-end-label"
                                                                                        style={{
                                                                                            color: "#6B7280",
                                                                                            fontSize:
                                                                                                "0.875rem",
                                                                                            minWidth: 48,
                                                                                        }}>
                                                                                        Start
                                                                                        :
                                                                                    </span>
                                                                                    <div
                                                                                        style={{
                                                                                            position:
                                                                                                "relative",
                                                                                        }}>
                                                                                        <Input
                                                                                            type="time"
                                                                                            step={
                                                                                                300
                                                                                            }
                                                                                            value={
                                                                                                schedule.start_time?.slice(
                                                                                                    0,
                                                                                                    5
                                                                                                ) ||
                                                                                                "10:00"
                                                                                            }
                                                                                            readOnly
                                                                                            onMouseDown={(
                                                                                                e
                                                                                            ) =>
                                                                                                e.preventDefault()
                                                                                            }
                                                                                            onClick={() =>
                                                                                                setTimePicker(
                                                                                                    {
                                                                                                        open: true,
                                                                                                        dayOfWeek:
                                                                                                            schedule.day_of_week,
                                                                                                        type: "start",
                                                                                                        dialog: "new",
                                                                                                        value:
                                                                                                            schedule.start_time?.slice(
                                                                                                                0,
                                                                                                                5
                                                                                                            ) ||
                                                                                                            "10:00",
                                                                                                    }
                                                                                                )
                                                                                            }
                                                                                            className="barber-dialog-input border border-gray-300 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm"
                                                                                            style={{
                                                                                                backgroundColor:
                                                                                                    "#FFFFFF",
                                                                                                color: "#111827",
                                                                                                paddingRight:
                                                                                                    isTinyScreen
                                                                                                        ? 12
                                                                                                        : 40,
                                                                                            }}
                                                                                        />
                                                                                        {!isTinyScreen && (
                                                                                            <Clock
                                                                                                size={
                                                                                                    15
                                                                                                }
                                                                                                style={{
                                                                                                    position:
                                                                                                        "absolute",
                                                                                                    left: 94,
                                                                                                    top: 0,
                                                                                                    bottom: 0,
                                                                                                    margin: "auto",
                                                                                                    color: "#9CA3AF",
                                                                                                    pointerEvents:
                                                                                                        "none",
                                                                                                }}
                                                                                            />
                                                                                        )}
                                                                                        {timePicker.open &&
                                                                                            timePicker.dialog ===
                                                                                                "new" &&
                                                                                            timePicker.dayOfWeek ===
                                                                                                schedule.day_of_week &&
                                                                                            timePicker.type ===
                                                                                                "start" && (
                                                                                                <TimePicker
                                                                                                    initial={
                                                                                                        timePicker.value ||
                                                                                                        schedule.start_time?.slice(
                                                                                                            0,
                                                                                                            5
                                                                                                        ) ||
                                                                                                        "10:00"
                                                                                                    }
                                                                                                    onCancel={() =>
                                                                                                        setTimePicker(
                                                                                                            {
                                                                                                                open: false,
                                                                                                            }
                                                                                                        )
                                                                                                    }
                                                                                                    onChange={(
                                                                                                        val
                                                                                                    ) => {
                                                                                                        handleUpdateNewBarberSchedule(
                                                                                                            schedule.day_of_week,
                                                                                                            "start_time",
                                                                                                            val +
                                                                                                                ":00"
                                                                                                        );
                                                                                                    }}
                                                                                                    align={
                                                                                                        "below-left"
                                                                                                    }
                                                                                                />
                                                                                            )}
                                                                                    </div>
                                                                                </div>
                                                                                <div
                                                                                    style={{
                                                                                        width: "1px",
                                                                                        height: "32px",
                                                                                        backgroundColor:
                                                                                            "#D1D5DB",
                                                                                    }}
                                                                                />
                                                                                <div
                                                                                    style={{
                                                                                        display:
                                                                                            "flex",
                                                                                        alignItems:
                                                                                            "center",
                                                                                        gap: 12,
                                                                                    }}>
                                                                                    <span
                                                                                        className="start-end-label"
                                                                                        style={{
                                                                                            color: "#6B7280",
                                                                                            fontSize:
                                                                                                "0.875rem",
                                                                                            minWidth: 48,
                                                                                        }}>
                                                                                        End
                                                                                        :
                                                                                    </span>
                                                                                    <div
                                                                                        style={{
                                                                                            position:
                                                                                                "relative",
                                                                                        }}>
                                                                                        <Input
                                                                                            type="time"
                                                                                            step={
                                                                                                300
                                                                                            }
                                                                                            value={
                                                                                                schedule.end_time?.slice(
                                                                                                    0,
                                                                                                    5
                                                                                                ) ||
                                                                                                "20:00"
                                                                                            }
                                                                                            readOnly
                                                                                            onMouseDown={(
                                                                                                e
                                                                                            ) =>
                                                                                                e.preventDefault()
                                                                                            }
                                                                                            onClick={() =>
                                                                                                setTimePicker(
                                                                                                    {
                                                                                                        open: true,
                                                                                                        dayOfWeek:
                                                                                                            schedule.day_of_week,
                                                                                                        type: "end",
                                                                                                        dialog: "new",
                                                                                                        value:
                                                                                                            schedule.end_time?.slice(
                                                                                                                0,
                                                                                                                5
                                                                                                            ) ||
                                                                                                            "20:00",
                                                                                                    }
                                                                                                )
                                                                                            }
                                                                                            className="barber-dialog-input border border-gray-300 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm"
                                                                                            style={{
                                                                                                backgroundColor:
                                                                                                    "#FFFFFF",
                                                                                                color: "#111827",
                                                                                                paddingRight:
                                                                                                    isTinyScreen
                                                                                                        ? 12
                                                                                                        : 40,
                                                                                            }}
                                                                                        />
                                                                                        {!isTinyScreen && (
                                                                                            <Clock
                                                                                                size={
                                                                                                    15
                                                                                                }
                                                                                                style={{
                                                                                                    position:
                                                                                                        "absolute",
                                                                                                    left: 95,
                                                                                                    top: 0,
                                                                                                    bottom: 0,
                                                                                                    margin: "auto",
                                                                                                    color: "#9CA3AF",
                                                                                                    pointerEvents:
                                                                                                        "none",
                                                                                                }}
                                                                                            />
                                                                                        )}
                                                                                        {timePicker.open &&
                                                                                            timePicker.dialog ===
                                                                                                "new" &&
                                                                                            timePicker.dayOfWeek ===
                                                                                                schedule.day_of_week &&
                                                                                            timePicker.type ===
                                                                                                "end" && (
                                                                                                <TimePicker
                                                                                                    initial={
                                                                                                        timePicker.value ||
                                                                                                        schedule.end_time?.slice(
                                                                                                            0,
                                                                                                            5
                                                                                                        ) ||
                                                                                                        "20:00"
                                                                                                    }
                                                                                                    onCancel={() =>
                                                                                                        setTimePicker(
                                                                                                            {
                                                                                                                open: false,
                                                                                                            }
                                                                                                        )
                                                                                                    }
                                                                                                    onChange={(
                                                                                                        val
                                                                                                    ) => {
                                                                                                        handleUpdateNewBarberSchedule(
                                                                                                            schedule.day_of_week,
                                                                                                            "end_time",
                                                                                                            val +
                                                                                                                ":00"
                                                                                                        );
                                                                                                    }}
                                                                                                    minTime={schedule.start_time?.slice(
                                                                                                        0,
                                                                                                        5
                                                                                                    )}
                                                                                                    align={
                                                                                                        "below"
                                                                                                    }
                                                                                                />
                                                                                            )}
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            )
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        }
                                    </form>
                                </div>
                                {/* Footer Actions (sticky at bottom) */}
                                <>
                                    {hasInvalidSchedule && (
                                        <div
                                            style={{
                                                marginLeft: "24px",
                                                marginRight: "24px",
                                                marginBottom: 12,
                                                padding: "10px 12px",
                                                borderRadius: 6,
                                                backgroundColor: "#FEF2F2",
                                                color: "#991B1B",
                                                border: "1px solid #FECACA",
                                            }}>
                                            One or more schedules have an end
                                            time that is not after the start
                                            time. Please fix the schedule times
                                            before saving.
                                        </div>
                                    )}
                                    <div
                                        className="px-6 md:px-8 py-6 border-t bg-gray-50 rounded-b-xl flex flex-row items-center justify-end gap-3 flex-wrap"
                                        style={{ backgroundColor: "#f2f4f7" }}>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="h-11 px-7 whitespace-nowrap rounded-md outline-none focus:outline-none ring-0 focus:ring-0 focus-visible:ring-0 ring-offset-0 focus-visible:ring-offset-0 transition-colors"
                                            style={{
                                                backgroundColor: "#FFFFFF",
                                                color: "#374151",
                                                border: "1px solid #D1D5DB",
                                                paddingLeft: "1rem",
                                                paddingRight: "1rem",
                                                minWidth: "8rem",
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
                                                ).style.backgroundColor =
                                                    "#FFFFFF";
                                            }}
                                            onClick={() => {
                                                setDialogOpen(false);
                                                setEditingBarber(null);
                                                setFormData({
                                                    name: "",
                                                    title: "",
                                                    photo_url: "",
                                                });
                                                setNewBarberSchedules(
                                                    Array.from(
                                                        { length: 7 },
                                                        (_, i) => ({
                                                            day_of_week: i,
                                                            is_working: false,
                                                            start_time:
                                                                "10:00:00",
                                                            end_time:
                                                                "20:00:00",
                                                        })
                                                    )
                                                );
                                            }}>
                                            Cancel
                                        </Button>
                                        <Button
                                            type="submit"
                                            form="addBarberForm"
                                            disabled={
                                                submitting || hasInvalidSchedule
                                            }
                                            className="admin-primary-btn h-11 px-7 whitespace-nowrap rounded-md outline-none focus:outline-none ring-0 focus:ring-0 focus-visible:ring-0 ring-offset-0 focus-visible:ring-offset-0 transition-colors"
                                            style={{
                                                paddingLeft: "1rem",
                                                paddingRight: "1rem",
                                                minWidth: "8rem",
                                            }}>
                                            {submitting
                                                ? "Saving..."
                                                : editingBarber
                                                ? "Update Barber"
                                                : "Add Barber"}
                                        </Button>
                                    </div>
                                </>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="mb-8">
                <div
                    className="service-stats"
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(3, 1fr)",
                        border: "1px solid #E5E7EB",
                        borderRadius: "0.5rem",
                        overflow: "hidden",
                        backgroundColor: "#ffffff",
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
                            Total Barbers
                        </div>
                        <div
                            style={{
                                fontSize: "2.5rem",
                                fontWeight: 500,
                                color: "#111827",
                                marginTop: "0.25rem",
                            }}>
                            {barbers.length}
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
                            Active
                        </div>
                        <div
                            style={{
                                fontSize: "2.5rem",
                                fontWeight: 500,
                                color: "#059669",
                                marginTop: "0.25rem",
                            }}>
                            {activeBarbers.length}
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
                            Inactive
                        </div>
                        <div
                            style={{
                                fontSize: "2.5rem",
                                fontWeight: 500,
                                color: "#9CA3AF",
                                marginTop: "0.25rem",
                            }}>
                            {inactiveBarbers.length}
                        </div>
                    </div>
                </div>
            </div>

            <Card
                className="mb-6 bg-transparent shadow-none border-0"
                style={{
                    backgroundColor: "transparent",
                    boxShadow: "none",
                    border: "none",
                }}>
                <CardHeader>
                    <CardTitle className="text-2xl font-bold text-gray-900">
                        Active Barbers
                    </CardTitle>
                </CardHeader>
                <CardContent className="px-0">
                    {loading ? (
                        <div className="text-center py-12">
                            <p className="text-gray-500">Loading...</p>
                        </div>
                    ) : activeBarbers.length === 0 ? (
                        <div className="text-center py-12">
                            <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                            <p className="text-gray-500">No active barbers</p>
                        </div>
                    ) : (
                        <div
                            className="barber-row px-0"
                            style={{ paddingLeft: 0, paddingRight: 0 }}>
                            {barbers.map((barber) => (
                                <Card
                                    key={barber.id}
                                    className="bg-white rounded-lg overflow-hidden"
                                    style={{
                                        backgroundColor: "#ffffff",
                                        borderColor: "#E5E7EB",
                                        borderWidth: 1,
                                        borderStyle: "solid",
                                        height: "270px",
                                        borderBottomLeftRadius: "1rem",
                                        borderBottomRightRadius: "1rem",
                                    }}>
                                    <div
                                        className="pt-6 px-6 pb-0"
                                        style={{
                                            height: "170px",
                                            overflow: "hidden",
                                            position: "relative",
                                            zIndex: 10,
                                            marginBottom: "-20px",
                                        }}>
                                        <div
                                            className="grid"
                                            style={{
                                                gridTemplateColumns: "64px 1fr",
                                                gap: "16px",
                                                alignItems: "center",
                                            }}>
                                            <div>
                                                <div
                                                    className="rounded-full flex items-center justify-center overflow-hidden"
                                                    style={{
                                                        width: 64,
                                                        height: 64,
                                                        backgroundColor:
                                                            "#F5F5DC",
                                                    }}>
                                                    <span className="text-2xl font-bold text-black">
                                                        {barber.name
                                                            .split(" ")
                                                            .map((n) => n[0])
                                                            .slice(0, 2)
                                                            .join("")}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="min-w-0">
                                                <h3
                                                    className="text-xl font-extrabold text-gray-700"
                                                    style={{
                                                        display: "-webkit-box",
                                                        WebkitLineClamp: 2,
                                                        WebkitBoxOrient:
                                                            "vertical",
                                                        overflow: "hidden",
                                                    }}>
                                                    {barber.name}
                                                </h3>
                                                <p
                                                    className="text-sm mt-1 truncate"
                                                    style={{
                                                        color: "#6B7280",
                                                    }}>
                                                    {barber.title}
                                                </p>
                                            </div>
                                            <div className="col-start-1 mt-3">
                                                <span
                                                    className="inline-flex items-center gap-2 rounded-full text-sm font-medium"
                                                    style={{
                                                        padding: "6px 12px",
                                                        backgroundColor:
                                                            barber.is_active
                                                                ? "#ECFDF5"
                                                                : "#F3F4F6",
                                                        color: barber.is_active
                                                            ? "#065F46"
                                                            : "#6B7280",
                                                        border: barber.is_active
                                                            ? "1px solid rgba(16,185,129,0.15)"
                                                            : "1px solid rgba(203,208,212,0.6)",
                                                    }}>
                                                    <span
                                                        style={{
                                                            width: 8,
                                                            height: 8,
                                                            backgroundColor:
                                                                barber.is_active
                                                                    ? "#10B981"
                                                                    : "#9CA3AF",
                                                            borderRadius: 8,
                                                        }}
                                                    />
                                                    {barber.is_active
                                                        ? "Available"
                                                        : "Inactive"}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="border-t" />

                                    <div className="px-6 pb-4 bg-gray-50 flex items-center justify-between">
                                        <div className="flex-1 flex items-center justify-center">
                                            <button
                                                onClick={() =>
                                                    handleManageBarber(barber)
                                                }
                                                className="flex flex-col items-center gap-2 text-sm text-gray-700">
                                                <Calendar size={20} />
                                                <span>Manage</span>
                                            </button>
                                        </div>
                                        <div
                                            style={{
                                                width: 2,
                                                height: 40,
                                                backgroundColor:
                                                    "rgba(203, 204, 207, 0.72)",
                                                margin: "0 12px",
                                            }}
                                        />
                                        <div className="flex-1 flex items-center justify-center">
                                            <div className="flex flex-col items-center gap-2 text-sm text-gray-700">
                                                <Switch
                                                    checked={barber.is_active}
                                                    onCheckedChange={(
                                                        checked
                                                    ) =>
                                                        handleToggleActive(
                                                            barber,
                                                            checked as boolean
                                                        )
                                                    }
                                                />
                                                <span>Status</span>
                                            </div>
                                        </div>
                                        <div className="flex-1 flex items-center justify-center">
                                            <button
                                                onClick={() =>
                                                    setBarberDelete({
                                                        open: true,
                                                        id: barber.id,
                                                        name: barber.name,
                                                    })
                                                }
                                                className="flex flex-col items-center gap-2 text-sm"
                                                style={{ color: "#DC2626" }}>
                                                <Trash2 size={20} />
                                                <span>Delete</span>
                                            </button>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Delete barber confirmation modal (matches delete message design) */}
            {barberDelete.open && (
                <div
                    className="fixed inset-0 flex items-center justify-center"
                    style={{ zIndex: 2147483647 }}>
                    <div
                        className="absolute inset-0 bg-black/70"
                        style={{
                            backdropFilter: "blur(4px)",
                            WebkitBackdropFilter: "blur(4px)",
                        }}
                        onClick={() => setBarberDelete({ open: false })}
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
                                className="text-xl font-black text-center leading-tight"
                                style={{
                                    fontWeight: 600,
                                    marginBottom: "10px",
                                }}>
                                Delete barber?
                            </h3>
                            <p
                                className="text-sm text-gray-600 text-center font-bold"
                                style={{ marginTop: "15px" }}>
                                This action cannot be undone.
                                <br />
                                Deleting this barber will remove their profile
                                and schedules and may affect existing
                                appointments.
                            </p>
                        </div>
                        <div className="flex justify-center gap-3 mt-6">
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
                                    setBarberDelete({ open: false })
                                }>
                                Cancel
                            </Button>
                            <Button
                                className="h-9 px-4 rounded-md transition-colors admin-cancel-btn"
                                onClick={async () => {
                                    if (!barberDelete.id) return;
                                    const { error } = await supabase
                                        .from("barbers")
                                        .delete()
                                        .eq("id", barberDelete.id);
                                    if (error) {
                                        toast({
                                            title: "Delete failed",
                                            description: error.message,
                                            variant: "destructive",
                                        });
                                    } else {
                                        setBarbers((prev) =>
                                            prev.filter(
                                                (b) => b.id !== barberDelete.id
                                            )
                                        );
                                        toast({
                                            title: "Deleted",
                                            description: `${
                                                barberDelete.name || "Barber"
                                            } deleted`,
                                        });
                                    }
                                    setBarberDelete({ open: false });
                                }}>
                                Confirm Delete
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {scheduleDialogOpen && (
                <div
                    className="fixed inset-0"
                    style={{
                        position: "fixed",
                        inset: 0,
                        background: "rgba(0,0,0,0.6)",
                        zIndex: 2147483600,
                    }}
                    onClick={() => setScheduleDialogOpen(false)}>
                    <div
                        className="fixed"
                        style={{
                            position: "fixed",
                            left: "50%",
                            top: "50%",
                            transform: "translate(-50%, -50%)",
                            zIndex: 2147483601,
                            width: "min(100%, 768px)",
                            background: "#fff",
                            padding: 24,
                            borderRadius: 8,
                            border: "1px solid #e5e7eb",
                        }}
                        onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-col space-y-1.5 text-center sm:text-left">
                            <h3 className="text-lg font-semibold leading-none tracking-tight">
                                Manage Weekly Schedule
                            </h3>
                            <p className="text-sm text-gray-500">
                                Set working hours for each day of the week
                            </p>
                        </div>
                        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                            {barberSchedules.map((schedule) => (
                                <div
                                    key={schedule.day_of_week}
                                    className="border rounded-lg"
                                    style={{
                                        backgroundColor: "#FFFFFF",
                                        borderColor: "#E5E7EB",
                                        padding: "16px",
                                    }}>
                                    <div
                                        className={`flex items-center gap-3 ${
                                            schedule.is_working ? "mb-3" : ""
                                        }`}>
                                        <Switch
                                            checked={schedule.is_working}
                                            onCheckedChange={(checked) =>
                                                handleUpdateSchedule(
                                                    schedule.day_of_week,
                                                    "is_working",
                                                    checked
                                                )
                                            }
                                        />
                                        <div>
                                            <div className="text-base font-semibold text-gray-900">
                                                {DAYS[schedule.day_of_week]}
                                            </div>
                                            <div
                                                className="text-sm"
                                                style={{
                                                    color: " rgb(124, 130, 140",
                                                }}>
                                                {schedule.is_working
                                                    ? "Available"
                                                    : "Unavailable"}
                                            </div>
                                        </div>
                                    </div>
                                    {schedule.is_working && (
                                        <>
                                            <div
                                                style={{
                                                    borderTop:
                                                        "1px solid #E5E7EB",
                                                    marginTop: "12px",
                                                    marginBottom: "0px",
                                                    marginLeft: "-16px",
                                                    marginRight: "-16px",
                                                }}
                                            />
                                            <div
                                                className="grid grid-cols-2 gap-4"
                                                style={{
                                                    backgroundColor: "#F9FAFB",
                                                    marginLeft: "-16px",
                                                    marginRight: "-16px",
                                                    marginBottom: "-16px",
                                                    paddingLeft: "16px",
                                                    paddingRight: "16px",
                                                    paddingTop: "16px",
                                                    paddingBottom: "16px",
                                                }}>
                                                <div
                                                    style={{
                                                        position: "relative",
                                                    }}>
                                                    <Input
                                                        type="time"
                                                        step={300}
                                                        value={
                                                            schedule.start_time?.slice(
                                                                0,
                                                                5
                                                            ) || "10:00"
                                                        }
                                                        readOnly
                                                        onClick={() =>
                                                            setTimePicker({
                                                                open: true,
                                                                dayOfWeek:
                                                                    schedule.day_of_week,
                                                                type: "start",
                                                                dialog: "manage",
                                                                value:
                                                                    schedule.start_time?.slice(
                                                                        0,
                                                                        5
                                                                    ) ||
                                                                    "10:00",
                                                            })
                                                        }
                                                        className="barber-dialog-input border border-gray-300 text-sm"
                                                        style={{
                                                            backgroundColor:
                                                                "#FFFFFF",
                                                            color: "#111827",
                                                            paddingRight:
                                                                isTinyScreen
                                                                    ? 12
                                                                    : 36,
                                                        }}
                                                    />
                                                    {!isTinyScreen && (
                                                        <Clock
                                                            size={16}
                                                            style={{
                                                                position:
                                                                    "absolute",
                                                                right: 10,
                                                                top: 0,
                                                                bottom: 0,
                                                                margin: "auto",
                                                                color: "#9CA3AF",
                                                                pointerEvents:
                                                                    "none",
                                                            }}
                                                        />
                                                    )}
                                                    {timePicker.open &&
                                                        timePicker.dialog ===
                                                            "manage" &&
                                                        timePicker.dayOfWeek ===
                                                            schedule.day_of_week &&
                                                        timePicker.type ===
                                                            "start" && (
                                                            <TimePicker
                                                                initial={
                                                                    timePicker.value ||
                                                                    schedule.start_time?.slice(
                                                                        0,
                                                                        5
                                                                    ) ||
                                                                    "10:00"
                                                                }
                                                                onCancel={() =>
                                                                    setTimePicker(
                                                                        {
                                                                            open: false,
                                                                        }
                                                                    )
                                                                }
                                                                onChange={(
                                                                    val
                                                                ) => {
                                                                    handleUpdateSchedule(
                                                                        schedule.day_of_week,
                                                                        "start_time",
                                                                        val +
                                                                            ":00"
                                                                    );
                                                                }}
                                                            />
                                                        )}
                                                </div>
                                                <div
                                                    style={{
                                                        position: "relative",
                                                    }}>
                                                    <Input
                                                        type="time"
                                                        step={300}
                                                        value={
                                                            schedule.end_time?.slice(
                                                                0,
                                                                5
                                                            ) || "20:00"
                                                        }
                                                        readOnly
                                                        onClick={() =>
                                                            setTimePicker({
                                                                open: true,
                                                                dayOfWeek:
                                                                    schedule.day_of_week,
                                                                type: "end",
                                                                dialog: "manage",
                                                                value:
                                                                    schedule.end_time?.slice(
                                                                        0,
                                                                        5
                                                                    ) ||
                                                                    "20:00",
                                                            })
                                                        }
                                                        className="barber-dialog-input border border-gray-300 text-sm"
                                                        style={{
                                                            backgroundColor:
                                                                "#FFFFFF",
                                                            color: "#111827",
                                                            paddingRight:
                                                                isTinyScreen
                                                                    ? 12
                                                                    : 36,
                                                        }}
                                                    />
                                                    <Clock
                                                        size={16}
                                                        style={{
                                                            position:
                                                                "absolute",
                                                            right: 10,
                                                            top: "50%",
                                                            transform:
                                                                "translateY(-50%)",
                                                            color: "#9CA3AF",
                                                            pointerEvents:
                                                                "none",
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                        <div
                            className="flex justify-end gap-2"
                            style={{ marginTop: "2rem" }}>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setScheduleDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSaveSchedule}
                                disabled={submitting}>
                                {submitting ? "Saving..." : "Save Schedule"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
