import React, { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { format } from "date-fns";
import { supabase } from "../lib/supabase";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Calendar } from "./ui/calendar";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import {
    Check,
    ChevronLeft,
    ChevronRight,
    Scissors,
    Clock,
    DollarSign,
    User,
    Calendar as CalendarIcon,
    Mail,
    Phone,
    FileText,
    X,
} from "lucide-react";

// Format a Date to local YYYY-MM-DD (avoid UTC shifting problems)
const toLocalDateString = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

// Types
interface Service {
    id: string;
    name: string;
    duration: string;
    price: string;
    description: string;
    icon: typeof Scissors;
}

interface Barber {
    id: string;
    name: string;
    tag: string;
    avatar: string;
    initials: string;
    is_active?: boolean;
}

interface BookingData {
    service: Service | null;
    barber: Barber | null;
    date: Date | undefined;
    time: string;
    name: string;
    email: string;
    phone: string;
    notes: string;
    appointmentId?: string;
}

// Services are now fetched from Supabase within the component

export function BookingFlow({ onClose }: { onClose?: () => void }) {
    const [step, setStep] = useState(1);
    const [bookingData, setBookingData] = useState<BookingData>({
        service: null,
        barber: null,
        date: undefined,
        time: "",
        name: "",
        email: "",
        phone: "",
        notes: "",
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [hoveredDay, setHoveredDay] = useState<Date | undefined>(undefined);

    // Services state (from Supabase)
    const [services, setServices] = useState<Service[]>([]);
    const [loadingServices, setLoadingServices] = useState(true);

    // Barbers state (from Supabase)
    const [barbers, setBarbers] = useState<Barber[]>([]);
    const [loadingBarbers, setLoadingBarbers] = useState(true);

    // Availability state (from DB)
    const [availableSlots, setAvailableSlots] = useState<
        Array<{ time: string; available: boolean; reason: string | null }>
    >([]);
    const [loadingSlots, setLoadingSlots] = useState(false);

    // Submit state
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    // Determine if we should show the mobile (≤600px) stepper
    const [isMobileStepper, setIsMobileStepper] = useState<boolean>(() =>
        typeof window !== "undefined"
            ? window.matchMedia("(max-width: 600px)").matches
            : false
    );
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        if (typeof window === "undefined") return;
        setMounted(true);
        const mq = window.matchMedia("(max-width: 600px)");
        const handler = (e: MediaQueryListEvent | MediaQueryList) => {
            setIsMobileStepper(
                "matches" in e ? e.matches : (e as MediaQueryList).matches
            );
        };
        // Initial sync and listener
        handler(mq as MediaQueryList);
        mq.addEventListener
            ? mq.addEventListener(
                  "change",
                  handler as (e: MediaQueryListEvent) => void
              )
            : mq.addListener(
                  handler as (
                      this: MediaQueryList,
                      ev: MediaQueryListEvent
                  ) => any
              );
        return () => {
            mq.removeEventListener
                ? mq.removeEventListener(
                      "change",
                      handler as (e: MediaQueryListEvent) => void
                  )
                : mq.removeListener(
                      handler as (
                          this: MediaQueryList,
                          ev: MediaQueryListEvent
                      ) => any
                  );
        };
    }, []);

    // Test Supabase connection on mount
    useEffect(() => {
        const testConnection = async () => {
            const { data, error } = await supabase.from("services").select("*");
            if (error) {
                console.error("Supabase connection error:", error);
            } else {
                console.log("✅ Connected to Supabase! Services:", data);
            }
        };
        testConnection();
    }, []);

    // Fetch services from Supabase on mount
    useEffect(() => {
        const fetchServices = async () => {
            setLoadingServices(true);
            const { data, error } = await supabase
                .from("services")
                .select("*")
                .order("display_order");

            if (error) {
                console.error("Error fetching services:", error);
                setLoadingServices(false);
                return;
            }

            if (data) {
                const transformedServices: Service[] = data.map(
                    (service: any) => ({
                        id: service.id,
                        name: service.name,
                        duration: `${service.duration} minutes`,
                        price: `$${service.price}`,
                        description: service.description || "",
                        is_active: service.is_active,
                        icon: Scissors,
                    })
                );
                setServices(transformedServices);
            }

            setLoadingServices(false);
        };

        fetchServices();
    }, []);

    // Fetch barbers from Supabase on mount
    useEffect(() => {
        const fetchBarbers = async () => {
            setLoadingBarbers(true);
            const { data, error } = await supabase.from("barbers").select("*");

            if (error) {
                console.error("Error fetching barbers:", error);
                setLoadingBarbers(false);
                return;
            }

            if (data) {
                const transformedBarbers: Barber[] = [
                    {
                        id: "none",
                        name: "No Preference",
                        tag: "Any available barber",
                        avatar: "",
                        initials: "?",
                        is_active: true,
                    },
                    ...data.map((barber: any) => ({
                        id: barber.id,
                        name: barber.name,
                        tag: barber.title,
                        avatar: barber.photo_url || "",
                        initials: String(barber.name || "")
                            .split(" ")
                            .map((n: string) => n[0])
                            .join("")
                            .toUpperCase(),
                        is_active: barber.is_active,
                    })),
                ];
                setBarbers(transformedBarbers);
            }

            setLoadingBarbers(false);
        };

        fetchBarbers();
    }, []);

    // Validate booking time business rules
    const validateBookingRules = (
        selectedDate: Date,
        selectedTime: string
    ): { valid: boolean; error?: string } => {
        const now = new Date();
        const [hours, minutes] = selectedTime.split(":").map(Number);
        const appointmentDateTime = new Date(selectedDate);
        appointmentDateTime.setHours(hours, minutes, 0, 0);

        // Cannot book more than 62 days in advance
        const maxDate = new Date(now);
        maxDate.setDate(maxDate.getDate() + 62);
        if (appointmentDateTime > maxDate) {
            return {
                valid: false,
                error: "Cannot book more than 62 days in advance",
            };
        }

        const isSameDay = selectedDate.toDateString() === now.toDateString();
        const hoursDifference =
            (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

        if (isSameDay) {
            // Same-day: after 13:00 and at least 4 hours in advance
            if (hours < 13) {
                return {
                    valid: false,
                    error: "Same-day bookings must be after 1:00 PM",
                };
            }
            if (hoursDifference < 4) {
                return {
                    valid: false,
                    error: "Same-day bookings require at least 4 hours advance notice",
                };
            }
        } else {
            // Other days: at least 18 hours in advance
            if (hoursDifference < 18) {
                return {
                    valid: false,
                    error: "Bookings require at least 18 hours advance notice",
                };
            }
        }

        return { valid: true };
    };

    // Fetch available slots for a given date based on appointments/blocks
    const fetchAvailableSlots = async (date: Date) => {
        if (!date) return;

        setLoadingSlots(true);
        try {
            // Determine selected service duration in minutes
            const selectedService = bookingData.service;
            const serviceDuration = selectedService
                ? parseInt(selectedService.duration)
                : 30; // e.g. "45 minutes" -> 45
            const slotsNeeded = Math.ceil(
                (isNaN(serviceDuration) ? 30 : serviceDuration) / 30
            );

            // Hours by day
            const isFriday = date.getDay() === 5;
            const startHour = isFriday ? 14 : 10;
            const endHour = 20; // 8 PM

            // Generate all possible slots (every 30 min)
            const allSlots: string[] = [];
            for (let hour = startHour; hour < endHour; hour++) {
                for (let minute of [0, 30]) {
                    const timeStr = `${hour
                        .toString()
                        .padStart(2, "0")}:${minute
                        .toString()
                        .padStart(2, "0")}`;
                    allSlots.push(timeStr);
                }
            }

            // Format date for queries (local)
            const dateStr = toLocalDateString(date);

            // Determine which barbers to check (exclude inactive)
            let barberIds: string[] = [];
            if (!bookingData.barber || bookingData.barber.id === "none") {
                barberIds = barbers
                    .filter((b) => b.id !== "none" && b.is_active !== false)
                    .map((b) => b.id);
            } else {
                // If a specific barber is selected but inactive, treat as no available slots
                const selected = barbers.find(
                    (b) => b.id === bookingData.barber!.id
                );
                if (selected && selected.is_active === false) {
                    setAvailableSlots([]);
                    setLoadingSlots(false);
                    return;
                }
                barberIds = [bookingData.barber.id];
            }

            if (barberIds.length === 0) {
                setAvailableSlots([]);
                setLoadingSlots(false);
                return;
            }

            // Fetch appointments for date/barbers
            const { data: appointments, error: appointmentsError } =
                await supabase
                    .from("appointments")
                    .select("barber_id, appointment_time, end_time")
                    .eq("appointment_date", dateStr)
                    .in("barber_id", barberIds)
                    .in("status", ["pending", "checked_in"]);

            if (appointmentsError) {
                console.error(
                    "Error fetching appointments:",
                    appointmentsError
                );
                setAvailableSlots([]);
                setLoadingSlots(false);
                return;
            }

            // Fetch blocked slots that overlap this day (global or specific barbers)
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);

            let blockedSlots: any[] | null = null;
            const orFilter = `barber_id.is.null,barber_id.in.(${barberIds.join(
                ","
            )})`;
            const { data: blocks, error: blockedError } = await supabase
                .from("blocked_slots")
                .select("barber_id, start_datetime, end_datetime")
                .or(orFilter)
                .gte("end_datetime", startOfDay.toISOString())
                .lte("start_datetime", endOfDay.toISOString());

            if (blockedError) {
                console.error("Error fetching blocked slots:", blockedError);
                blockedSlots = [];
            } else {
                blockedSlots = blocks || [];
            }

            // Fetch weekly schedules for these barbers for this day of week
            const dayOfWeek = date.getDay();
            const { data: schedules, error: schedulesError } = await supabase
                .from("barber_schedules")
                .select("barber_id, is_working, start_time, end_time")
                .eq("day_of_week", dayOfWeek)
                .in("barber_id", barberIds);
            if (schedulesError) {
                console.error(
                    "Error fetching barber schedules:",
                    schedulesError
                );
            }
            const scheduleMap = new Map<
                string,
                {
                    is_working: boolean;
                    start_time: string | null;
                    end_time: string | null;
                }
            >();
            (schedules || []).forEach((s: any) => {
                scheduleMap.set(s.barber_id, {
                    is_working: s.is_working,
                    start_time: s.start_time,
                    end_time: s.end_time,
                });
            });

            // Filter available slots for DB conflicts only (intermediate)
            const available = allSlots.filter((slot) => {
                const [hours, minutes] = slot.split(":").map(Number);
                const slotTime = new Date(date);
                slotTime.setHours(hours, minutes, 0, 0);

                // End time for the booking window
                const slotEndTime = new Date(slotTime);
                slotEndTime.setMinutes(
                    slotEndTime.getMinutes() + slotsNeeded * 30
                );

                // Ensure it doesn't exceed closing time
                if (
                    slotEndTime.getHours() > endHour ||
                    (slotEndTime.getHours() === endHour &&
                        slotEndTime.getMinutes() > 0)
                ) {
                    return false;
                }

                // Past time check
                const now = new Date();
                if (slotTime <= now) return false;

                // At least one barber available for this slot
                const isAvailableForAnyBarber = barberIds.some((barberId) => {
                    // Check weekly schedule first
                    const sch = scheduleMap.get(barberId);
                    if (!sch || sch.is_working === false) return false;
                    // Validate time within working hours
                    if (sch.start_time && sch.end_time) {
                        const [whStartH, whStartM] = sch.start_time
                            .split(":")
                            .map(Number);
                        const [whEndH, whEndM] = sch.end_time
                            .split(":")
                            .map(Number);
                        const workStart = new Date(date);
                        workStart.setHours(whStartH, whStartM, 0, 0);
                        const workEnd = new Date(date);
                        workEnd.setHours(whEndH, whEndM, 0, 0);
                        if (!(slotTime >= workStart && slotEndTime <= workEnd))
                            return false;
                    }
                    // Appointment overlap check
                    const hasConflict = (appointments || []).some((apt) => {
                        if (apt.barber_id !== barberId) return false;
                        const aptStart = new Date(date);
                        const [aptHours, aptMinutes] = String(
                            apt.appointment_time
                        )
                            .split(":")
                            .map(Number);
                        aptStart.setHours(aptHours, aptMinutes, 0, 0);
                        const aptEnd = new Date(date);
                        const [endHours, endMinutes] = String(apt.end_time)
                            .split(":")
                            .map(Number);
                        aptEnd.setHours(endHours, endMinutes, 0, 0);
                        return slotTime < aptEnd && slotEndTime > aptStart;
                    });
                    if (hasConflict) return false;

                    // Blocked intervals overlap check
                    const isBlocked = (blockedSlots || []).some((blocked) => {
                        if (
                            blocked.barber_id !== null &&
                            blocked.barber_id !== barberId
                        )
                            return false;
                        const blockStart = new Date(blocked.start_datetime);
                        const blockEnd = new Date(blocked.end_datetime);
                        return slotTime < blockEnd && slotEndTime > blockStart;
                    });
                    return !isBlocked;
                });

                return isAvailableForAnyBarber;
            });

            // Instead of filtering, mark each slot as available or not
            const slotsWithStatus = allSlots
                .map((slot) => {
                    const [hours, minutes] = slot.split(":").map(Number);
                    const slotTime = new Date(date);
                    slotTime.setHours(hours, minutes, 0, 0);

                    const slotEndTime = new Date(slotTime);
                    slotEndTime.setMinutes(
                        slotEndTime.getMinutes() + slotsNeeded * 30
                    );

                    const now = new Date();
                    if (slotTime <= now) {
                        return null; // Will be filtered out
                    }

                    if (
                        slotEndTime.getHours() > endHour ||
                        (slotEndTime.getHours() === endHour &&
                            slotEndTime.getMinutes() > 0)
                    ) {
                        return {
                            time: slot,
                            available: false,
                            reason: "Insufficient time before closing",
                        };
                    }

                    const validation = validateBookingRules(date, slot);
                    if (!validation.valid) {
                        return {
                            time: slot,
                            available: false,
                            reason: validation.error || null,
                        };
                    }

                    const isAvailableForAnyBarber = barberIds.some(
                        (barberId) => {
                            // Check weekly schedule first
                            const sch = scheduleMap.get(barberId);
                            if (!sch || sch.is_working === false) return false;
                            if (sch.start_time && sch.end_time) {
                                const [whStartH, whStartM] = sch.start_time
                                    .split(":")
                                    .map(Number);
                                const [whEndH, whEndM] = sch.end_time
                                    .split(":")
                                    .map(Number);
                                const workStart = new Date(date);
                                workStart.setHours(whStartH, whStartM, 0, 0);
                                const workEnd = new Date(date);
                                workEnd.setHours(whEndH, whEndM, 0, 0);
                                if (
                                    !(
                                        slotTime >= workStart &&
                                        slotEndTime <= workEnd
                                    )
                                )
                                    return false;
                            }
                            const hasConflict = (appointments || []).some(
                                (apt) => {
                                    if (apt.barber_id !== barberId)
                                        return false;
                                    const aptStart = new Date(date);
                                    const [aptHours, aptMinutes] = String(
                                        apt.appointment_time
                                    )
                                        .split(":")
                                        .map(Number);
                                    aptStart.setHours(
                                        aptHours,
                                        aptMinutes,
                                        0,
                                        0
                                    );
                                    const aptEnd = new Date(date);
                                    const [endHours, endMinutes] = String(
                                        apt.end_time
                                    )
                                        .split(":")
                                        .map(Number);
                                    aptEnd.setHours(endHours, endMinutes, 0, 0);
                                    return (
                                        slotTime < aptEnd &&
                                        slotEndTime > aptStart
                                    );
                                }
                            );
                            if (hasConflict) return false;

                            const isBlocked = (blockedSlots || []).some(
                                (blocked) => {
                                    if (
                                        blocked.barber_id !== null &&
                                        blocked.barber_id !== barberId
                                    )
                                        return false;
                                    const blockStart = new Date(
                                        blocked.start_datetime
                                    );
                                    const blockEnd = new Date(
                                        blocked.end_datetime
                                    );
                                    return (
                                        slotTime < blockEnd &&
                                        slotEndTime > blockStart
                                    );
                                }
                            );
                            return !isBlocked;
                        }
                    );

                    if (!isAvailableForAnyBarber) {
                        return {
                            time: slot,
                            available: false,
                            reason: "Fully booked",
                        };
                    }

                    return { time: slot, available: true, reason: null };
                })
                .filter((slot) => slot !== null) as Array<{
                time: string;
                available: boolean;
                reason: string | null;
            }>;

            setAvailableSlots(slotsWithStatus);
        } catch (error) {
            console.error("Error checking availability:", error);
            setAvailableSlots([]);
        }

        setLoadingSlots(false);
    };

    // Recompute available slots when inputs change
    useEffect(() => {
        if (bookingData.date && bookingData.service && barbers.length > 0) {
            fetchAvailableSlots(bookingData.date);
        } else {
            setAvailableSlots([]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        bookingData.date,
        bookingData.service,
        bookingData.barber,
        services,
        barbers,
    ]);

    const handleTimeSelection = (time: string) => {
        if (!bookingData.date) return;
        const validation = validateBookingRules(bookingData.date, time);
        if (!validation.valid) {
            alert(validation.error);
            return;
        }
        setBookingData({ ...bookingData, time });
    };

    const updateBookingData = (field: keyof BookingData, value: any) => {
        setBookingData((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors((prev) => ({ ...prev, [field]: "" }));
        }
    };

    // Calendar month boundaries: current month to end of next month
    const startOfThisMonth = useMemo(() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1);
    }, []);

    const endOfNextMonth = useMemo(() => {
        const now = new Date();
        const nextMonthFirst = new Date(
            now.getFullYear(),
            now.getMonth() + 1,
            1
        );
        return new Date(
            nextMonthFirst.getFullYear(),
            nextMonthFirst.getMonth() + 1,
            0
        );
    }, []);

    const todayStart = useMemo(() => {
        const t = new Date();
        t.setHours(0, 0, 0, 0);
        return t;
    }, []);

    // Track the currently displayed month in the calendar to accurately detect outside days
    const [currentMonth, setCurrentMonth] = useState<Date>(() => {
        const n = new Date();
        return new Date(n.getFullYear(), n.getMonth(), 1);
    });

    const isSelectableDate = (d: Date) => {
        const dateOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        const inMonth =
            dateOnly.getFullYear() === currentMonth.getFullYear() &&
            dateOnly.getMonth() === currentMonth.getMonth();
        return inMonth && dateOnly >= todayStart && dateOnly <= endOfNextMonth;
    };

    const validateStep = () => {
        const newErrors: Record<string, string> = {};

        if (step === 1 && !bookingData.service) {
            newErrors.service = "Please select a service";
        }
        if (step === 2 && !bookingData.barber) {
            newErrors.barber = "Please select a barber";
        }
        if (step === 3) {
            if (!bookingData.date) {
                newErrors.date = "Please select a date";
            }
            if (!bookingData.time) {
                newErrors.time = "Please select a time";
            }
        }
        if (step === 4) {
            if (!bookingData.name.trim()) {
                newErrors.name = "Name is required";
            } else if (bookingData.name.trim().length < 2) {
                newErrors.name = "Name must be at least 2 characters";
            }
            if (!bookingData.email.trim()) {
                newErrors.email = "Email is required";
            } else if (
                !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]*\.[a-zA-Z0-9.-]*[a-zA-Z]{2,}$/.test(
                    bookingData.email
                )
            ) {
                newErrors.email = "Invalid email format";
            }
            if (!bookingData.phone.trim()) {
                newErrors.phone = "Phone number is required";
            } else if (!/^(05|06|07)[0-9]{8}$/.test(bookingData.phone)) {
                newErrors.phone = "Please enter a valid phone number";
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const nextStep = () => {
        if (validateStep()) {
            setStep((prev) => Math.min(prev + 1, 6));
        }
    };

    const prevStep = () => {
        setStep((prev) => Math.max(prev - 1, 1));
    };

    const confirmBooking = async () => {
        if (!validateStep()) return;

        setSubmitting(true);
        setSubmitError(null);

        try {
            // Resolve selected service
            const selectedService = bookingData.service;
            if (!selectedService) {
                throw new Error("Selected service not found");
            }

            // Determine assigned barber id
            let assignedBarberId: string | undefined = bookingData.barber?.id;

            // If no preference, pick an available barber for the chosen slot
            if (!bookingData.barber || bookingData.barber.id === "none") {
                const dateStr = toLocalDateString(bookingData.date!);
                const serviceDuration = parseInt(selectedService.duration); // e.g. "45 minutes" -> 45
                const slotsNeeded = Math.ceil(
                    (isNaN(serviceDuration) ? 30 : serviceDuration) / 30
                );

                const [h, m] = bookingData.time!.split(":").map(Number);
                const startTime = new Date(bookingData.date!);
                startTime.setHours(h, m, 0, 0);
                const endTime = new Date(startTime);
                endTime.setMinutes(endTime.getMinutes() + slotsNeeded * 30);
                const timeStr = bookingData.time!;
                const endTimeStr = `${endTime
                    .getHours()
                    .toString()
                    .padStart(2, "0")}:${endTime
                    .getMinutes()
                    .toString()
                    .padStart(2, "0")}`;

                // Only consider active barbers
                const availableBarberIds = barbers
                    .filter((b) => b.id !== "none" && b.is_active !== false)
                    .map((b) => b.id);

                const { data: appointments } = await supabase
                    .from("appointments")
                    .select("barber_id, appointment_time, end_time")
                    .eq("appointment_date", dateStr)
                    .in("barber_id", availableBarberIds)
                    .in("status", ["confirmed", "checked_in"]);

                // Filter out busy barbers by overlap
                const busyBarbers = (appointments || [])
                    .filter((apt) => {
                        const aptStart = String(apt.appointment_time);
                        const aptEnd = String(apt.end_time);
                        // string compare would be brittle; compare as times
                        const [asH, asM] = aptStart.split(":").map(Number);
                        const [aeH, aeM] = aptEnd.split(":").map(Number);
                        const aptStartDate = new Date(bookingData.date!);
                        aptStartDate.setHours(asH, asM, 0, 0);
                        const aptEndDate = new Date(bookingData.date!);
                        aptEndDate.setHours(aeH, aeM, 0, 0);
                        return !(
                            endTime <= aptStartDate || startTime >= aptEndDate
                        );
                    })
                    .map((apt) => apt.barber_id);

                let freeBarbers = availableBarberIds.filter(
                    (id) => !busyBarbers.includes(id)
                );
                if (freeBarbers.length === 0) {
                    throw new Error("No barbers available for this time slot");
                }

                // Pick a barber and re-validate just before insert to avoid race assigning same barber twice
                // Retry across remaining free barbers if conflict is detected
                while (freeBarbers.length > 0) {
                    const pickIndex = Math.floor(
                        Math.random() * freeBarbers.length
                    );
                    const candidateId = freeBarbers[pickIndex];

                    // Re-check candidate availability right now
                    const { data: latestApts } = await supabase
                        .from("appointments")
                        .select("id")
                        .eq("appointment_date", dateStr)
                        .eq("barber_id", candidateId)
                        .in("status", ["pending", "checked_in"])
                        .or(
                            `and(appointment_time.eq.${timeStr}:00,end_time.eq.${endTimeStr}:00),and(appointment_time.lt.${endTimeStr}:00,end_time.gt.${timeStr}:00)`
                        );

                    if (!latestApts || latestApts.length === 0) {
                        assignedBarberId = candidateId;
                        break;
                    }
                    // Remove candidate and try another
                    freeBarbers.splice(pickIndex, 1);
                }

                if (!assignedBarberId) {
                    throw new Error(
                        "No barbers available (race condition). Please try again."
                    );
                }
            }

            if (!assignedBarberId) {
                throw new Error("Could not determine barber");
            }

            // Calculate end time for insert
            const [hours, minutes] = bookingData.time!.split(":").map(Number);
            const serviceDuration = parseInt(selectedService.duration);
            const roundedDuration =
                Math.ceil(
                    (isNaN(serviceDuration) ? 30 : serviceDuration) / 30
                ) * 30;

            const endTimeDate = new Date(bookingData.date!);
            endTimeDate.setHours(hours, minutes, 0, 0);
            endTimeDate.setMinutes(endTimeDate.getMinutes() + roundedDuration);
            const endTimeStr = `${endTimeDate
                .getHours()
                .toString()
                .padStart(2, "0")}:${endTimeDate
                .getMinutes()
                .toString()
                .padStart(2, "0")}:00`;

            // Final overlap guard for the chosen barber to avoid double-assign
            {
                const dateStr = toLocalDateString(bookingData.date!);
                const timeStr = bookingData.time!;
                const endStr = endTimeStr.slice(0, 5); // HH:MM
                const { data: overlap } = await supabase
                    .from("appointments")
                    .select("id")
                    .eq("appointment_date", dateStr)
                    .eq("barber_id", assignedBarberId)
                    .in("status", ["pending", "checked_in"])
                    .or(
                        `and(appointment_time.eq.${timeStr}:00,end_time.eq.${endStr}:00),and(appointment_time.lt.${endStr}:00,end_time.gt.${timeStr}:00)`
                    );
                if (overlap && overlap.length > 0) {
                    if (
                        bookingData.barber &&
                        bookingData.barber.id !== "none"
                    ) {
                        throw new Error(
                            "Selected barber just became unavailable for this time. Please pick another time or barber."
                        );
                    } else {
                        throw new Error(
                            "No barbers available for this time slot"
                        );
                    }
                }
            }

            // Throttle: max 3 future appointments for this phone
            const { data: existingAppointments } = await supabase
                .from("appointments")
                .select("id")
                .eq("customer_phone", bookingData.phone)
                .gte("appointment_date", toLocalDateString(new Date()))
                .in("status", ["pending", "checked_in"]);

            if (existingAppointments && existingAppointments.length >= 3) {
                throw new Error(
                    "You already have 3 future appointments. Please cancel one before booking another."
                );
            }

            // Insert appointment
            const { data: appointment, error: insertError } = await supabase
                .from("appointments")
                .insert({
                    customer_name: bookingData.name,
                    customer_email: bookingData.email,
                    customer_phone: bookingData.phone,
                    barber_id: assignedBarberId,
                    barber_preference:
                        !bookingData.barber || bookingData.barber.id === "none"
                            ? "no_preference"
                            : "specific",
                    service_id: bookingData.service?.id,
                    appointment_date: toLocalDateString(bookingData.date!),
                    appointment_time: bookingData.time + ":00",
                    end_time: endTimeStr,
                    customer_message: bookingData.notes || null,
                    status: "pending",
                })
                .select()
                .single();

            if (insertError) {
                console.error("Error creating appointment:", insertError);
                throw new Error(
                    insertError.message || "Failed to create appointment"
                );
            }

            try {
                const selectedBarber = barbers.find(
                    (b) => b.id === assignedBarberId
                );
                const formattedDate = format(
                    bookingData.date!,
                    "MMMM dd, yyyy"
                );
                const priceNumber = (() => {
                    const raw = (selectedService.price || "").toString();
                    const cleaned = raw.replace("$", "").trim();
                    const n = parseFloat(cleaned);
                    return isNaN(n) ? 0 : n;
                })();
                const { data: emailData, error: emailError } =
                    await supabase.functions.invoke("send-booking-email", {
                        body: {
                            to: bookingData.email,
                            customerName: bookingData.name,
                            serviceName: selectedService.name,
                            barberName: selectedBarber?.name || "Our team",
                            appointmentDate: formattedDate,
                            appointmentTime: bookingData.time,
                            price: priceNumber,
                        },
                    });
                if (emailError) {
                    console.error("Error sending email:", emailError);
                } else {
                    console.log("✅ Confirmation email sent:", emailData);
                }
            } catch (emailError) {
                console.error("Error sending email:", emailError);
            }

            // Save id to state and advance
            setBookingData({ ...bookingData, appointmentId: appointment.id });
            setStep(6);
        } catch (error: any) {
            console.error("Booking error:", error);
            setSubmitError(
                error.message ||
                    "Failed to create appointment. Please try again."
            );
        } finally {
            setSubmitting(false);
        }
    };

    const resetBooking = () => {
        setBookingData({
            service: null,
            barber: null,
            date: undefined,
            time: "",
            name: "",
            email: "",
            phone: "",
            notes: "",
        });
        setErrors({});
        setStep(1);
    };

    const isPastTime = (time: string) => {
        if (!bookingData.date) return false;
        const today = new Date();
        const selectedDate = new Date(bookingData.date);

        if (selectedDate.toDateString() !== today.toDateString()) {
            return false;
        }

        const [hours, minutes] = time.split(":").map(Number);
        const selectedTime = new Date(selectedDate);
        selectedTime.setHours(hours, minutes, 0, 0);

        return selectedTime <= today;
    };

    return (
        <div className="min-h-screen bg-background booking-scope">
            {/* Dark Header Section */}
            <div className="bg-primary text-primary-foreground py-12 px-4 relative z-50 pointer-events-auto">
                <button
                    onClick={onClose}
                    onMouseEnter={(e) => {
                        const svg = e.currentTarget.querySelector(
                            "svg"
                        ) as SVGElement | null;
                        if (svg) svg.style.color = "#C9A961";
                    }}
                    onMouseLeave={(e) => {
                        const svg = e.currentTarget.querySelector(
                            "svg"
                        ) as SVGElement | null;
                        if (svg) svg.style.color = "";
                    }}
                    className="absolute top-4 right-4 z-50 p-2 cursor-pointer pointer-events-auto text-primary-foreground"
                    aria-label="Close booking">
                    <X className="w-6 h-6 transition-colors" />
                </button>
                <div className="max-w-4xl mx-auto text-center">
                    <h1
                        className="text-3xl md:text-4xl mb-4"
                        style={{ fontFamily: "'Playfair Display', serif" }}>
                        Book Your Appointment
                    </h1>
                    <p
                        className="text-[#C9A961] italic text-lg"
                        style={{ color: "#C9A961" }}>
                        Experience the art of classic grooming with modern style
                    </p>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 py-8">
                {/* Progress Stepper */}
                {step < 6 && mounted && (
                    <div className="mb-12">
                        {/* Only one of these renders based on isMobileStepper */}
                        {isMobileStepper ? (
                            // Mobile (≤600px): show only 3 circles with slide animation
                            <div className="booking-stepper-mobile">
                                <div className="relative overflow-hidden">
                                    {(() => {
                                        const all = [
                                            { num: 1, label: "SERVICE" },
                                            { num: 2, label: "BARBER" },
                                            { num: 3, label: "DATE & TIME" },
                                            { num: 4, label: "DETAILS" },
                                            { num: 5, label: "CONFIRMATION" },
                                        ];
                                        const start = Math.min(
                                            Math.max(step - 1, 1),
                                            3
                                        );
                                        // Move the track by 20% of its width per window (0%, -20%, -40%)
                                        const translate = -((start - 1) * 20);
                                        // Determine number of COMPLETED steps (not just current step)
                                        const detailsValid =
                                            bookingData.name.trim().length >=
                                                2 &&
                                            /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]*\.[a-zA-Z0-9.-]*[a-zA-Z]{2,}$/.test(
                                                bookingData.email.trim()
                                            ) &&
                                            /^(05|06|07)[0-9]{8}$/.test(
                                                bookingData.phone
                                            );
                                        let completed = 0;
                                        if (bookingData.service) completed += 1; // step 1 done
                                        if (bookingData.barber) completed += 1; // step 2 done
                                        if (
                                            bookingData.date &&
                                            bookingData.time
                                        )
                                            completed += 1; // step 3 done
                                        if (detailsValid) completed += 1; // step 4 done
                                        if (step === 6) completed += 1; // final confirmed
                                        // Fill to center of last completed circle: 0,10,30,50,70,90
                                        const centers = [0, 10, 30, 50, 70, 90];
                                        const filledToBase =
                                            centers[
                                                Math.min(
                                                    Math.max(completed, 0),
                                                    5
                                                )
                                            ];
                                        const filledTo =
                                            step >= 5 ? 90 : filledToBase;
                                        return (
                                            <motion.div
                                                className="flex relative"
                                                initial={false}
                                                animate={{ x: `${translate}%` }}
                                                transition={{
                                                    duration: 0.35,
                                                    ease: "easeInOut",
                                                }}
                                                style={{ width: "166.6667%" }}>
                                                {/* Base line (behind), light color spans full length */}
                                                <div
                                                    className="absolute"
                                                    style={{
                                                        top: 24,
                                                        left: -5,
                                                        right: "calc(10% - 24px)",
                                                        height: 3,
                                                        backgroundColor:
                                                            "#D1B896",
                                                        opacity: 0.25,
                                                        zIndex: 0,
                                                    }}
                                                />
                                                {/* Filled line (behind circles), from start to center of current step */}
                                                <div
                                                    className="absolute"
                                                    style={{
                                                        top: 24,
                                                        left: -5,
                                                        right: `calc(${
                                                            100 - filledTo
                                                        }% - 0px)`,
                                                        height: 3,
                                                        backgroundColor:
                                                            "#8B6F47",
                                                        zIndex: 1,
                                                        transition:
                                                            "right 350ms ease-in-out",
                                                    }}
                                                />
                                                {all.map((item) => (
                                                    <div
                                                        key={item.num}
                                                        className="flex flex-col items-center shrink-0"
                                                        style={{
                                                            flex: "0 0 20%",
                                                        }}>
                                                        <div
                                                            className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center mb-3 transition-all ${
                                                                step ===
                                                                item.num
                                                                    ? "bg-foreground text-background"
                                                                    : step >
                                                                      item.num
                                                                    ? "bg-accent text-white"
                                                                    : "bg-muted text-muted-foreground"
                                                            }`}>
                                                            {step > item.num ? (
                                                                <Check className="w-5 h-5" />
                                                            ) : (
                                                                <span>
                                                                    {item.num}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <span
                                                            className={`text-xs uppercase tracking-wider ${
                                                                step ===
                                                                item.num
                                                                    ? "text-foreground"
                                                                    : "text-muted-foreground"
                                                            }`}>
                                                            {item.label}
                                                        </span>
                                                    </div>
                                                ))}
                                            </motion.div>
                                        );
                                    })()}
                                </div>
                            </div>
                        ) : (
                            // Desktop/Tablet (>600px): show all 5 circles
                            <div className="booking-stepper-desktop">
                                <div className="flex items-center justify-between relative">
                                    {/* Base line (behind), light color spans full length */}
                                    <div
                                        className="absolute"
                                        style={{
                                            top: 24,
                                            left: -5,
                                            right: "calc(10% - 24px)",
                                            height: 3,
                                            backgroundColor: "#D1B896",
                                            opacity: 0.25,
                                            zIndex: 0,
                                        }}
                                    />
                                    {/* Filled line (behind circles), from start to center of current step */}
                                    {(() => {
                                        const detailsValid =
                                            bookingData.name.trim().length >=
                                                2 &&
                                            /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]*\.[a-zA-Z0-9.-]*[a-zA-Z]{2,}$/.test(
                                                bookingData.email.trim()
                                            ) &&
                                            /^(05|06|07)[0-9]{8}$/.test(
                                                bookingData.phone
                                            );
                                        let completed = 0;
                                        if (bookingData.service) completed += 1;
                                        if (bookingData.barber) completed += 1;
                                        if (
                                            bookingData.date &&
                                            bookingData.time
                                        )
                                            completed += 1;
                                        if (detailsValid) completed += 1;
                                        if (step === 6) completed += 1;
                                        const centers = [0, 10, 30, 50, 70, 90];
                                        const filledToBase =
                                            centers[
                                                Math.min(
                                                    Math.max(completed, 0),
                                                    5
                                                )
                                            ];
                                        const filledTo =
                                            step >= 5 ? 90 : filledToBase;
                                        return (
                                            <div
                                                className="absolute"
                                                style={{
                                                    top: 24,
                                                    left: -5,
                                                    right: `calc(${
                                                        100 - filledTo
                                                    }% - 0px)`,
                                                    height: 3,
                                                    backgroundColor: "#8B6F47",
                                                    zIndex: 1,
                                                    transition:
                                                        "right 350ms ease-in-out",
                                                }}
                                            />
                                        );
                                    })()}

                                    {[
                                        { num: 1, label: "SERVICE" },
                                        { num: 2, label: "BARBER" },
                                        { num: 3, label: "DATE & TIME" },
                                        { num: 4, label: "DETAILS" },
                                        { num: 5, label: "CONFIRMATION" },
                                    ].map((item) => (
                                        <div
                                            key={item.num}
                                            className="flex flex-col items-center flex-1">
                                            <div
                                                className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center mb-3 transition-all ${
                                                    step === item.num
                                                        ? "bg-foreground text-background"
                                                        : step > item.num
                                                        ? "bg-accent text-white"
                                                        : "bg-muted text-muted-foreground"
                                                }`}>
                                                {step > item.num ? (
                                                    <Check className="w-5 h-5" />
                                                ) : (
                                                    <span>{item.num}</span>
                                                )}
                                            </div>
                                            <span
                                                className={`text-xs uppercase tracking-wider ${
                                                    step === item.num
                                                        ? "text-foreground"
                                                        : "text-muted-foreground"
                                                }`}>
                                                {item.label}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Step Content */}
                <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                        key={step}
                        className="h-[520px] overflow-y-auto overflow-x-hidden"
                        initial="enter"
                        animate="center"
                        exit="exit"
                        variants={{
                            enter: { opacity: 0 },
                            center: { opacity: 1 },
                            exit: { opacity: 0 },
                        }}
                        transition={{
                            type: "tween",
                            ease: "easeInOut",
                            duration: 0.25,
                        }}>
                        {/* Step 1: Service Selection */}
                        {step === 1 && (
                            <div>
                                <h2 className="text-2xl mb-8">
                                    Choose Your Service
                                </h2>
                                {loadingServices ? (
                                    <div className="text-center py-8">
                                        Loading services...
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {services.map((service) => {
                                            const isInactive =
                                                service.is_active === false;
                                            const isSelected =
                                                bookingData.service?.id ===
                                                service.id;
                                            const clickable = !isInactive;

                                            return (
                                                <Card
                                                    key={service.id}
                                                    role="button"
                                                    aria-disabled={!clickable}
                                                    data-inactive={
                                                        isInactive
                                                            ? "true"
                                                            : undefined
                                                    }
                                                    onClick={() => {
                                                        if (!clickable) return;
                                                        updateBookingData(
                                                            "service",
                                                            service
                                                        );
                                                    }}
                                                    className={`transition-all duration-300 service-card border-2 text-center group ${
                                                        isSelected
                                                            ? "is-selected border-accent bg-[#ede9e6] -translate-y-1"
                                                            : "border-border"
                                                    } ${
                                                        isInactive
                                                            ? "inactive-card opacity-50 grayscale cursor-not-allowed pointer-events-none"
                                                            : "cursor-pointer"
                                                    }`}
                                                    style={
                                                        isSelected
                                                            ? {
                                                                  backgroundColor:
                                                                      "#ede9e6",
                                                              }
                                                            : undefined
                                                    }>
                                                    <CardContent className="p-6">
                                                        <div className="space-y-3">
                                                            <h3 className="text-xl transition-colors">
                                                                {service.name}
                                                            </h3>
                                                            <p
                                                                className="text-3xl transition-colors"
                                                                style={{
                                                                    color: "#C9A961",
                                                                }}>
                                                                {service.price}
                                                            </p>
                                                            <p className="text-sm text-muted-foreground">
                                                                {
                                                                    service.duration
                                                                }
                                                            </p>
                                                            {isInactive && (
                                                                <span className="mt-2 text-[11px] px-2 py-0.5 rounded bg-gray-200 text-gray-600">
                                                                    Inactive
                                                                </span>
                                                            )}
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            );
                                        })}
                                    </div>
                                )}
                                {errors.service && (
                                    <p className="text-destructive text-sm mt-4">
                                        {errors.service}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Step 2: Barber Selection */}
                        {step === 2 && (
                            <div>
                                <h2 className="text-2xl mb-8">
                                    Choose Your Barber
                                </h2>
                                {loadingBarbers ? (
                                    <div className="text-center py-8">
                                        Loading barbers...
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                        {barbers.map((barber) => {
                                            const isInactive =
                                                barber.id !== "none" &&
                                                barber.is_active === false;
                                            const isSelected =
                                                bookingData.barber?.id ===
                                                barber.id;
                                            const clickable =
                                                barber.id === "none" ||
                                                !isInactive;
                                            return (
                                                <Card
                                                    key={barber.id}
                                                    role="button"
                                                    aria-disabled={!clickable}
                                                    data-inactive={
                                                        isInactive
                                                            ? "true"
                                                            : undefined
                                                    }
                                                    onClick={() => {
                                                        if (!clickable) return;
                                                        updateBookingData(
                                                            "barber",
                                                            barber
                                                        );
                                                    }}
                                                    className={`transition-all duration-300 service-card border-2 ${
                                                        isSelected
                                                            ? "is-selected border-accent bg-[#ede9e6] -translate-y-1"
                                                            : "border-border"
                                                    } ${
                                                        isInactive
                                                            ? "inactive-card opacity-50 grayscale cursor-not-allowed pointer-events-none"
                                                            : "cursor-pointer"
                                                    }`}
                                                    style={
                                                        isSelected
                                                            ? {
                                                                  backgroundColor:
                                                                      "#ede9e6",
                                                              }
                                                            : undefined
                                                    }>
                                                    <CardContent className="p-6 text-center flex flex-col items-center">
                                                        <div
                                                            className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 text-xl ${
                                                                isSelected
                                                                    ? "bg-accent text-white"
                                                                    : "bg-muted text-foreground"
                                                            }`}>
                                                            {barber.initials}
                                                        </div>
                                                        <h3 className="mb-1">
                                                            {barber.name}
                                                        </h3>
                                                        <p className="text-xs text-muted-foreground">
                                                            {barber.tag}
                                                        </p>
                                                        {isInactive && (
                                                            <span className="mt-2 text-[11px] px-2 py-0.5 rounded bg-gray-200 text-gray-600">
                                                                Inactive
                                                            </span>
                                                        )}
                                                    </CardContent>
                                                </Card>
                                            );
                                        })}
                                    </div>
                                )}
                                {errors.barber && (
                                    <p className="text-destructive text-sm mt-4">
                                        {errors.barber}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Step 3: Date & Time Selection */}
                        {step === 3 && (
                            <div>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    <div>
                                        <h3 className="uppercase tracking-wider text-sm mb-4">
                                            Choose Date
                                        </h3>
                                        <Card>
                                            <CardContent className="p-6 calendar-scope">
                                                <Calendar
                                                    key={currentMonth.toISOString()}
                                                    mode="single"
                                                    month={currentMonth}
                                                    onMonthChange={(m) =>
                                                        setCurrentMonth(
                                                            new Date(
                                                                m.getFullYear(),
                                                                m.getMonth(),
                                                                1
                                                            )
                                                        )
                                                    }
                                                    selected={bookingData.date}
                                                    onDayMouseEnter={(day) =>
                                                        setHoveredDay(day)
                                                    }
                                                    onDayMouseLeave={() =>
                                                        setHoveredDay(undefined)
                                                    }
                                                    onSelect={(date) => {
                                                        if (!date) return;
                                                        const d = new Date(
                                                            date.getFullYear(),
                                                            date.getMonth(),
                                                            date.getDate()
                                                        );
                                                        const inMonth =
                                                            d.getFullYear() ===
                                                                currentMonth.getFullYear() &&
                                                            d.getMonth() ===
                                                                currentMonth.getMonth();
                                                        if (!inMonth) return; // block selecting filler days
                                                        if (
                                                            d < todayStart ||
                                                            d > endOfNextMonth
                                                        )
                                                            return; // block invalid range
                                                        updateBookingData(
                                                            "date",
                                                            date
                                                        );
                                                        // Reset time when date changes to refresh available slots
                                                        updateBookingData(
                                                            "time",
                                                            ""
                                                        );
                                                    }}
                                                    fromMonth={startOfThisMonth}
                                                    toMonth={
                                                        new Date(
                                                            endOfNextMonth.getFullYear(),
                                                            endOfNextMonth.getMonth(),
                                                            1
                                                        )
                                                    }
                                                    showOutsideDays
                                                    fixedWeeks
                                                    disabled={[
                                                        { before: todayStart },
                                                        {
                                                            after: endOfNextMonth,
                                                        },
                                                        { outside: true },
                                                    ]}
                                                    modifiers={{
                                                        selectable: (
                                                            date: Date
                                                        ) => {
                                                            const d = new Date(
                                                                date.getFullYear(),
                                                                date.getMonth(),
                                                                date.getDate()
                                                            );
                                                            const inMonth =
                                                                d.getFullYear() ===
                                                                    currentMonth.getFullYear() &&
                                                                d.getMonth() ===
                                                                    currentMonth.getMonth();
                                                            return (
                                                                inMonth &&
                                                                d >=
                                                                    todayStart &&
                                                                d <=
                                                                    endOfNextMonth
                                                            );
                                                        },
                                                        hovered: (
                                                            date: Date
                                                        ) => {
                                                            if (!hoveredDay)
                                                                return false;
                                                            const same =
                                                                hoveredDay.getFullYear() ===
                                                                    date.getFullYear() &&
                                                                hoveredDay.getMonth() ===
                                                                    date.getMonth() &&
                                                                hoveredDay.getDate() ===
                                                                    date.getDate();
                                                            // Do not apply hover when this date is currently selected
                                                            const isSelected =
                                                                !!bookingData.date &&
                                                                bookingData.date.getFullYear() ===
                                                                    date.getFullYear() &&
                                                                bookingData.date.getMonth() ===
                                                                    date.getMonth() &&
                                                                bookingData.date.getDate() ===
                                                                    date.getDate();
                                                            return (
                                                                same &&
                                                                !isSelected &&
                                                                isSelectableDate(
                                                                    date
                                                                )
                                                            );
                                                        },
                                                    }}
                                                    modifiersClassNames={{
                                                        selectable: "",
                                                        hovered:
                                                            "bg-[#f7f1e8] border border-[#C9A961]",
                                                        outside:
                                                            "hover:bg-transparent outside-gray",
                                                        disabled:
                                                            "hover:bg-transparent disabled-gray",
                                                    }}
                                                    modifiersStyles={{
                                                        outside: {
                                                            color: "#DDDDDD",
                                                        },
                                                        disabled: {
                                                            color: "#DDDDDD",
                                                        },
                                                        today: {
                                                            borderColor:
                                                                "#C9A961",
                                                        },
                                                        hovered: {
                                                            backgroundColor:
                                                                "#f7f1e8",
                                                            borderColor:
                                                                "#C9A961",
                                                            borderWidth: "1px",
                                                            borderStyle:
                                                                "solid",
                                                        },
                                                    }}
                                                    className="w-full"
                                                    classNames={{
                                                        months: "flex flex-col",
                                                        month: "flex flex-col gap-4",
                                                        caption:
                                                            "flex justify-between items-center mb-4",
                                                        caption_label:
                                                            "text-base",
                                                        nav: "flex items-center gap-1",
                                                        nav_button:
                                                            "cal-nav-btn h-8 w-8 bg-transparent p-0 rounded border border-border flex items-center justify-center hover:bg-transparent",
                                                        nav_button_previous: "",
                                                        nav_button_next: "",
                                                        table: "w-full border-collapse",
                                                        head_row: "flex gap-2",
                                                        head_cell:
                                                            "text-muted-foreground w-full text-xs lowercase text-center py-2",
                                                        row: "flex w-full gap-2 mt-2",
                                                        cell: "relative w-full text-center p-0",
                                                        day: "w-full h-full aspect-square p-0 flex items-center justify-center leading-none rounded-none transition-none translate-y-[1px]",
                                                        day_range_start: "",
                                                        day_range_end: "",
                                                        day_selected:
                                                            "bg-foreground text-background hover:bg-foreground hover:text-background",
                                                        day_today:
                                                            "border border-[#C9A961] rounded-none",
                                                        day_outside:
                                                            "text-[#DDDDDD] hover:bg-transparent pointer-events-none transition-none",
                                                        day_disabled:
                                                            "text-[#DDDDDD] hover:bg-transparent cursor-not-allowed pointer-events-none transition-none",
                                                        day_range_middle: "",
                                                        day_hidden: "invisible",
                                                    }}
                                                />
                                                {bookingData.date && (
                                                    <div className="mt-6 pt-6 border-t border-border text-center">
                                                        <p className="text-sm mb-1">
                                                            Selected Date
                                                        </p>
                                                        <p className="text-sm">
                                                            {bookingData.date.toLocaleDateString(
                                                                "en-US",
                                                                {
                                                                    weekday:
                                                                        "long",
                                                                    month: "long",
                                                                    day: "numeric",
                                                                    year: "numeric",
                                                                }
                                                            )}
                                                        </p>
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                        {errors.date && (
                                            <p className="text-destructive text-sm mt-2">
                                                {errors.date}
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="uppercase tracking-wider text-sm mb-4">
                                            Choose Time
                                        </h3>
                                        <Card>
                                            <CardContent className="p-6">
                                                {loadingSlots ? (
                                                    <div className="text-center py-8">
                                                        Checking availability...
                                                    </div>
                                                ) : availableSlots.length ===
                                                  0 ? (
                                                    <div className="text-center py-8 text-muted-foreground">
                                                        No available time slots
                                                        for this date. Please
                                                        select another date.
                                                    </div>
                                                ) : (
                                                    <div className="time-grid">
                                                        {availableSlots.map(
                                                            (slot) => {
                                                                const selected =
                                                                    bookingData.time ===
                                                                    slot.time;
                                                                const disabled =
                                                                    !slot.available;
                                                                return (
                                                                    <button
                                                                        key={
                                                                            slot.time
                                                                        }
                                                                        className={`py-3 px-2 border rounded transition-colors text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground ${
                                                                            selected
                                                                                ? "bg-foreground text-background border-foreground"
                                                                                : disabled
                                                                                ? "border-border !text-[#DDDDDD] cursor-not-allowed"
                                                                                : "border-border hover:border-[#C9A961] hover:bg-[#f7f1e8]"
                                                                        }`}
                                                                        onClick={() =>
                                                                            !disabled &&
                                                                            handleTimeSelection(
                                                                                slot.time
                                                                            )
                                                                        }
                                                                        disabled={
                                                                            disabled
                                                                        }
                                                                        title={
                                                                            slot.reason ||
                                                                            undefined
                                                                        }
                                                                        style={
                                                                            disabled
                                                                                ? {
                                                                                      color: "#DDDDDD",
                                                                                  }
                                                                                : undefined
                                                                        }>
                                                                        {
                                                                            slot.time
                                                                        }
                                                                    </button>
                                                                );
                                                            }
                                                        )}
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                        {errors.time && (
                                            <p className="text-destructive text-sm mt-2">
                                                {errors.time}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 4: Your Information */}
                        {step === 4 && (
                            <div>
                                <h3 className="uppercase tracking-wider text-sm mb-4">
                                    Your Information
                                </h3>
                                <Card>
                                    <CardContent className="p-6">
                                        <div className="space-y-4">
                                            {/* Row 1: Name full-width */}
                                            <div>
                                                <Label htmlFor="name">
                                                    Your Name *
                                                </Label>
                                                <div className="mt-1">
                                                    <Input
                                                        id="name"
                                                        placeholder="Enter your name"
                                                        className={`w-full border border-border bg-[#f7f1e8] hover:border-[#C9A961] focus:border-[#C9A961] focus:ring-0 ${
                                                            errors.name
                                                                ? "border-destructive"
                                                                : ""
                                                        }`}
                                                        style={{
                                                            backgroundColor:
                                                                "#fcfaf7",
                                                            color: "#000000",
                                                        }}
                                                        minLength={2}
                                                        maxLength={20}
                                                        value={bookingData.name}
                                                        onChange={(e) =>
                                                            updateBookingData(
                                                                "name",
                                                                e.target.value
                                                            )
                                                        }
                                                    />
                                                </div>
                                                {errors.name && (
                                                    <p className="text-destructive text-sm mt-1">
                                                        {errors.name}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Row 2: Email + Phone side-by-side */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <Label htmlFor="email">
                                                        Email *
                                                    </Label>
                                                    <div className="mt-1">
                                                        <Input
                                                            id="email"
                                                            type="email"
                                                            placeholder="you@example.com"
                                                            className={`w-full border border-border bg-[#f7f1e8] hover:border-[#C9A961] focus:border-[#C9A961] focus:ring-0 ${
                                                                errors.email
                                                                    ? "border-destructive"
                                                                    : ""
                                                            }`}
                                                            style={{
                                                                backgroundColor:
                                                                    "#fcfaf7",
                                                                color: "#000000",
                                                            }}
                                                            pattern="^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]*\.[a-zA-Z0-9.-]*[a-zA-Z]{2,}$"
                                                            title="Please enter a valid email address."
                                                            value={
                                                                bookingData.email
                                                            }
                                                            onChange={(e) =>
                                                                updateBookingData(
                                                                    "email",
                                                                    e.target
                                                                        .value
                                                                )
                                                            }
                                                        />
                                                    </div>
                                                    {errors.email && (
                                                        <p className="text-destructive text-sm mt-1">
                                                            {errors.email}
                                                        </p>
                                                    )}
                                                </div>
                                                <div>
                                                    <Label htmlFor="phone">
                                                        Phone *
                                                    </Label>
                                                    <div className="mt-1">
                                                        <Input
                                                            id="phone"
                                                            type="tel"
                                                            inputMode="numeric"
                                                            autoComplete="tel"
                                                            placeholder="05 51 23 45 67"
                                                            className={`w-full border border-border bg-[#f7f1e8] hover:border-[#C9A961] focus:border-[#C9A961] focus:ring-0 ${
                                                                errors.phone
                                                                    ? "border-destructive"
                                                                    : ""
                                                            }`}
                                                            style={{
                                                                backgroundColor:
                                                                    "#fcfaf7",
                                                                color: "#000000",
                                                            }}
                                                            pattern="^(05|06|07)(?:\s?[0-9]{2}){4}$"
                                                            title="Please enter a valid phone number."
                                                            maxLength={14}
                                                            onInput={(e) => {
                                                                const el =
                                                                    e.currentTarget;
                                                                const prevPos =
                                                                    el.selectionStart ??
                                                                    el.value
                                                                        .length;
                                                                const raw =
                                                                    el.value;
                                                                // Number of digits before current caret
                                                                let digitsBefore =
                                                                    raw
                                                                        .slice(
                                                                            0,
                                                                            prevPos
                                                                        )
                                                                        .replace(
                                                                            /\D/g,
                                                                            ""
                                                                        ).length;

                                                                // Recompute digits and formatted string
                                                                const digits =
                                                                    raw
                                                                        .replace(
                                                                            /\D/g,
                                                                            ""
                                                                        )
                                                                        .slice(
                                                                            0,
                                                                            10
                                                                        );
                                                                const groups =
                                                                    digits.match(
                                                                        /.{1,2}/g
                                                                    ) || [];
                                                                const formatted =
                                                                    groups.join(
                                                                        " "
                                                                    );
                                                                el.value =
                                                                    formatted;

                                                                // Map digit index to caret index in formatted string
                                                                const caret =
                                                                    digitsBefore +
                                                                    Math.max(
                                                                        0,
                                                                        Math.floor(
                                                                            (digitsBefore -
                                                                                1) /
                                                                                2
                                                                        )
                                                                    );
                                                                requestAnimationFrame(
                                                                    () => {
                                                                        el.setSelectionRange(
                                                                            caret,
                                                                            caret
                                                                        );
                                                                    }
                                                                );
                                                            }}
                                                            onKeyDown={(e) => {
                                                                if (
                                                                    e.key !==
                                                                    "Backspace"
                                                                )
                                                                    return;
                                                                const el =
                                                                    e.currentTarget;
                                                                const pos =
                                                                    el.selectionStart ??
                                                                    el.value
                                                                        .length;
                                                                const raw =
                                                                    el.value;
                                                                // If caret is after a space, delete the previous digit explicitly
                                                                if (
                                                                    pos > 0 &&
                                                                    raw[
                                                                        pos - 1
                                                                    ] === " "
                                                                ) {
                                                                    e.preventDefault();
                                                                    const allDigits =
                                                                        raw
                                                                            .replace(
                                                                                /\D/g,
                                                                                ""
                                                                            )
                                                                            .slice(
                                                                                0,
                                                                                10
                                                                            );
                                                                    const digitsBefore =
                                                                        raw
                                                                            .slice(
                                                                                0,
                                                                                pos
                                                                            )
                                                                            .replace(
                                                                                /\D/g,
                                                                                ""
                                                                            ).length;
                                                                    if (
                                                                        digitsBefore >
                                                                        0
                                                                    ) {
                                                                        const newDigits =
                                                                            (
                                                                                allDigits.slice(
                                                                                    0,
                                                                                    digitsBefore -
                                                                                        1
                                                                                ) +
                                                                                allDigits.slice(
                                                                                    digitsBefore
                                                                                )
                                                                            ).slice(
                                                                                0,
                                                                                10
                                                                            );
                                                                        const groups =
                                                                            newDigits.match(
                                                                                /.{1,2}/g
                                                                            ) ||
                                                                            [];
                                                                        const formatted =
                                                                            groups.join(
                                                                                " "
                                                                            );
                                                                        el.value =
                                                                            formatted;
                                                                        // Update state with digits-only
                                                                        updateBookingData(
                                                                            "phone",
                                                                            newDigits
                                                                        );
                                                                        // Place caret based on remaining digits before
                                                                        const caretDigits =
                                                                            digitsBefore -
                                                                            1;
                                                                        const caret =
                                                                            caretDigits +
                                                                            Math.max(
                                                                                0,
                                                                                Math.floor(
                                                                                    (caretDigits -
                                                                                        1) /
                                                                                        2
                                                                                )
                                                                            );
                                                                        requestAnimationFrame(
                                                                            () =>
                                                                                el.setSelectionRange(
                                                                                    caret,
                                                                                    caret
                                                                                )
                                                                        );
                                                                    }
                                                                }
                                                            }}
                                                            value={(() => {
                                                                const d = (
                                                                    bookingData.phone ||
                                                                    ""
                                                                )
                                                                    .replace(
                                                                        /\D/g,
                                                                        ""
                                                                    )
                                                                    .slice(
                                                                        0,
                                                                        10
                                                                    );
                                                                const g =
                                                                    d.match(
                                                                        /.{1,2}/g
                                                                    ) || [];
                                                                return g.join(
                                                                    " "
                                                                );
                                                            })()}
                                                            onChange={(e) => {
                                                                // Strip spaces before updating state so validation stays on digits
                                                                const digitsOnly =
                                                                    e.target.value
                                                                        .replace(
                                                                            /\D/g,
                                                                            ""
                                                                        )
                                                                        .slice(
                                                                            0,
                                                                            10
                                                                        );
                                                                updateBookingData(
                                                                    "phone",
                                                                    digitsOnly
                                                                );
                                                            }}
                                                        />
                                                    </div>
                                                    {errors.phone && (
                                                        <p className="text-destructive text-sm mt-1">
                                                            {errors.phone}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Row 3: Message full-width */}
                                            <div>
                                                <Label htmlFor="notes">
                                                    Message
                                                </Label>
                                                <div className="mt-1">
                                                    <Textarea
                                                        id="notes"
                                                        placeholder="Any special requests or preferences..."
                                                        className="w-full min-h-24 border border-border bg-[#f7f1e8] hover:border-[#C9A961] focus:border-[#C9A961] focus:ring-0"
                                                        style={{
                                                            backgroundColor:
                                                                "#fcfaf7",
                                                        }}
                                                        rows={3}
                                                        minLength={3}
                                                        maxLength={500}
                                                        value={
                                                            bookingData.notes
                                                        }
                                                        onChange={(e) =>
                                                            updateBookingData(
                                                                "notes",
                                                                e.target.value
                                                            )
                                                        }
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {/* Step 5: Review & Confirm */}
                        {step === 5 && (
                            <div>
                                <h2 className="text-2xl mb-6">
                                    Review Your Booking
                                </h2>
                                <Card>
                                    <CardContent className="pt-6 space-y-6">
                                        <div>
                                            <h3 className="text-sm text-muted-foreground mb-2">
                                                Service
                                            </h3>
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <p className="text-lg font-medium">
                                                        {
                                                            bookingData.service
                                                                ?.name
                                                        }
                                                    </p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {
                                                            bookingData.service
                                                                ?.duration
                                                        }
                                                    </p>
                                                </div>
                                                <p
                                                    className="text-2xl md:text-3xl font-semibold tracking-tight"
                                                    style={{
                                                        color: "#c4a460",
                                                    }}>
                                                    {bookingData.service?.price}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="border-t pt-4">
                                            <h3 className="text-sm text-muted-foreground mb-2">
                                                Barber
                                            </h3>
                                            <div className="flex items-center gap-3">
                                                <Avatar>
                                                    <AvatarImage
                                                        src={
                                                            bookingData.barber
                                                                ?.avatar
                                                        }
                                                        alt={
                                                            bookingData.barber
                                                                ?.name
                                                        }
                                                    />
                                                    <AvatarFallback className="bg-accent/10 text-accent">
                                                        {
                                                            bookingData.barber
                                                                ?.initials
                                                        }
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p>
                                                        {
                                                            bookingData.barber
                                                                ?.name
                                                        }
                                                    </p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {
                                                            bookingData.barber
                                                                ?.tag
                                                        }
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="border-t pt-4">
                                            <h3 className="text-sm text-muted-foreground mb-2">
                                                Date & Time
                                            </h3>
                                            <div className="flex items-baseline justify-between gap-6">
                                                <p className="text-lg font-medium flex-1">
                                                    {bookingData.date?.toLocaleDateString(
                                                        "en-US",
                                                        {
                                                            weekday: "long",
                                                            year: "numeric",
                                                            month: "long",
                                                            day: "numeric",
                                                        }
                                                    )}
                                                </p>
                                                <p
                                                    className="text-xl font-semibold whitespace-nowrap text-right shrink-0"
                                                    style={{
                                                        color: "#2C2416",
                                                    }}>
                                                    {bookingData.time}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="border-t pt-4">
                                            <h3 className="text-sm text-muted-foreground mb-2">
                                                Your Information
                                            </h3>
                                            <div className="space-y-1">
                                                <p className="font-medium">
                                                    {bookingData.name}
                                                </p>
                                                <p className="text-sm text-muted-foreground">
                                                    {bookingData.email}
                                                </p>
                                                <p className="text-sm text-muted-foreground">
                                                    {bookingData.phone
                                                        ? bookingData.phone
                                                              .replace(
                                                                  /\D/g,
                                                                  ""
                                                              )
                                                              .replace(
                                                                  /(\d{2})(?=\d)/g,
                                                                  "$1 "
                                                              )
                                                              .trim()
                                                        : ""}
                                                </p>
                                                {bookingData.notes && (
                                                    <p className="text-sm text-muted-foreground mt-2">
                                                        Notes:{" "}
                                                        {bookingData.notes}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {/* Step 6: Success */}
                        {step === 6 && (
                            <div className="text-center py-8">
                                <motion.div
                                    initial={{ scale: 0.9 }}
                                    animate={{ scale: 1 }}
                                    transition={{
                                        duration: 0.4,
                                        type: "spring",
                                    }}
                                    className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <motion.svg
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        className="w-12 h-12 text-green-600">
                                        <motion.path
                                            d="M4 12L9 17L20 6"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            initial={{ pathLength: 0 }}
                                            animate={{ pathLength: 1 }}
                                            transition={{
                                                duration: 0.8,
                                                ease: "easeInOut",
                                            }}
                                        />
                                    </motion.svg>
                                </motion.div>

                                <h2
                                    className="text-4xl mb-4"
                                    style={{
                                        fontFamily: "'Playfair Display', serif",
                                        fontSize: 34,
                                    }}>
                                    Booking Confirmed!
                                </h2>

                                <p className="text-muted-foreground mb-2">
                                    Your appointment has been successfully
                                    booked.
                                </p>
                                <p className="text-muted-foreground mb-8">
                                    A confirmation email has been sent to your
                                    inbox with all the details.
                                </p>

                                <motion.div
                                    className="max-w-2xl mx-auto"
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{
                                        duration: 0.45,
                                        ease: "easeOut",
                                    }}>
                                    <Card
                                        className="bg-white border-border"
                                        style={{ backgroundColor: "#FFFFFF" }}>
                                        <CardContent className="pt-8 pb-8 px-8">
                                            <h3
                                                className="text-3xl text-center mb-10"
                                                style={{
                                                    fontFamily:
                                                        "'Playfair Display', serif",
                                                    fontSize: 28,
                                                }}>
                                                Important Information
                                            </h3>

                                            <div className="divide-y divide-border text-left">
                                                <div className="flex items-start gap-4 py-8">
                                                    <X
                                                        size={20}
                                                        strokeWidth={2}
                                                        className="shrink-0 text-muted-foreground"
                                                        style={{
                                                            transform:
                                                                "translateY(2px) scale(1.1)",
                                                        }}
                                                    />
                                                    <div>
                                                        <p
                                                            className="text-[24px] font-bold text-foreground mb-2 tracking-tight leading-tight"
                                                            style={{
                                                                fontSize: 19,
                                                                fontWeight: 500,
                                                                lineHeight: 1.25,
                                                            }}>
                                                            Cancellation Policy
                                                        </p>
                                                        <p className="leading-relaxed text-muted-foreground opacity-80">
                                                            Please provide at
                                                            least{" "}
                                                            <span className="font-semibold text-foreground">
                                                                24 hours
                                                            </span>{" "}
                                                            notice if you need
                                                            to cancel or
                                                            reschedule your
                                                            appointment. Late
                                                            cancellations may be
                                                            subject to a fee.
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="my-8 border-t border-border" />

                                                <div className="flex items-start gap-4 py-8">
                                                    <Clock
                                                        size={20}
                                                        strokeWidth={2}
                                                        className="shrink-0 text-muted-foreground"
                                                        style={{
                                                            transform:
                                                                "translateY(2px)",
                                                        }}
                                                    />
                                                    <div>
                                                        <p
                                                            className="text-[24px] font-bold text-foreground mb-2 tracking-tight leading-tight"
                                                            style={{
                                                                fontSize: 19,
                                                                fontWeight: 500,
                                                                lineHeight: 1.25,
                                                            }}>
                                                            Arrival Time
                                                        </p>
                                                        <p className="leading-relaxed text-muted-foreground opacity-80">
                                                            Please arrive{" "}
                                                            <span className="font-semibold text-foreground">
                                                                5-10 minutes
                                                            </span>{" "}
                                                            before your
                                                            scheduled
                                                            appointment time.
                                                            This ensures we can
                                                            start your service
                                                            promptly.
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="my-8 border-t border-border" />

                                                <div className="flex items-start gap-4 py-8">
                                                    <Phone
                                                        size={20}
                                                        strokeWidth={2}
                                                        className="shrink-0 text-muted-foreground"
                                                        style={{
                                                            transform:
                                                                "translateY(2px)",
                                                        }}
                                                    />
                                                    <div>
                                                        <p
                                                            className="text-[24px] font-bold text-foreground mb-2 tracking-tight leading-tight"
                                                            style={{
                                                                fontSize: 19,
                                                                fontWeight: 500,
                                                                lineHeight: 1.25,
                                                            }}>
                                                            Questions or
                                                            Changes?
                                                        </p>
                                                        <p className="leading-relaxed text-muted-foreground opacity-80">
                                                            If you have any
                                                            questions or need to
                                                            make changes to your
                                                            appointment, please
                                                            call us at{" "}
                                                            <a
                                                                href="tel:0553552209"
                                                                className="font-semibold text-foreground hover:underline underline-offset-2">
                                                                0553 55 22 09
                                                            </a>{" "}
                                                            or email{" "}
                                                            <a
                                                                href="mailto:info@imperialcut.com"
                                                                className="font-semibold text-foreground hover:underline underline-offset-2">
                                                                info@imperialcut.com
                                                            </a>
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <p className="text-muted-foreground mt-12 mb-8">
                                        We can't wait to see you soon!
                                    </p>

                                    <Button
                                        onClick={resetBooking}
                                        className="bg-accent hover:bg-accent/90 text-white px-8 py-6 min-h-[56px] w-full sm:w-auto md:min-w-[400px] uppercase tracking-wider transition-transform duration-200 hover:scale-[1.02]">
                                        Book Another Appointment
                                    </Button>
                                </motion.div>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>

                {/* Navigation Buttons */}
                {step < 6 && (
                    <div
                        className={`flex items-center mt-12 gap-4 ${
                            step === 1 ? "justify-end" : "justify-between"
                        }`}>
                        {step > 1 && (
                            <Button
                                variant="outline"
                                onClick={prevStep}
                                className="border-2 border-foreground px-8 py-6 hover:bg-foreground hover:text-background uppercase tracking-wider !transition-none">
                                Back
                            </Button>
                        )}
                        {step < 5 ? (
                            <Button
                                onClick={nextStep}
                                disabled={
                                    (step === 1 && !bookingData.service) ||
                                    (step === 2 && !bookingData.barber) ||
                                    (step === 3 &&
                                        (!bookingData.date ||
                                            !bookingData.time)) ||
                                    (step === 4 &&
                                        (bookingData.name.trim().length < 2 ||
                                            !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]*\.[a-zA-Z0-9.-]*[a-zA-Z]{2,}$/.test(
                                                bookingData.email.trim()
                                            ) ||
                                            !/^(05|06|07)[0-9]{8}$/.test(
                                                bookingData.phone
                                            )))
                                }
                                className={`${
                                    step === 1
                                        ? "flex-none w-full md:w-auto md:min-w-[560px]"
                                        : "flex-1 md:flex-none md:min-w-[400px]"
                                } px-8 py-6 uppercase tracking-wider transition-all duration-300 ease-out ${
                                    (step === 1 && !bookingData.service) ||
                                    (step === 2 && !bookingData.barber) ||
                                    (step === 3 &&
                                        (!bookingData.date ||
                                            !bookingData.time)) ||
                                    (step === 4 &&
                                        (bookingData.name.trim().length < 2 ||
                                            !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]*\.[a-zA-Z0-9.-]*[a-zA-Z]{2,}$/.test(
                                                bookingData.email.trim()
                                            ) ||
                                            !/^(05|06|07)[0-9]{8}$/.test(
                                                bookingData.phone
                                            )))
                                        ? "!bg-[#F2F2F2] !text-[#999999] !opacity-100 cursor-not-allowed hover:!bg-[#F2F2F2] disabled:!bg-[#F2F2F2] disabled:!text-[#999999]"
                                        : "bg-foreground text-background hover:bg-foreground/90"
                                }`}>
                                Next
                            </Button>
                        ) : (
                            <>
                                {submitError && (
                                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">
                                        {submitError}
                                    </div>
                                )}
                                <Button
                                    onClick={confirmBooking}
                                    disabled={submitting}
                                    className="flex-1 md:flex-none md:min-w-[400px] bg-foreground text-background hover:bg-foreground/90 disabled:opacity-70 px-8 py-6 uppercase tracking-wider !transition-none">
                                    {submitting
                                        ? "Creating Appointment..."
                                        : "Confirm Booking"}
                                </Button>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
