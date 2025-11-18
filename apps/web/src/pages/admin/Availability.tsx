import React, {
    useEffect,
    useState,
    useRef,
    useMemo,
    type FormEvent,
} from "react";
import { supabase } from "../../lib/supabase";
import { toast } from "../../hooks/use-toast";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../../components/ui/select";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Calendar, Clock, Trash2, Plus } from "lucide-react";
import { Calendar as DayPickerCalendar } from "../../components/ui/calendar";
import { format } from "date-fns";

interface BlockedSlot {
    id: string;
    barber_id: string | null;
    start_datetime: string;
    end_datetime: string;
    reason: string | null;
    created_at: string;
    barbers?: { name: string } | null;
}

interface Barber {
    id: string;
    name: string;
    title: string;
}

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
                            {(() => {
                                const hourAsAm = hour % 12;
                                const hourAsPm = (hour % 12) + 12;
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

export default function Availability() {
    const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
    const [barbers, setBarbers] = useState<Barber[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [timePicker, setTimePicker] = useState<{
        open: boolean;
        type?: "start" | "end";
    }>({ open: false });

    const [formData, setFormData] = useState({
        barber_id: "all",
        date: "",
        start_time: "09:00",
        end_time: "20:00",
        reason: "",
    });

    const dateInputRef = useRef<HTMLInputElement | null>(null);
    const datePickerRef = useRef<HTMLDivElement | null>(null);
    const [datePickerOpen, setDatePickerOpen] = useState(false);
    const [datePickerSelected, setDatePickerSelected] = useState<
        Date | undefined
    >(undefined);
    const [rangeStart, setRangeStart] = useState<Date | null>(null);
    const datePickerSelectedRef = useRef<Date | undefined>(undefined);
    const [datePickerApplied, setDatePickerApplied] = useState(false);
    const [datePickerRange, setDatePickerRange] = useState<
        | {
              from?: Date | undefined;
              to?: Date | undefined;
          }
        | undefined
    >(undefined);
    const [appliedDateRange, setAppliedDateRange] = useState<
        | {
              from?: Date | undefined;
              to?: Date | undefined;
          }
        | undefined
    >(undefined);
    const [blockDelete, setBlockDelete] = useState<{
        open: boolean;
        id?: string;
        description?: string;
    }>({ open: false });
    function formatLocalDate(date: Date) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, "0");
        const d = String(date.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
    }
    function findSelectedDateFromDOM(): Date | undefined {
        const el = document.querySelector<HTMLElement>(
            '.availability-calendar [aria-selected="true"]'
        );
        if (!el) return undefined;
        const text = el.textContent?.trim();
        if (!text) return undefined;
        const dayNum = Number(text);
        if (Number.isNaN(dayNum)) return undefined;
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        return new Date(year, month, dayNum);
    }
    const [datePickerMode, setDatePickerMode] = useState<"single" | "range">(
        "single"
    );
    useEffect(() => {
        if (datePickerMode === "range") {
            setFormData((prev) => ({
                ...prev,
                end_time: prev.start_time,
            }));
        }
    }, [datePickerMode]);
    const isSingleDateRangeInvalid = useMemo(() => {
        if (datePickerMode === "range") return false;
        if (!formData.start_time || !formData.end_time) return false;
        const [sh, sm] = formData.start_time.split(":").map(Number);
        const [eh, em] = formData.end_time.split(":").map(Number);
        const startTotal = sh * 60 + sm;
        const endTotal = eh * 60 + em;
        return endTotal <= startTotal;
    }, [formData.start_time, formData.end_time, datePickerMode]);
    const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);

        const { data: slotsData, error: slotsError } = await supabase
            .from("blocked_slots")
            .select(
                `
        *,
        barbers (name)
      `
            )
            .order("start_datetime", { ascending: false });

        if (slotsError) {
            console.error("Error fetching blocked slots:", slotsError);
        } else {
            setBlockedSlots(slotsData || []);
        }

        const { data: barbersData, error: barbersError } = await supabase
            .from("barbers")
            .select("id, name, title")
            .eq("is_active", true);

        if (barbersError) {
            console.error("Error fetching barbers:", barbersError);
        } else {
            setBarbers(barbersData || []);
        }

        setLoading(false);
    };

    // Reset form whenever the block time dialog is closed (covers overlay/Esc and other closes)
    // Always reset on dialog close so tentative or previously applied selections do not persist
    useEffect(() => {
        if (!dialogOpen) {
            resetForm();
        }
    }, [dialogOpen]);

    const resetForm = () => {
        setFormData({
            barber_id: "all",
            date: "",
            start_time: "09:00",
            end_time: "20:00",
            reason: "",
        });
        setDatePickerSelected(undefined);
        datePickerSelectedRef.current = undefined;
        setDatePickerApplied(false);
        setDatePickerRange(undefined);
        setRangeStart(null);
        setAppliedDateRange(undefined);
        setDatePickerMode("single");
    };

    // Close the date picker when clicking outside of it
    useEffect(() => {
        if (!datePickerOpen) return;

        function handleOutsideClick(e: MouseEvent) {
            if (
                datePickerRef.current &&
                !datePickerRef.current.contains(e.target as Node)
            ) {
                setDatePickerOpen(false);
            }
        }

        document.addEventListener("mousedown", handleOutsideClick);
        return () =>
            document.removeEventListener("mousedown", handleOutsideClick);
    }, [datePickerOpen]);

    // Clear any tentative selection when the picker is closed without applying
    useEffect(() => {
        if (!datePickerOpen) {
            if (!datePickerApplied) {
                setDatePickerSelected(undefined);
                datePickerSelectedRef.current = undefined;
                setDatePickerRange(undefined);
            }
            // do not automatically reset datePickerApplied here — we want applied ranges
            // to persist until the dialog itself is closed or the user cancels
        }
    }, [datePickerOpen, datePickerApplied]);

    // When opening the picker, restore the last applied/selected date and reset month
    // Calendar should open on the current month unless a selected/applied date is in another month
    useEffect(() => {
        if (!datePickerOpen) return;

        // restore single-date selection from formData if present
        if (formData.date) {
            try {
                const d = new Date(formData.date);
                if (!isNaN(d.getTime())) {
                    setDatePickerSelected(d);
                    datePickerSelectedRef.current = d;
                }
            } catch (e) {
                // ignore invalid date
            }
        }

        // restore applied range if opening in range mode
        if (datePickerMode === "range" && appliedDateRange) {
            setDatePickerRange(appliedDateRange);
        }

        // Decide which month to show:
        // Priority: formData.date -> appliedDateRange.from -> datePickerRange.from -> datePickerSelected -> today
        let monthToShow: Date | undefined = undefined;
        try {
            if (formData.date) {
                const d = new Date(formData.date);
                if (!isNaN(d.getTime())) monthToShow = d;
            }
        } catch (e) {}
        if (!monthToShow && appliedDateRange && appliedDateRange.from) {
            monthToShow = appliedDateRange.from;
        }
        if (!monthToShow && datePickerRange && datePickerRange.from) {
            monthToShow = datePickerRange.from;
        }
        if (!monthToShow && datePickerSelected) {
            monthToShow = datePickerSelected;
        }
        if (!monthToShow) monthToShow = new Date();

        // normalize to first of month to avoid day offset issues
        setCurrentMonth(
            new Date(monthToShow.getFullYear(), monthToShow.getMonth(), 1)
        );
    }, [
        datePickerOpen,
        datePickerMode,
        appliedDateRange,
        datePickerRange,
        datePickerSelected,
        formData.date,
    ]);

    // selected-day DOM mutation overrides removed — styling handled via CSS classNames

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (datePickerMode === "range") {
            const range = appliedDateRange ?? datePickerRange;
            if (!range || !range.from || !range.to) {
                toast({
                    title: "Missing date range",
                    description: "Please select a start and end date",
                    variant: "destructive",
                });
                setSubmitting(false);
                return;
            }
        } else {
            if (!formData.date) {
                toast({
                    title: "Missing date",
                    description: "Please select a date",
                    variant: "destructive",
                });
                setSubmitting(false);
                return;
            }
        }

        setSubmitting(true);

        try {
            let startDatetime: string;
            let endDatetime: string;

            if (datePickerMode === "range") {
                const range = appliedDateRange ?? datePickerRange!;
                const from = range.from as Date;
                const to = range.to as Date;
                // use selected start/end times if provided, otherwise default to full day
                let startHours = 0;
                let startMinutes = 0;
                let endHours = 23;
                let endMinutes = 59;

                if (formData.start_time) {
                    const parts = formData.start_time.split(":").map(Number);
                    if (parts.length >= 2) {
                        startHours = parts[0];
                        startMinutes = parts[1];
                    }
                }
                if (formData.end_time) {
                    const parts = formData.end_time.split(":").map(Number);
                    if (parts.length >= 2) {
                        endHours = parts[0];
                        endMinutes = parts[1];
                    }
                }

                const startDate = new Date(from);
                startDate.setHours(startHours, startMinutes, 0, 0);
                const endDate = new Date(to);
                // if end_time provided, use exact time; otherwise keep end of day
                if (formData.end_time) {
                    endDate.setHours(endHours, endMinutes, 0, 0);
                } else {
                    endDate.setHours(23, 59, 59, 999);
                }
                startDatetime = startDate.toISOString();
                endDatetime = endDate.toISOString();
            } else {
                // single date uses start_time/end_time
                const date = new Date(formData.date);
                const [startHours, startMinutes] = formData.start_time
                    .split(":")
                    .map(Number);
                const [endHours, endMinutes] = formData.end_time
                    .split(":")
                    .map(Number);
                const startDate = new Date(date);
                startDate.setHours(startHours, startMinutes, 0, 0);
                const endDate = new Date(date);
                endDate.setHours(endHours, endMinutes, 0, 0);
                startDatetime = startDate.toISOString();
                endDatetime = endDate.toISOString();
            }

            if (new Date(endDatetime) <= new Date(startDatetime)) {
                toast({
                    title: "Invalid time range",
                    description: "End time must be after start time",
                    variant: "destructive",
                });
                setSubmitting(false);
                return;
            }

            // debug: log the datetimes used for insertion
            console.debug("Creating block with:", {
                startDatetime,
                endDatetime,
                formData,
                datePickerMode,
                appliedDateRange,
                datePickerRange,
            });
            const { error } = await supabase.from("blocked_slots").insert({
                barber_id:
                    formData.barber_id === "all" ? null : formData.barber_id,
                start_datetime: startDatetime,
                end_datetime: endDatetime,
                reason: formData.reason || null,
            });

            if (error) {
                console.error("Error creating blocked slot:", error);
                toast({
                    title: "Error",
                    description: "Failed to block time slot",
                    variant: "destructive",
                });
            } else {
                toast({
                    title: "Success",
                    description: "Time slot blocked successfully",
                });
                setFormData({
                    barber_id: "all",
                    date: "",
                    start_time: "09:00",
                    end_time: "20:00",
                    reason: "",
                });
                setDatePickerRange(undefined);
                setDatePickerSelected(undefined);
                datePickerSelectedRef.current = undefined;
                setDatePickerApplied(false);
                setAppliedDateRange(undefined);
                setDialogOpen(false);
                fetchData();
            }
        } catch (error) {
            console.error("Error:", error);
            toast({
                title: "Error",
                description: "An error occurred",
                variant: "destructive",
            });
        } finally {
            setSubmitting(false);
        }
    };

    // open delete confirmation modal for blocked slot
    const handleDelete = (id: string, description?: string) => {
        console.debug("handleDelete called for id:", id, description);
        setBlockDelete({ open: true, id, description });
    };

    const confirmDeleteBlock = async () => {
        if (!blockDelete.id) return;
        const id = blockDelete.id;
        console.debug("confirmDeleteBlock called for id:", id);
        try {
            const { error } = await supabase
                .from("blocked_slots")
                .delete()
                .eq("id", id);
            if (error) {
                console.error("Error deleting blocked slot:", error);
                toast({
                    title: "Error",
                    description: "Failed to delete",
                    variant: "destructive",
                });
            } else {
                toast({
                    title: "Deleted",
                    description: "Blocked slot removed",
                });
                fetchData();
            }
        } catch (err) {
            console.error(err);
            toast({
                title: "Error",
                description: "Failed to delete",
                variant: "destructive",
            });
        } finally {
            setBlockDelete({ open: false });
        }
    };

    const getBlockDescription = (block: BlockedSlot) => {
        const start = new Date(block.start_datetime);
        const end = new Date(block.end_datetime);
        const isSameDay = start.toDateString() === end.toDateString();
        if (isSameDay) {
            return `${format(start, "HH:mm")} - ${format(
                end,
                "HH:mm"
            )} • ${format(start, "MMM dd, yyyy")}`;
        } else {
            return `From ${format(start, "HH:mm, MMM dd, yyyy")} to ${format(
                end,
                "HH:mm, MMM dd, yyyy"
            )}`;
        }
    };

    // Return true if given date overlaps any blocked slot (normalized to local day)
    function isDateBlocked(date: Date) {
        const day = new Date(date);
        day.setHours(0, 0, 0, 0);
        return blockedSlots.some((slot) => {
            const start = new Date(slot.start_datetime);
            const end = new Date(slot.end_datetime);
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            return (
                day.getTime() >= start.getTime() &&
                day.getTime() <= end.getTime()
            );
        });
    }

    // Fallback: ensure blocked day buttons are marked and not hoverable (for DayPicker versions that don't add aria-disabled)
    useEffect(() => {
        if (!datePickerOpen) return;

        const markBlocked = () => {
            const buttons = Array.from(
                document.querySelectorAll<HTMLButtonElement>(
                    ".availability-day"
                )
            );
            buttons.forEach((btn) => {
                const txt = btn.textContent?.trim();
                const dayNum = txt ? Number(txt) : NaN;
                if (Number.isNaN(dayNum)) return;
                const dt = new Date(
                    currentMonth.getFullYear(),
                    currentMonth.getMonth(),
                    dayNum
                );
                if (isDateBlocked(dt)) {
                    btn.setAttribute("aria-disabled", "true");
                    btn.classList.add("availability-blocked");
                    btn.style.pointerEvents = "none";
                } else {
                    btn.removeAttribute("aria-disabled");
                    btn.classList.remove("availability-blocked");
                    btn.style.pointerEvents = "";
                }
            });
        };

        // initial mark and periodic marking to catch DayPicker renders
        markBlocked();
        const interval = window.setInterval(markBlocked, 400);
        return () => window.clearInterval(interval);
    }, [datePickerOpen, currentMonth, blockedSlots, appliedDateRange]);

    const now = new Date();
    const upcomingBlocks = blockedSlots
        .filter((b) => new Date(b.end_datetime) >= now)
        .slice()
        .sort(
            (a, b) =>
                new Date(a.start_datetime).getTime() -
                new Date(b.start_datetime).getTime()
        ); // nearest start first
    const pastBlocks = blockedSlots
        .filter((b) => new Date(b.end_datetime) < now)
        .slice()
        .sort(
            (a, b) =>
                new Date(b.start_datetime).getTime() -
                new Date(a.start_datetime).getTime()
        ); // most recent (nearest) first

    return (
        <div
            className="p-6 min-h-screen"
            style={{ backgroundColor: "#F9FAFB" }}>
            <div className="mb-6 flex justify-between items-center">
                <style>{`
                    @media (max-width: 370px) {
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
                        Availability Management
                    </h2>
                    <p className="text-gray-600 mt-1">
                        Block time slots for holidays, breaks, or barber time
                        off
                    </p>
                </div>

                <DialogPrimitive.Root
                    modal={true}
                    open={dialogOpen}
                    onOpenChange={setDialogOpen}>
                    <DialogPrimitive.Trigger
                        asChild
                        onClick={() => setDialogOpen(true)}>
                        <Button className="admin-primary-btn h-10 px-4 rounded-md outline-none focus:outline-none ring-0 focus:ring-0 focus-visible:ring-0 ring-offset-0 focus-visible:ring-offset-0 transition-colors">
                            <Plus className="h-4 w-4 mr-2" />
                            <span className="btn-text-full">Block Time</span>
                            <span className="btn-text-short">Block</span>
                        </Button>
                    </DialogPrimitive.Trigger>
                    <DialogPrimitive.Portal>
                        <DialogPrimitive.Overlay
                            className="fixed inset-0"
                            style={{
                                position: "fixed",
                                inset: 0,
                                background: "rgba(0,0,0,0.6)",
                                zIndex: 2147483646,
                                backdropFilter: "blur(4px)",
                                WebkitBackdropFilter: "blur(4px)",
                            }}
                        />
                        <DialogPrimitive.Content
                            onOpenAutoFocus={() =>
                                console.log(
                                    "Dialog content mounted (auto focus)"
                                )
                            }
                            className="fixed"
                            style={{
                                position: "fixed",
                                left: "50%",
                                top: "50%",
                                transform: "translate(-50%, -50%)",
                                zIndex: 2147483647,
                                width: "min(100%, 640px)",
                                background: "#ffffff",
                                padding: 24,
                                boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
                                borderRadius: 8,
                                border: "1px solid #e5e7eb",
                                color: "#111827",
                            }}>
                            <div className="flex flex-col space-y-1.5 text-center sm:text-left">
                                <DialogPrimitive.Title
                                    className="text-xl font-bold leading-none tracking-tight mb-8"
                                    style={{
                                        color: "#111827",
                                        fontWeight: 600,
                                    }}>
                                    Block Time Slot
                                </DialogPrimitive.Title>
                            </div>
                            <form
                                onSubmit={handleSubmit}
                                noValidate={datePickerMode === "range"}
                                className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Apply to</Label>
                                    <select
                                        value={formData.barber_id}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                barber_id: e.target.value,
                                            })
                                        }
                                        className="barber-dialog-input flex h-9 w-full rounded-md border px-3 py-1 text-sm outline-none transition-all"
                                        style={{
                                            backgroundColor: "#F9FAFB",
                                            color: "#111827",
                                            borderColor: "#D1D5DB",
                                        }}
                                        onMouseEnter={(e) => {
                                            (
                                                e.currentTarget as HTMLSelectElement
                                            ).style.borderColor = "#9CA3AF";
                                        }}
                                        onMouseLeave={(e) => {
                                            (
                                                e.currentTarget as HTMLSelectElement
                                            ).style.borderColor = "#D1D5DB";
                                        }}>
                                        <option value="all">
                                            All Barbers (Shop Closed)
                                        </option>
                                        {barbers.map((barber) => (
                                            <option
                                                key={barber.id}
                                                value={barber.id}>
                                                {barber.name} - {barber.title}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Block Type removed - always use start/end time */}

                                <div className="space-y-2">
                                    <Label>Date</Label>
                                    <div>
                                        <div style={{ position: "relative" }}>
                                            <Button
                                                className="barber-dialog-input flex h-9 w-full rounded-md border px-3 py-1 text-sm outline-none transition-all"
                                                style={{
                                                    backgroundColor: "#F9FAFB",
                                                    color: "#111827",
                                                    borderColor: "#D1D5DB",
                                                    justifyContent:
                                                        "flex-start",
                                                    alignItems: "center",
                                                    textAlign: "left",
                                                    fontSize:
                                                        "0.875rem" /* match text-sm */,
                                                    fontWeight: 400,
                                                }}
                                                onMouseEnter={(e) => {
                                                    (
                                                        e.currentTarget as HTMLButtonElement
                                                    ).style.borderColor =
                                                        "#9CA3AF";
                                                }}
                                                onMouseLeave={(e) => {
                                                    (
                                                        e.currentTarget as HTMLButtonElement
                                                    ).style.borderColor =
                                                        "#D1D5DB";
                                                }}
                                                onClick={() =>
                                                    setDatePickerOpen((v) => !v)
                                                }>
                                                <Calendar className="h-4 w-4 mr-1" />
                                                {datePickerMode === "range" &&
                                                (appliedDateRange ??
                                                    datePickerRange) &&
                                                (
                                                    appliedDateRange ??
                                                    datePickerRange
                                                ).from &&
                                                (
                                                    appliedDateRange ??
                                                    datePickerRange
                                                ).to ? (
                                                    <>
                                                        From{" "}
                                                        <span className="underline">
                                                            {format(
                                                                (appliedDateRange ??
                                                                    datePickerRange)!
                                                                    .from!,
                                                                "MMM dd, yyyy"
                                                            )}
                                                        </span>{" "}
                                                        to{" "}
                                                        <span className="underline">
                                                            {format(
                                                                (appliedDateRange ??
                                                                    datePickerRange)!
                                                                    .to!,
                                                                "MMM dd, yyyy"
                                                            )}
                                                        </span>
                                                    </>
                                                ) : formData.date ? (
                                                    <span className="underline">
                                                        {format(
                                                            new Date(
                                                                formData.date
                                                            ),
                                                            "MMM dd, yyyy"
                                                        )}
                                                    </span>
                                                ) : (
                                                    "Select Date"
                                                )}
                                            </Button>
                                            {datePickerOpen && (
                                                <>
                                                    <div
                                                        aria-hidden={true}
                                                        style={{
                                                            position: "fixed",
                                                            inset: 0,
                                                            zIndex: 2499,
                                                            background:
                                                                "transparent",
                                                        }}
                                                        onClick={() =>
                                                            setDatePickerOpen(
                                                                false
                                                            )
                                                        }
                                                    />
                                                    <div
                                                        ref={datePickerRef}
                                                        className="availability-date-picker"
                                                        style={{
                                                            position: "fixed",
                                                            left: "50%",
                                                            top: "50%",
                                                            transform:
                                                                "translate(-50%, -50%)",
                                                            zIndex: 2500,
                                                            background: "#fff",
                                                            borderRadius: 8,
                                                            boxShadow:
                                                                "0 10px 30px rgba(0,0,0,0.12)",
                                                            padding: 12,
                                                        }}>
                                                        {/* Segmented Control */}
                                                        <div
                                                            style={{
                                                                display: "flex",
                                                                gap: 0,
                                                                backgroundColor:
                                                                    "#F3F4F6",
                                                                borderRadius: 6,
                                                                padding: 3,
                                                                justifyContent:
                                                                    "center",
                                                                width: "fit-content",
                                                                margin: "0 auto 12px auto",
                                                            }}>
                                                            <button
                                                                onClick={() =>
                                                                    setDatePickerMode(
                                                                        "single"
                                                                    )
                                                                }
                                                                type="button"
                                                                style={{
                                                                    width: "auto",
                                                                    padding:
                                                                        "6px 12px",
                                                                    borderRadius: 4,
                                                                    border: "none",
                                                                    backgroundColor:
                                                                        datePickerMode ===
                                                                        "single"
                                                                            ? "#fff"
                                                                            : "transparent",
                                                                    color: "#111827",
                                                                    fontSize:
                                                                        "0.875rem",
                                                                    fontWeight: 500,
                                                                    cursor: "pointer",
                                                                    boxShadow:
                                                                        datePickerMode ===
                                                                        "single"
                                                                            ? "0 1px 2px rgba(0,0,0,0.05)"
                                                                            : "none",
                                                                    transition:
                                                                        "all 0.2s",
                                                                }}>
                                                                Single Date
                                                            </button>
                                                            <button
                                                                onClick={() =>
                                                                    setDatePickerMode(
                                                                        "range"
                                                                    )
                                                                }
                                                                type="button"
                                                                style={{
                                                                    width: "auto",
                                                                    padding:
                                                                        "6px 12px",
                                                                    borderRadius: 4,
                                                                    border: "none",
                                                                    backgroundColor:
                                                                        datePickerMode ===
                                                                        "range"
                                                                            ? "#fff"
                                                                            : "transparent",
                                                                    color: "#111827",
                                                                    fontSize:
                                                                        "0.875rem",
                                                                    fontWeight: 500,
                                                                    cursor: "pointer",
                                                                    boxShadow:
                                                                        datePickerMode ===
                                                                        "range"
                                                                            ? "0 1px 2px rgba(0,0,0,0.05)"
                                                                            : "none",
                                                                    transition:
                                                                        "all 0.2s",
                                                                }}>
                                                                Date Range
                                                            </button>
                                                        </div>
                                                        <DayPickerCalendar
                                                            mode={
                                                                datePickerMode
                                                            }
                                                            selected={
                                                                datePickerMode ===
                                                                "single"
                                                                    ? datePickerSelected
                                                                    : (datePickerRange as any)
                                                            }
                                                            onSelect={(d) => {
                                                                if (
                                                                    datePickerMode ===
                                                                    "single"
                                                                ) {
                                                                    const sel =
                                                                        d as
                                                                            | Date
                                                                            | undefined;
                                                                    setDatePickerSelected(
                                                                        sel
                                                                    );
                                                                    datePickerSelectedRef.current =
                                                                        sel;
                                                                } else {
                                                                    // range selection returns Range object
                                                                    const range =
                                                                        d as any;
                                                                    if (
                                                                        range &&
                                                                        range.from &&
                                                                        range.to
                                                                    ) {
                                                                        const f =
                                                                            new Date(
                                                                                range.from
                                                                            );
                                                                        const t =
                                                                            new Date(
                                                                                range.to
                                                                            );
                                                                        f.setHours(
                                                                            0,
                                                                            0,
                                                                            0,
                                                                            0
                                                                        );
                                                                        t.setHours(
                                                                            0,
                                                                            0,
                                                                            0,
                                                                            0
                                                                        );
                                                                        // if same day clicked twice (from === to), clear selection (toggle off)
                                                                        if (
                                                                            f.getTime() ===
                                                                            t.getTime()
                                                                        ) {
                                                                            setDatePickerRange(
                                                                                undefined
                                                                            );
                                                                            setRangeStart(
                                                                                null
                                                                            );
                                                                            return;
                                                                        }
                                                                        // completed range selected -> clear temporary start marker
                                                                        setRangeStart(
                                                                            null
                                                                        );
                                                                    } else {
                                                                        // partial range (start selected, end not yet) -> mark rangeStart
                                                                        if (
                                                                            range &&
                                                                            range.from &&
                                                                            !range.to
                                                                        ) {
                                                                            setRangeStart(
                                                                                new Date(
                                                                                    range.from
                                                                                )
                                                                            );
                                                                        } else {
                                                                            setRangeStart(
                                                                                null
                                                                            );
                                                                        }
                                                                    }
                                                                    setDatePickerRange(
                                                                        range
                                                                    );
                                                                }
                                                            }}
                                                            fixedWeeks
                                                            fromMonth={
                                                                new Date()
                                                            }
                                                            className={
                                                                "availability-calendar"
                                                            }
                                                            classNames={{
                                                                day: "availability-day",
                                                                day_outside:
                                                                    "availability-outside",
                                                                day_today:
                                                                    "availability-today",
                                                                day_selected:
                                                                    "availability-selected",
                                                            }}
                                                            toMonth={(() => {
                                                                const date =
                                                                    new Date();
                                                                date.setMonth(
                                                                    date.getMonth() +
                                                                        4
                                                                );
                                                                return date;
                                                            })()}
                                                            month={currentMonth}
                                                            onMonthChange={
                                                                setCurrentMonth
                                                            }
                                                            disabled={(
                                                                date
                                                            ) => {
                                                                const monthMismatch =
                                                                    date.getMonth() !==
                                                                        currentMonth.getMonth() ||
                                                                    date.getFullYear() !==
                                                                        currentMonth.getFullYear();
                                                                if (
                                                                    monthMismatch
                                                                )
                                                                    return true;
                                                                // if in range mode and a start was chosen but no end yet, prevent selecting an end before start
                                                                if (
                                                                    datePickerMode ===
                                                                        "range" &&
                                                                    rangeStart &&
                                                                    (!datePickerRange ||
                                                                        !datePickerRange.to)
                                                                ) {
                                                                    const fromDay =
                                                                        new Date(
                                                                            rangeStart
                                                                        );
                                                                    fromDay.setHours(
                                                                        0,
                                                                        0,
                                                                        0,
                                                                        0
                                                                    );
                                                                    const checkDay =
                                                                        new Date(
                                                                            date
                                                                        );
                                                                    checkDay.setHours(
                                                                        0,
                                                                        0,
                                                                        0,
                                                                        0
                                                                    );
                                                                    if (
                                                                        checkDay.getTime() <
                                                                        fromDay.getTime()
                                                                    )
                                                                        return true;
                                                                }
                                                                // also disable if the day is already blocked
                                                                return isDateBlocked(
                                                                    date
                                                                );
                                                            }}
                                                        />
                                                        <div
                                                            style={{
                                                                display: "flex",
                                                                justifyContent:
                                                                    "flex-end",
                                                                gap: 12,
                                                                marginTop: 8,
                                                            }}>
                                                            <Button
                                                                variant="outline"
                                                                className="whitespace-nowrap rounded-md outline-none focus:outline-none ring-0 focus:ring-0 focus-visible:ring-0 ring-offset-0 focus-visible:ring-offset-0 transition-colors"
                                                                style={{
                                                                    backgroundColor:
                                                                        "#FFFFFF",
                                                                    color: "#374151",
                                                                    border: "1px solid #D1D5DB",
                                                                }}
                                                                onMouseEnter={(
                                                                    e
                                                                ) => {
                                                                    (
                                                                        e.currentTarget as HTMLButtonElement
                                                                    ).style.backgroundColor =
                                                                        "rgba(243, 244, 246, 0.7)";
                                                                }}
                                                                onMouseLeave={(
                                                                    e
                                                                ) => {
                                                                    (
                                                                        e.currentTarget as HTMLButtonElement
                                                                    ).style.backgroundColor =
                                                                        "#FFFFFF";
                                                                }}
                                                                onClick={() =>
                                                                    setDatePickerOpen(
                                                                        false
                                                                    )
                                                                }>
                                                                Cancel
                                                            </Button>
                                                            <Button
                                                                className="admin-primary-btn whitespace-nowrap rounded-md outline-none focus:outline-none ring-0 focus:ring-0 focus-visible:ring-0 ring-offset-0 focus-visible:ring-offset-0 transition-colors"
                                                                onClick={() => {
                                                                    if (
                                                                        datePickerMode ===
                                                                        "single"
                                                                    ) {
                                                                        // prefer ref but fall back to DOM if needed (handles fast clicks)
                                                                        let sel =
                                                                            datePickerSelectedRef.current;
                                                                        if (
                                                                            !sel
                                                                        ) {
                                                                            const el =
                                                                                document.querySelector<HTMLElement>(
                                                                                    '.availability-calendar [aria-selected="true"]'
                                                                                );
                                                                            if (
                                                                                el
                                                                            ) {
                                                                                const txt =
                                                                                    el.textContent?.trim();
                                                                                const dayNum =
                                                                                    txt
                                                                                        ? Number(
                                                                                              txt
                                                                                          )
                                                                                        : NaN;
                                                                                if (
                                                                                    !Number.isNaN(
                                                                                        dayNum
                                                                                    )
                                                                                ) {
                                                                                    sel =
                                                                                        new Date(
                                                                                            currentMonth.getFullYear(),
                                                                                            currentMonth.getMonth(),
                                                                                            dayNum
                                                                                        );
                                                                                }
                                                                            }
                                                                        }
                                                                        if (
                                                                            sel
                                                                        ) {
                                                                            datePickerSelectedRef.current =
                                                                                sel;
                                                                            setDatePickerSelected(
                                                                                sel
                                                                            );
                                                                            setFormData(
                                                                                (
                                                                                    prev
                                                                                ) => ({
                                                                                    ...prev,
                                                                                    date: formatLocalDate(
                                                                                        sel
                                                                                    ),
                                                                                })
                                                                            );
                                                                            setDatePickerApplied(
                                                                                true
                                                                            );
                                                                        }
                                                                    } else {
                                                                        // range mode: ensure a full range was chosen and mark applied so it persists
                                                                        if (
                                                                            datePickerRange &&
                                                                            datePickerRange.from &&
                                                                            datePickerRange.to
                                                                        ) {
                                                                            setAppliedDateRange(
                                                                                datePickerRange
                                                                            );
                                                                            setDatePickerApplied(
                                                                                true
                                                                            );
                                                                        } else {
                                                                            // no complete range selected — do nothing
                                                                        }
                                                                    }
                                                                    setDatePickerOpen(
                                                                        false
                                                                    );
                                                                }}>
                                                                Apply
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                        <input
                                            ref={dateInputRef}
                                            type="date"
                                            value={formData.date}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    date: e.target.value,
                                                })
                                            }
                                            min={
                                                new Date()
                                                    .toISOString()
                                                    .split("T")[0]
                                            }
                                            required={
                                                datePickerMode === "single"
                                            }
                                            className="hidden"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Start Time</Label>
                                        <div style={{ position: "relative" }}>
                                            <Input
                                                type="time"
                                                value={formData.start_time}
                                                readOnly
                                                onMouseDown={(e) =>
                                                    e.preventDefault()
                                                }
                                                onClick={() =>
                                                    setTimePicker({
                                                        open: true,
                                                        type: "start",
                                                    })
                                                }
                                                required
                                                className="barber-dialog-input flex h-9 w-full rounded-md border px-3 py-1 text-sm outline-none transition-all"
                                                style={{
                                                    backgroundColor: "#F9FAFB",
                                                    color: "#111827",
                                                    borderColor: "#D1D5DB",
                                                    paddingRight: 40,
                                                }}
                                            />
                                            {timePicker.open &&
                                                timePicker.type === "start" && (
                                                    <TimePicker
                                                        initial={
                                                            formData.start_time ||
                                                            "09:00"
                                                        }
                                                        onCancel={() =>
                                                            setTimePicker({
                                                                open: false,
                                                            })
                                                        }
                                                        onChange={(val) =>
                                                            setFormData({
                                                                ...formData,
                                                                start_time: val,
                                                            })
                                                        }
                                                        align="below-left"
                                                    />
                                                )}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>End Time</Label>
                                        <div style={{ position: "relative" }}>
                                            <Input
                                                type="time"
                                                value={formData.end_time}
                                                readOnly
                                                onMouseDown={(e) =>
                                                    e.preventDefault()
                                                }
                                                onClick={() =>
                                                    setTimePicker({
                                                        open: true,
                                                        type: "end",
                                                    })
                                                }
                                                required
                                                className="barber-dialog-input flex h-9 w-full rounded-md border px-3 py-1 text-sm outline-none transition-all"
                                                style={{
                                                    backgroundColor: "#F9FAFB",
                                                    color: "#111827",
                                                    borderColor: "#D1D5DB",
                                                    paddingRight: 40,
                                                }}
                                            />
                                            {timePicker.open &&
                                                timePicker.type === "end" && (
                                                    <TimePicker
                                                        initial={
                                                            formData.end_time ||
                                                            "20:00"
                                                        }
                                                        onCancel={() =>
                                                            setTimePicker({
                                                                open: false,
                                                            })
                                                        }
                                                        onChange={(val) =>
                                                            setFormData({
                                                                ...formData,
                                                                end_time: val,
                                                            })
                                                        }
                                                        minTime={
                                                            datePickerMode ===
                                                            "single"
                                                                ? formData.start_time
                                                                : undefined
                                                        }
                                                        align="below-left"
                                                    />
                                                )}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Reason (Optional)</Label>
                                    <Textarea
                                        placeholder="e.g., National Holiday, Personal Day, Training..."
                                        value={formData.reason}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                reason: e.target.value,
                                            })
                                        }
                                        rows={3}
                                        maxLength={100}
                                        className="barber-dialog-input w-full rounded-md border px-3 py-2 text-sm"
                                        style={{
                                            backgroundColor: "#F9FAFB",
                                            color: "#111827",
                                            borderColor: "#D1D5DB",
                                        }}
                                        onFocus={(e) => {
                                            const el =
                                                e.currentTarget as HTMLTextAreaElement;
                                            el.style.borderColor = "#9CA3AF";
                                            el.style.outline = "none";
                                            el.style.boxShadow = "none";
                                        }}
                                        onBlur={(e) => {
                                            const el =
                                                e.currentTarget as HTMLTextAreaElement;
                                            el.style.borderColor = "#D1D5DB";
                                            el.style.outline = "none";
                                            el.style.boxShadow = "none";
                                        }}
                                    />
                                </div>

                                {isSingleDateRangeInvalid && (
                                    <div
                                        style={{
                                            width: "100%",
                                            marginBottom: 12,
                                            padding: "10px 12px",
                                            borderRadius: 6,
                                            backgroundColor: "#FEF2F2",
                                            color: "#991B1B",
                                            border: "1px solid #FECACA",
                                        }}>
                                        End time must be after start time.
                                        Please adjust the end time before
                                        confirming.
                                    </div>
                                )}
                                <div className="pt-6 md:px-8 rounded-b-xl flex flex-row items-center justify-end gap-3 flex-wrap">
                                    <DialogPrimitive.Close asChild>
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
                                                resetForm();
                                            }}>
                                            Cancel
                                        </Button>
                                    </DialogPrimitive.Close>
                                    <Button
                                        type="submit"
                                        disabled={
                                            submitting ||
                                            isSingleDateRangeInvalid
                                        }
                                        className="admin-primary-btn h-11 px-7 whitespace-nowrap rounded-md outline-none focus:outline-none ring-0 focus:ring-0 focus-visible:ring-0 ring-offset-0 focus-visible:ring-offset-0 transition-colors"
                                        style={{
                                            paddingLeft: "1rem",
                                            paddingRight: "1rem",
                                            minWidth: "8rem",
                                        }}>
                                        {submitting
                                            ? "Blocking..."
                                            : "Block Time"}
                                    </Button>
                                </div>
                            </form>
                        </DialogPrimitive.Content>
                    </DialogPrimitive.Portal>
                </DialogPrimitive.Root>
            </div>

            {/* Stats */}
            <div className="mb-8">
                <div
                    className="service-stats"
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(2, 1fr)",
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
                            Upcoming Blocks
                        </div>
                        <div
                            style={{
                                fontSize: "2.5rem",
                                fontWeight: 500,
                                color: "#111827",
                                marginTop: "0.25rem",
                            }}>
                            {upcomingBlocks.length}
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
                            Past Blocks
                        </div>
                        <div
                            style={{
                                fontSize: "2.5rem",
                                fontWeight: 500,
                                color: "#9CA3AF",
                                marginTop: "0.25rem",
                            }}>
                            {pastBlocks.length}
                        </div>
                    </div>
                </div>
            </div>

            {/* Upcoming Blocks */}
            <Card className="mb-6 bg-transparent shadow-none border-0">
                <CardHeader>
                    <CardTitle className="text-2xl font-bold text-gray-900">
                        Upcoming Blocked Time ({upcomingBlocks.length})
                    </CardTitle>
                </CardHeader>
                <CardContent className="px-0">
                    {loading ? (
                        <div className="text-center py-12">
                            <p className="text-gray-500">Loading...</p>
                        </div>
                    ) : upcomingBlocks.length === 0 ? (
                        <div className="text-center py-12">
                            <Clock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                            <p className="text-gray-500">
                                No upcoming blocked time slots
                            </p>
                        </div>
                    ) : (
                        <div
                            className="barber-row px-0"
                            style={{ paddingLeft: 0, paddingRight: 0 }}>
                            {upcomingBlocks.map((block) => (
                                <Card
                                    key={block.id}
                                    className="bg-white rounded-lg overflow-hidden"
                                    style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        backgroundColor: "#ffffff",
                                        borderColor: "#E5E7EB",
                                        borderWidth: 1,
                                        borderStyle: "solid",
                                        borderRadius: "0.75rem",
                                    }}>
                                    <div
                                        className="px-6 py-3 flex items-center justify-between"
                                        style={{ gap: 12, flex: 1 }}>
                                        <div className="flex items-center gap-4 flex-1 min-w-0">
                                            {/* calendar icon removed */}
                                            <div className="min-w-0 flex flex-col justify-center">
                                                {(() => {
                                                    const s = new Date(
                                                        block.start_datetime
                                                    );
                                                    const e = new Date(
                                                        block.end_datetime
                                                    );
                                                    const sameDay =
                                                        s.toDateString() ===
                                                        e.toDateString();
                                                    if (sameDay) {
                                                        return (
                                                            <div>
                                                                <div
                                                                    className="text-sm font-medium text-gray-900"
                                                                    style={{
                                                                        whiteSpace:
                                                                            "normal",
                                                                    }}>
                                                                    <span aria-hidden="true">
                                                                        🗓{" "}
                                                                    </span>
                                                                    {format(
                                                                        s,
                                                                        "MMM dd, yyyy"
                                                                    )}
                                                                    ,{" "}
                                                                    <span className="font-medium text-gray-700">
                                                                        from{" "}
                                                                    </span>
                                                                    <span
                                                                        className="underline"
                                                                        style={{
                                                                            textDecoration:
                                                                                "underline",
                                                                        }}>
                                                                        {format(
                                                                            s,
                                                                            "H:mm"
                                                                        )}
                                                                    </span>{" "}
                                                                    <span className="font-medium text-gray-700">
                                                                        to
                                                                    </span>{" "}
                                                                    <span
                                                                        className="underline"
                                                                        style={{
                                                                            textDecoration:
                                                                                "underline",
                                                                        }}>
                                                                        {format(
                                                                            e,
                                                                            "H:mm"
                                                                        )}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        );
                                                    }
                                                    return (
                                                        <div>
                                                            <div
                                                                className="text-sm font-medium text-gray-900"
                                                                style={{
                                                                    whiteSpace:
                                                                        "normal",
                                                                }}>
                                                                <span className="font-medium text-gray-700">
                                                                    🗓 From :{" "}
                                                                </span>
                                                                <span
                                                                    className="underline"
                                                                    style={{
                                                                        textDecoration:
                                                                            "underline",
                                                                    }}>
                                                                    {format(
                                                                        s,
                                                                        "HH:mm, MMM dd, yyyy"
                                                                    )}
                                                                </span>
                                                            </div>
                                                            <div
                                                                className="text-sm font-medium text-gray-700 mt-1"
                                                                style={{
                                                                    whiteSpace:
                                                                        "normal",
                                                                }}>
                                                                <span className="font-medium text-gray-700">
                                                                    To :{" "}
                                                                </span>
                                                                <span
                                                                    className="underline"
                                                                    style={{
                                                                        textDecoration:
                                                                            "underline",
                                                                    }}>
                                                                    {format(
                                                                        e,
                                                                        "HH:mm, MMM dd, yyyy"
                                                                    )}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
                                                <div
                                                    className="text-xs text-gray-500 mt-1"
                                                    style={{
                                                        color: "#6B7280",
                                                    }}>
                                                    {block.barber_id ? (
                                                        <span className="font-medium">
                                                            {
                                                                block.barbers
                                                                    ?.name
                                                            }
                                                        </span>
                                                    ) : (
                                                        <span className="font-medium text-red-600">
                                                            All Barbers (Shop
                                                            Closed)
                                                        </span>
                                                    )}{" "}
                                                    {block.reason ? (
                                                        <>• {block.reason}</>
                                                    ) : null}
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    handleDelete(
                                                        block.id,
                                                        getBlockDescription(
                                                            block
                                                        )
                                                    )
                                                }
                                                className="text-red-600 rounded p-1"
                                                style={{
                                                    background: "transparent",
                                                }}>
                                                <Trash2
                                                    size={16}
                                                    style={{
                                                        pointerEvents: "auto",
                                                        color: "#dc2626",
                                                    }}
                                                />
                                            </button>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Past Blocks */}
            {pastBlocks.length > 0 && (
                <Card className="mb-6 bg-transparent shadow-none border-0">
                    <CardHeader>
                        <CardTitle className="text-2xl font-bold text-gray-900">
                            Past Blocked Time ({pastBlocks.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-0">
                        <div
                            className="barber-row px-0"
                            style={{ paddingLeft: 0, paddingRight: 0 }}>
                            {pastBlocks.map((block) => (
                                <Card
                                    key={block.id}
                                    className="bg-white rounded-lg overflow-hidden"
                                    style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        backgroundColor: "#ffffff",
                                        borderColor: "#E5E7EB",
                                        borderWidth: 1,
                                        borderStyle: "solid",
                                        borderRadius: "0.75rem",
                                    }}>
                                    <div
                                        className="px-6 py-3 flex items-center justify-between"
                                        style={{ gap: 12, flex: 1 }}>
                                        <div className="flex items-center gap-4 flex-1 min-w-0">
                                            {/* calendar icon removed */}
                                            <div className="min-w-0 flex flex-col justify-center">
                                                {(() => {
                                                    const s = new Date(
                                                        block.start_datetime
                                                    );
                                                    const e = new Date(
                                                        block.end_datetime
                                                    );
                                                    const sameDay =
                                                        s.toDateString() ===
                                                        e.toDateString();
                                                    if (sameDay) {
                                                        return (
                                                            <>
                                                                <div
                                                                    className="text-sm font-medium text-gray-900"
                                                                    style={{
                                                                        whiteSpace:
                                                                            "normal",
                                                                    }}>
                                                                    <span aria-hidden="true">
                                                                        🗓{" "}
                                                                    </span>
                                                                    {format(
                                                                        s,
                                                                        "MMM dd, yyyy"
                                                                    )}
                                                                    ,{" "}
                                                                    <span className="font-medium text-gray-700">
                                                                        from{" "}
                                                                    </span>
                                                                    <span
                                                                        className="underline"
                                                                        style={{
                                                                            textDecoration:
                                                                                "underline",
                                                                        }}>
                                                                        {format(
                                                                            s,
                                                                            "H:mm"
                                                                        )}
                                                                    </span>{" "}
                                                                    <span className="font-medium text-gray-700">
                                                                        to
                                                                    </span>{" "}
                                                                    <span
                                                                        className="underline"
                                                                        style={{
                                                                            textDecoration:
                                                                                "underline",
                                                                        }}>
                                                                        {format(
                                                                            e,
                                                                            "H:mm"
                                                                        )}
                                                                    </span>
                                                                </div>
                                                                <div
                                                                    className="text-xs text-gray-500 mt-1"
                                                                    style={{
                                                                        color: "#6B7280",
                                                                    }}>
                                                                    {block.barber_id ? (
                                                                        <span className="font-medium">
                                                                            {
                                                                                block
                                                                                    .barbers
                                                                                    ?.name
                                                                            }
                                                                        </span>
                                                                    ) : (
                                                                        <span className="font-medium text-red-600">
                                                                            All
                                                                            Barbers
                                                                            (Shop
                                                                            Closed)
                                                                        </span>
                                                                    )}{" "}
                                                                    {block.reason ? (
                                                                        <>
                                                                            •{" "}
                                                                            {
                                                                                block.reason
                                                                            }
                                                                        </>
                                                                    ) : null}
                                                                </div>
                                                            </>
                                                        );
                                                    }
                                                    return (
                                                        <>
                                                            <div
                                                                className="text-sm font-medium text-gray-900"
                                                                style={{
                                                                    whiteSpace:
                                                                        "normal",
                                                                }}>
                                                                <span className="font-medium text-gray-700">
                                                                    🗓 From :{" "}
                                                                </span>
                                                                <span
                                                                    className="underline"
                                                                    style={{
                                                                        textDecoration:
                                                                            "underline",
                                                                    }}>
                                                                    {format(
                                                                        s,
                                                                        "HH:mm, MMM dd, yyyy"
                                                                    )}
                                                                </span>
                                                            </div>
                                                            <div
                                                                className="text-sm font-medium text-gray-700 mt-1"
                                                                style={{
                                                                    whiteSpace:
                                                                        "normal",
                                                                }}>
                                                                <span className="font-medium text-gray-700">
                                                                    To :{" "}
                                                                </span>
                                                                <span
                                                                    className="underline"
                                                                    style={{
                                                                        textDecoration:
                                                                            "underline",
                                                                    }}>
                                                                    {format(
                                                                        e,
                                                                        "HH:mm, MMM dd, yyyy"
                                                                    )}
                                                                </span>
                                                            </div>
                                                            <div
                                                                className="text-xs text-gray-500 mt-1"
                                                                style={{
                                                                    color: "#6B7280",
                                                                }}>
                                                                {block.barber_id ? (
                                                                    <span className="font-medium">
                                                                        {
                                                                            block
                                                                                .barbers
                                                                                ?.name
                                                                        }
                                                                    </span>
                                                                ) : (
                                                                    <span className="font-medium text-red-600">
                                                                        All
                                                                        Barbers
                                                                        (Shop
                                                                        Closed)
                                                                    </span>
                                                                )}{" "}
                                                                {block.reason ? (
                                                                    <>
                                                                        •{" "}
                                                                        {
                                                                            block.reason
                                                                        }
                                                                    </>
                                                                ) : null}
                                                            </div>
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        </div>

                                        <div>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    handleDelete(
                                                        block.id,
                                                        getBlockDescription(
                                                            block
                                                        )
                                                    )
                                                }
                                                className="text-red-600 rounded p-1"
                                                style={{
                                                    background: "transparent",
                                                }}>
                                                <Trash2
                                                    size={16}
                                                    style={{
                                                        pointerEvents: "auto",
                                                        color: "#dc2626",
                                                    }}
                                                />
                                            </button>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
            {/* Delete blocked slot confirmation modal (matches delete barber design) */}
            {blockDelete.open && (
                <div
                    className="fixed inset-0 flex items-center justify-center"
                    style={{ zIndex: 2147483647 }}>
                    <div
                        className="absolute inset-0 bg-black/70"
                        style={{
                            backdropFilter: "blur(4px)",
                            WebkitBackdropFilter: "blur(4px)",
                        }}
                        onClick={() => setBlockDelete({ open: false })}
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
                                Delete blocked slot?
                            </h3>
                            <p
                                className="text-sm text-gray-600 text-center font-bold"
                                style={{ marginTop: "15px" }}>
                                {blockDelete.description ? (
                                    <>
                                        <span className="font-semibold">
                                            {blockDelete.description}
                                        </span>
                                        <br />
                                        <span>
                                            This will permanently remove the
                                            blocked slot.
                                        </span>
                                        <br />
                                        <span>
                                            This action cannot be undone.
                                        </span>
                                    </>
                                ) : (
                                    "This action cannot be undone."
                                )}
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
                                onClick={() => setBlockDelete({ open: false })}>
                                Cancel
                            </Button>
                            <Button
                                className="h-9 px-4 rounded-md transition-colors admin-cancel-btn"
                                onClick={confirmDeleteBlock}>
                                Confirm Delete
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
