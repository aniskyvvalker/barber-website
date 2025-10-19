import { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
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
}

// Mock data
const services: Service[] = [
    {
        id: "1",
        name: "Classic Haircut",
        duration: "45 minutes",
        price: "$45",
        description: "",
        icon: Scissors,
    },
    {
        id: "2",
        name: "Hot Towel Shave",
        duration: "30 minutes",
        price: "$35",
        description: "",
        icon: Scissors,
    },
    {
        id: "3",
        name: "Haircut & Shave",
        duration: "75 minutes",
        price: "$70",
        description: "",
        icon: Scissors,
    },
    {
        id: "4",
        name: "Hair Treatment",
        duration: "45 minutes",
        price: "$50",
        description: "",
        icon: Scissors,
    },
    {
        id: "5",
        name: "Kids Haircut",
        duration: "30 minutes",
        price: "$30",
        description: "",
        icon: Scissors,
    },
    {
        id: "6",
        name: "The Imperial Package",
        duration: "90 minutes",
        price: "$95",
        description: "",
        icon: Scissors,
    },
];

const barbers: Barber[] = [
    {
        id: "none",
        name: "No Preference",
        tag: "Any available barber",
        avatar: "",
        initials: "?",
    },
    {
        id: "1",
        name: "Marcus Chen",
        tag: "Master Barber",
        avatar: "https://images.unsplash.com/photo-1747832512459-5566e6d0ee5a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBiYXJiZXIlMjBwb3J0cmFpdHxlbnwxfHx8fDE3NjAzNjE4OTl8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
        initials: "MC",
    },
    {
        id: "2",
        name: "Jordan Williams",
        tag: "Senior Stylist",
        avatar: "https://images.unsplash.com/photo-1648313143880-52cfd6216038?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtZW4lMjBoYWlyY3V0JTIwc3R5bGluZ3xlbnwxfHx8fDE3NjAzNjI3MDl8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
        initials: "JW",
    },
    {
        id: "3",
        name: "Alex Rivera",
        tag: "Grooming Specialist",
        avatar: "https://images.unsplash.com/photo-1603899968034-1a56ca48d172?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiZWFyZCUyMHRyaW0lMjBncm9vbWluZ3xlbnwxfHx8fDE3NjAyNzAxMjF8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
        initials: "AR",
    },
];

// Generate time slots for a specific date
const generateTimeSlots = (date?: Date) => {
    const slots: string[] = [];
    const isFriday = date ? new Date(date).getDay() === 5 : false; // 5 = Friday
    const startHour = isFriday ? 14 : 9;
    const endHour = 20; // include 20:00 as the final slot
    for (let hour = startHour; hour <= endHour; hour++) {
        for (let minute of [0, 30]) {
            if (hour === endHour && minute === 30) break; // do not add 20:30
            const timeStr = `${hour.toString().padStart(2, "0")}:${minute
                .toString()
                .padStart(2, "0")}`;
            slots.push(timeStr);
        }
    }
    return slots;
};

const timeSlots = generateTimeSlots();

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

    // Determine if we should show the mobile (≤600px) stepper
    const [isMobileStepper, setIsMobileStepper] = useState<boolean>(() =>
        typeof window !== 'undefined'
            ? window.matchMedia('(max-width: 600px)').matches
            : false
    );
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        if (typeof window === 'undefined') return;
        setMounted(true);
        const mq = window.matchMedia('(max-width: 600px)');
        const handler = (e: MediaQueryListEvent | MediaQueryList) => {
            setIsMobileStepper('matches' in e ? e.matches : (e as MediaQueryList).matches);
        };
        // Initial sync and listener
        handler(mq as MediaQueryList);
        mq.addEventListener ? mq.addEventListener('change', handler as (e: MediaQueryListEvent) => void) : mq.addListener(handler as (this: MediaQueryList, ev: MediaQueryListEvent) => any);
        return () => {
            mq.removeEventListener ? mq.removeEventListener('change', handler as (e: MediaQueryListEvent) => void) : mq.removeListener(handler as (this: MediaQueryList, ev: MediaQueryListEvent) => any);
        };
    }, []);

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

    const confirmBooking = () => {
        if (validateStep()) {
            setStep(6);
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
                    onMouseEnter={(e) => { const svg = e.currentTarget.querySelector('svg') as SVGElement | null; if (svg) svg.style.color = '#C9A961'; }}
                    onMouseLeave={(e) => { const svg = e.currentTarget.querySelector('svg') as SVGElement | null; if (svg) svg.style.color = ''; }}
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
                    <p className="text-[#C9A961] italic text-lg" style={{ color: '#C9A961' }}>
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
                                    const start = Math.min(Math.max(step - 1, 1), 3);
                                    // Move the track by 20% of its width per window (0%, -20%, -40%)
                                    const translate = -((start - 1) * 20);
                                    // Determine number of COMPLETED steps (not just current step)
                                    const detailsValid = (
                                      bookingData.name.trim().length >= 2 &&
                                      /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]*\.[a-zA-Z0-9.-]*[a-zA-Z]{2,}$/.test(bookingData.email.trim()) &&
                                      /^(05|06|07)[0-9]{8}$/.test(bookingData.phone)
                                    );
                                    let completed = 0;
                                    if (bookingData.service) completed += 1; // step 1 done
                                    if (bookingData.barber) completed += 1;  // step 2 done
                                    if (bookingData.date && bookingData.time) completed += 1; // step 3 done
                                    if (detailsValid) completed += 1; // step 4 done
                                    if (step === 6) completed += 1; // final confirmed
                                    // Fill to center of last completed circle: 0,10,30,50,70,90
                                    const centers = [0, 10, 30, 50, 70, 90];
                                    const filledToBase = centers[Math.min(Math.max(completed, 0), 5)];
                                    const filledTo = step >= 5 ? 90 : filledToBase;
                                    return (
                                        <motion.div
                                            className="flex relative"
                                            initial={false}
                                            animate={{ x: `${translate}%` }}
                                            transition={{ duration: 0.35, ease: "easeInOut" }}
                                            style={{ width: "166.6667%" }}
                                        >
                                            {/* Base line (behind), light color spans full length */}
                                            <div
                                                className="absolute"
                                                style={{ top: 24, left: -5, right: 'calc(10% - 24px)', height: 3, backgroundColor: '#D1B896', opacity: 0.25, zIndex: 0 }}
                                            />
                                            {/* Filled line (behind circles), from start to center of current step */}
                                            <div
                                                className="absolute"
                                                style={{ top: 24, left: -5, right: `calc(${100 - filledTo}% - 0px)`, height: 3, backgroundColor: '#8B6F47', zIndex: 1, transition: 'right 350ms ease-in-out' }}
                                            />
                                            {all.map((item) => (
                                                <div
                                                    key={item.num}
                                                    className="flex flex-col items-center shrink-0"
                                                    style={{ flex: '0 0 20%' }}
                                                >
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
                                    style={{ top: 24, left: -5, right: 'calc(10% - 24px)', height: 3, backgroundColor: '#D1B896', opacity: 0.25, zIndex: 0 }}
                                />
                                {/* Filled line (behind circles), from start to center of current step */}
                                {(() => {
                                  const detailsValid = (
                                    bookingData.name.trim().length >= 2 &&
                                    /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]*\.[a-zA-Z0-9.-]*[a-zA-Z]{2,}$/.test(bookingData.email.trim()) &&
                                    /^(05|06|07)[0-9]{8}$/.test(bookingData.phone)
                                  );
                                  let completed = 0;
                                  if (bookingData.service) completed += 1;
                                  if (bookingData.barber) completed += 1;
                                  if (bookingData.date && bookingData.time) completed += 1;
                                  if (detailsValid) completed += 1;
                                  if (step === 6) completed += 1;
                                  const centers = [0, 10, 30, 50, 70, 90];
                                  const filledToBase = centers[Math.min(Math.max(completed, 0), 5)];
                                  const filledTo = step >= 5 ? 90 : filledToBase;
                                  return (
                                    <div
                                      className="absolute"
                                      style={{ top: 24, left: -5, right: `calc(${100 - filledTo}% - 0px)`, height: 3, backgroundColor: '#8B6F47', zIndex: 1, transition: 'right 350ms ease-in-out' }}
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
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {services.map((service) => (
                                        <Card
                                            key={service.id}
                                            role="button"
                                            onClick={() =>
                                                updateBookingData("service", service)
                                            }
                                            className={`cursor-pointer transition-all duration-300 service-card border-2 text-center group ${
                                                bookingData.service?.id === service.id
                                                    ? "is-selected border-accent bg-[#ede9e6] -translate-y-1"
                                                    : "border-border"
                                            }`}
                                            style={
                                                bookingData.service?.id === service.id
                                                    ? { backgroundColor: '#ede9e6' }
                                                    : undefined
                                            }
                                        >
                                            <CardContent className="p-6">
                                                <div className="space-y-3">
                                                    <h3 className="text-xl transition-colors">
                                                        {service.name}
                                                    </h3>
                                                    <p
                                                        className="text-3xl transition-colors"
                                                        style={{ color: "#C9A961" }}
                                                    >
                                                        {service.price}
                                                    </p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {service.duration}
                                                    </p>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
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
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                    {barbers.map((barber) => (
                                        <Card
                                            key={barber.id}
                                            role="button"
                                            onClick={() =>
                                                updateBookingData("barber", barber)
                                            }
                                            className={`cursor-pointer transition-all duration-300 service-card border-2 ${
                                                bookingData.barber?.id === barber.id
                                                    ? "is-selected border-accent bg-[#ede9e6] -translate-y-1"
                                                    : "border-border"
                                            }`}
                                            style={
                                                bookingData.barber?.id === barber.id
                                                    ? { backgroundColor: '#ede9e6' }
                                                    : undefined
                                            }
                                        >
                                            <CardContent className="p-6 text-center flex flex-col items-center">
                                                <div
                                                    className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 text-xl ${
                                                        bookingData.barber?.id === barber.id
                                                            ? "bg-accent text-white"
                                                            : "bg-muted text-foreground"
                                                    }`}
                                                >
                                                    {barber.initials}
                                                </div>
                                                <h3 className="mb-1">{barber.name}</h3>
                                                <p className="text-xs text-muted-foreground">{barber.tag}</p>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
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
                                                    { after: endOfNextMonth },
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
                                                            d >= todayStart &&
                                                            d <= endOfNextMonth
                                                        );
                                                    },
                                                    hovered: (date: Date) => {
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
                                                        borderColor: "#C9A961",
                                                    },
                                                    hovered: {
                                                        backgroundColor:
                                                            "#f7f1e8",
                                                        borderColor: "#C9A961",
                                                        borderWidth: "1px",
                                                        borderStyle: "solid",
                                                    },
                                                }}
                                                className="w-full"
                                                classNames={{
                                                    months: "flex flex-col",
                                                    month: "flex flex-col gap-4",
                                                    caption:
                                                        "flex justify-between items-center mb-4",
                                                    caption_label: "text-base",
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
                                                                weekday: "long",
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
                                            <div className="time-grid">
                                                {generateTimeSlots(
                                                    bookingData.date
                                                ).map((time) => {
                                                    const disabled =
                                                        isPastTime(time);
                                                    return (
                                                        <button
                                                            key={time}
                                                            className={`py-3 px-2 border rounded transition-colors text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground ${
                                                                bookingData.time ===
                                                                time
                                                                    ? "bg-foreground text-background border-foreground"
                                                                    : disabled
                                                                    ? "border-border text-muted-foreground/30 cursor-not-allowed"
                                                                    : "border-border hover:border-[#C9A961] hover:bg-[#f7f1e8]"
                                                            }`}
                                                            onClick={() =>
                                                                !disabled &&
                                                                updateBookingData(
                                                                    "time",
                                                                    time
                                                                )
                                                            }
                                                            disabled={disabled}>
                                                            {time}
                                                        </button>
                                                    );
                                                })}
                                            </div>
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
                                                    style={{ backgroundColor: '#fcfaf7' }}
                                                    minLength={2}
                                                    maxLength={50}
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
                                                        style={{ backgroundColor: '#fcfaf7' }}
                                                        pattern="^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]*\.[a-zA-Z0-9.-]*[a-zA-Z]{2,}$"
                                                        title="Please enter a valid email address."
                                                        value={
                                                            bookingData.email
                                                        }
                                                        onChange={(e) =>
                                                            updateBookingData(
                                                                "email",
                                                                e.target.value
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
                                                        style={{ backgroundColor: '#fcfaf7' }}
                                                        pattern="^(05|06|07)(?:\s?[0-9]{2}){4}$"
                                                        title="Please enter a valid phone number."
                                                        maxLength={14}
                                                        onInput={(e) => {
                                                            const el = e.currentTarget;
                                                            const prevPos = el.selectionStart ?? el.value.length;
                                                            const raw = el.value;
                                                            // Number of digits before current caret
                                                            let digitsBefore = raw.slice(0, prevPos).replace(/\D/g, "").length;

                                                            // Recompute digits and formatted string
                                                            const digits = raw.replace(/\D/g, "").slice(0, 10);
                                                            const groups = digits.match(/.{1,2}/g) || [];
                                                            const formatted = groups.join(" ");
                                                            el.value = formatted;

                                                            // Map digit index to caret index in formatted string
                                                            const caret = digitsBefore + Math.max(0, Math.floor((digitsBefore - 1) / 2));
                                                            requestAnimationFrame(() => {
                                                                el.setSelectionRange(caret, caret);
                                                            });
                                                        }}
                                                        onKeyDown={(e) => {
                                                            if (e.key !== "Backspace") return;
                                                            const el = e.currentTarget;
                                                            const pos = el.selectionStart ?? el.value.length;
                                                            const raw = el.value;
                                                            // If caret is after a space, delete the previous digit explicitly
                                                            if (pos > 0 && raw[pos - 1] === " ") {
                                                                e.preventDefault();
                                                                const allDigits = raw.replace(/\D/g, "").slice(0, 10);
                                                                const digitsBefore = raw.slice(0, pos).replace(/\D/g, "").length;
                                                                if (digitsBefore > 0) {
                                                                    const newDigits = (allDigits.slice(0, digitsBefore - 1) + allDigits.slice(digitsBefore)).slice(0, 10);
                                                                    const groups = newDigits.match(/.{1,2}/g) || [];
                                                                    const formatted = groups.join(" ");
                                                                    el.value = formatted;
                                                                    // Update state with digits-only
                                                                    updateBookingData("phone", newDigits);
                                                                    // Place caret based on remaining digits before
                                                                    const caretDigits = digitsBefore - 1;
                                                                    const caret = caretDigits + Math.max(0, Math.floor((caretDigits - 1) / 2));
                                                                    requestAnimationFrame(() => el.setSelectionRange(caret, caret));
                                                                }
                                                            }
                                                        }}
                                                        value={(() => {
                                                            const d = (bookingData.phone || "").replace(/\D/g, "").slice(0, 10);
                                                            const g = d.match(/.{1,2}/g) || [];
                                                            return g.join(" ");
                                                        })()}
                                                        onChange={(e) => {
                                                            // Strip spaces before updating state so validation stays on digits
                                                            const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 10);
                                                            updateBookingData("phone", digitsOnly);
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
                                                    style={{ backgroundColor: '#fcfaf7' }}
                                                    rows={3}
                                                    minLength={3}
                                                    maxLength={500}
                                                    value={bookingData.notes}
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
                                                    style={{ color: '#c4a460' }}
                                                >
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
                                                    style={{ color: '#2C2416' }}
                                                >
                                                    {bookingData.time}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="border-t pt-4">
                                            <h3 className="text-sm text-muted-foreground mb-2">
                                                Your Information
                                            </h3>
                                            <div className="space-y-1">
                                                <p className="font-medium">{bookingData.name}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {bookingData.email}
                                                </p>
                                                <p className="text-sm text-muted-foreground">
                                                    {bookingData.phone
                                                        ? bookingData.phone
                                                              .replace(/\D/g, "")
                                                              .replace(/(\d{2})(?=\d)/g, "$1 ")
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
                                    transition={{ duration: 0.4, type: "spring" }}
                                    className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <motion.svg
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        className="w-12 h-12 text-green-600"
                                    >
                                        <motion.path
                                            d="M4 12L9 17L20 6"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            initial={{ pathLength: 0 }}
                                            animate={{ pathLength: 1 }}
                                            transition={{ duration: 0.8, ease: "easeInOut" }}
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
                                    transition={{ duration: 0.45, ease: "easeOut" }}
                                >
                                    <Card className="bg-white border-border" style={{ backgroundColor: '#FFFFFF' }}>
                                        <CardContent className="pt-8 pb-8 px-8">
                                            <h3
                                                className="text-3xl text-center mb-10"
                                                style={{ fontFamily: "'Playfair Display', serif", fontSize: 28 }}
                                            >
                                                Important Information
                                            </h3>

                                            <div className="divide-y divide-border text-left">
                                                <div className="flex items-start gap-4 py-8">
                                                    <X size={20} strokeWidth={2} className="shrink-0 text-muted-foreground" style={{ transform: 'translateY(2px) scale(1.1)' }} />
                                                    <div>
                                                        <p className="text-[24px] font-bold text-foreground mb-2 tracking-tight leading-tight" style={{ fontSize: 19, fontWeight: 550, lineHeight: 1.25 }}>Cancellation Policy</p>
                                                        <p className="leading-relaxed text-muted-foreground opacity-80">
                                                            Please provide at least <span className="font-semibold text-foreground">24 hours</span> notice if you need to cancel or reschedule your appointment. Late cancellations may be subject to a fee.
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="my-8 border-t border-border" />

                                                <div className="flex items-start gap-4 py-8">
                                                    <Clock size={20} strokeWidth={2} className="shrink-0 text-muted-foreground" style={{ transform: 'translateY(2px)' }} />
                                                    <div>
                                                        <p className="text-[24px] font-bold text-foreground mb-2 tracking-tight leading-tight" style={{ fontSize: 19, fontWeight: 550, lineHeight: 1.25 }}>Arrival Time</p>
                                                        <p className="leading-relaxed text-muted-foreground opacity-80">
                                                            Please arrive <span className="font-semibold text-foreground">5-10 minutes</span> before your scheduled appointment time. This ensures we can start your service promptly.
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="my-8 border-t border-border" />

                                                <div className="flex items-start gap-4 py-8">
                                                    <Phone size={20} strokeWidth={2} className="shrink-0 text-muted-foreground" style={{ transform: 'translateY(2px)' }} />
                                                    <div>
                                                        <p className="text-[24px] font-bold text-foreground mb-2 tracking-tight leading-tight" style={{ fontSize: 19, fontWeight: 550, lineHeight: 1.25 }}>Questions or Changes?</p>
                                                        <p className="leading-relaxed text-muted-foreground opacity-80">
                                                            If you have any questions or need to make changes to your appointment, please call us at <a href="tel:0553552209" className="font-semibold text-foreground hover:underline underline-offset-2">0553 55 22 09</a> or email <a href="mailto:info@imperialcut.com" className="font-semibold text-foreground hover:underline underline-offset-2">info@imperialcut.com</a>
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
                                    (step === 4 && (
                                        bookingData.name.trim().length < 2 ||
                                        !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]*\.[a-zA-Z0-9.-]*[a-zA-Z]{2,}$/.test(bookingData.email.trim()) ||
                                        !/^(05|06|07)[0-9]{8}$/.test(bookingData.phone)
                                    ))
                                }
                                className={`${step === 1 ? "flex-none w-full md:w-auto md:min-w-[560px]" : "flex-1 md:flex-none md:min-w-[400px]"} px-8 py-6 uppercase tracking-wider transition-all duration-300 ease-out ${
                                    (step === 1 && !bookingData.service) ||
                                    (step === 2 && !bookingData.barber) ||
                                    (step === 3 &&
                                        (!bookingData.date ||
                                            !bookingData.time)) ||
                                    (step === 4 && (
                                        bookingData.name.trim().length < 2 ||
                                        !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]*\.[a-zA-Z0-9.-]*[a-zA-Z]{2,}$/.test(bookingData.email.trim()) ||
                                        !/^(05|06|07)[0-9]{8}$/.test(bookingData.phone)
                                    ))
                                        ? "!bg-[#F2F2F2] !text-[#999999] !opacity-100 cursor-not-allowed hover:!bg-[#F2F2F2] disabled:!bg-[#F2F2F2] disabled:!text-[#999999]"
                                        : "bg-foreground text-background hover:bg-foreground/90"
                                }`}>
                                Next
                            </Button>
                        ) : (
                            <Button
                                onClick={confirmBooking}
                                className="flex-1 md:flex-none md:min-w-[400px] bg-foreground text-background hover:bg-foreground/90 px-8 py-6 uppercase tracking-wider !transition-none">
                                Confirm Booking
                            </Button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
