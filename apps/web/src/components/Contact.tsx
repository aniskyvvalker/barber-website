import { motion } from "motion/react";
import { MapPin, Phone, Clock, Instagram, Video } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";

const openingHours = [
    { day: "Monday", hours: "10:00 AM - 8:00 PM" },
    { day: "Tuesday", hours: "10:00 AM - 8:00 PM" },
    { day: "Wednesday", hours: "10:00 AM - 8:00 PM" },
    { day: "Thursday", hours: "10:00 AM - 8:00 PM" },
    { day: "Friday", hours: "2:00 PM - 8:00 PM" },
    { day: "Saturday", hours: "10:00 AM - 8:00 PM" },
    { day: "Sunday", hours: "10:00 AM - 8:00 PM" },
];

export function Contact() {
    return (
        <section id="contact" className="py-20 bg-background">
            <div className="container mx-auto px-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-16">
                    <h2
                        className="text-4xl md:text-5xl mb-4"
                        style={{ fontFamily: "'Playfair Display', serif" }}>
                        Visit Us
                    </h2>
                    <p className="text-muted-foreground max-w-2xl mx-auto">
                        Stop by or get in touch to book your appointment.
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
                    {/* Contact Info */}
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}>
                        <Card className="mb-6">
                            <CardContent className="pt-6">
                                <h3 className="text-2xl mb-6">
                                    Contact Information
                                </h3>

                                <div className="space-y-4">
                                    <div className="flex items-start gap-3">
                                        <MapPin className="w-5 h-5 text-accent mt-1 flex-shrink-0" />
                                        <div>
                                            <p>Chemin de Sidi Yahia</p>
                                            <p>Bir Mourad Raïs, Alger 16005</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <Phone className="w-5 h-5 text-accent flex-shrink-0" />
                                        <a
                                            href="tel:+1234567890"
                                            className="hover:text-accent transition-colors">
                                            +213 (553) 552-209
                                        </a>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <Clock className="w-5 h-5 text-accent flex-shrink-0" />
                                        <p>See opening hours below</p>
                                    </div>
                                </div>

                                <div className="mt-6 pt-6 border-t border-border">
                                    <p className="mb-4">
                                        Book via WhatsApp or follow us:
                                    </p>
                                    <div className="flex flex-wrap gap-3">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="hover:bg-accent hover:text-white transition-colors"
                                            onClick={() =>
                                                window.open(
                                                    "https://wa.me/213553552209",
                                                    "_blank"
                                                )
                                            }>
                                            <Phone className="w-4 h-4 mr-2" />
                                            WhatsApp
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="hover:bg-accent hover:text-white transition-colors"
                                            onClick={() =>
                                                window.open(
                                                    "https://www.instagram.com/imperialcut.dz/",
                                                    "_blank"
                                                )
                                            }>
                                            <Instagram className="w-4 h-4 mr-2" />
                                            Instagram
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="hover:bg-accent hover:text-white transition-colors"
                                            onClick={() =>
                                                window.open(
                                                    "https://www.tiktok.com/@imperialcut.dz",
                                                    "_blank"
                                                )
                                            }>
                                            <Video className="w-4 h-4 mr-2" />
                                            TikTok
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Map */}
                        <div className="w-full h-64 rounded-lg overflow-hidden border border-border">
                            <iframe
                                title="Imperialcut Location"
                                src="https://www.google.com/maps?q=Chemin%20de%20Sidi%20Yahia%2C%20Bir%20Mourad%20Ra%C3%AFs%2C%20Alger%2016005&output=embed"
                                width="100%"
                                height="100%"
                                loading="lazy"
                                referrerPolicy="no-referrer-when-downgrade"
                                style={{ border: 0 }}
                            />
                        </div>
                        {/**
                         * Previous placeholder kept for reference:
                         *
                         * <div className="w-full h-64 bg-muted rounded-lg flex items-center justify-center">
                         *   <div className="text-center text-muted-foreground">
                         *     <MapPin className="w-12 h-12 mx-auto mb-2 opacity-50" />
                         *     <p>Interactive Map</p>
                         *     <p className="text-sm">Chemin de Sidi Yahia, Bir Mourad Raïs, Alger 16005</p>
                         *   </div>
                         * </div>
                         */}
                    </motion.div>

                    {/* Opening Hours */}
                    <motion.div
                        initial={{ opacity: 0, x: 30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}>
                        <Card>
                            <CardContent className="pt-6">
                                <h3 className="text-2xl mb-6">Opening Hours</h3>
                                <div className="space-y-3">
                                    {openingHours.map((item, index) => (
                                        <div
                                            key={item.day}
                                            className={`flex justify-between py-3 border-b border-border/50 last:border-0 ${
                                                item.hours === "Closed"
                                                    ? "text-muted-foreground"
                                                    : ""
                                            }`}>
                                            <span
                                                className={
                                                    item.day === "Friday"
                                                        ? "text-accent"
                                                        : ""
                                                }>
                                                {item.day}
                                            </span>
                                            <span>{item.hours}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-6 pt-6 border-t border-border">
                                    <p className="text-sm text-muted-foreground">
                                        Walk-ins welcome, but appointments are
                                        recommended to avoid wait times.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
