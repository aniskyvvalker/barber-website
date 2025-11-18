import { motion } from "motion/react";
import { useEffect, useRef } from "react";
import { Logo } from "./Logo";
import { Button } from "./ui/button";

export function Hero({ onBookingClick }: { onBookingClick?: () => void }) {
    const scrollToBooking = () => {
        if (onBookingClick) {
            onBookingClick();
        } else {
            const element = document.querySelector("#contact");
            if (element) {
                element.scrollIntoView({ behavior: "smooth", block: "start" });
            }
        }
    };

    const bgRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let raf = 0;
        const onScroll = () => {
            if (raf) cancelAnimationFrame(raf);
            raf = requestAnimationFrame(() => {
                const y = window.scrollY || 0;
                // Parallax: background should move much less than the content to create depth.
                const bgSpeed = 0.35; // smaller -> moves slower
                const contentSpeed = 0.3; // larger -> foreground moves more
                if (bgRef.current)
                    bgRef.current.style.transform = `translateY(${
                        y * bgSpeed
                    }px) translateZ(0)`;
                if (contentRef.current)
                    contentRef.current.style.transform = `translateY(${
                        y * contentSpeed
                    }px)`;
            });
        };
        window.addEventListener("scroll", onScroll, { passive: true });
        onScroll();
        return () => {
            window.removeEventListener("scroll", onScroll);
            if (raf) cancelAnimationFrame(raf);
        };
    }, []);

    return (
        <section
            id="hero"
            className="relative h-screen flex items-center justify-center overflow-hidden">
            <div
                ref={bgRef}
                className="absolute inset-0 z-0 will-change-transform">
                <img
                    src="https://images.unsplash.com/photo-1759134198561-e2041049419c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBiYXJiZXJzaG9wJTIwaW50ZXJpb3J8ZW58MXx8fHwxNzYwMzU0Nzc1fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                    className="absolute inset-0 w-full h-full object-cover"
                    loading="eager"
                    decoding="async"
                    crossOrigin="anonymous"
                    alt=""
                />
                <div className="absolute inset-0 bg-black/60" />
            </div>

            <div
                ref={contentRef}
                className="relative z-10 text-center text-white px-4 will-change-transform">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}>
                    <Logo size="large" className="justify-center mb-6" />
                </motion.div>

                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.5 }}
                    className="text-xl md:text-2xl text-gray-200 mb-10 tracking-wide">
                    Modern cuts. Classic craft.
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.8 }}>
                    <Button
                        onClick={scrollToBooking}
                        size="lg"
                        className="bg-accent hover:bg-accent/90 text-white px-8 py-6 rounded-[6px]">
                        <span className="relative -top-[1px]">
                            Book Your Appointment
                        </span>
                    </Button>
                </motion.div>
            </div>

            {/* Scroll Indicator */}
            <motion.div
                className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                    duration: 0.8,
                    delay: 1.2,
                    repeat: Infinity,
                    repeatType: "reverse",
                }}>
                <div className="w-6 h-10 border-2 border-white/50 rounded-full flex items-start justify-center p-2">
                    <div className="w-1 h-2 bg-white/50 rounded-full" />
                </div>
            </motion.div>
        </section>
    );
}
