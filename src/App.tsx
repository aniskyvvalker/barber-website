import { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/admin/Login";
import AdminLayout from "./pages/admin/Layout";
import DashboardHome from "./pages/admin/DashboardHome";
import Appointments from "./pages/admin/Appointments";
import Messages from "./pages/admin/Messages";
import Barbers from "./pages/admin/Barbers";
import Availability from "./pages/admin/Availability";
import AdminServices from "./pages/admin/Services";
import { Navigation } from "./components/Navigation";
import { Hero } from "./components/Hero";
import { Services } from "./components/Services";
import { Team } from "./components/Team";
import { Gallery } from "./components/Gallery";
import { Testimonials } from "./components/Testimonials";
import { GetInTouch } from "./components/GetInTouch";
import { Contact } from "./components/Contact";
import { Footer } from "./components/Footer";
import { BookingFlow } from "./components/BookingFlow";
import { AuroraBackgroundDemo } from "./components/ui/aurora-background-demo";

export default function App() {
    const [showBooking, setShowBooking] = useState(false);

    const Home = () => {
        if (showBooking) {
            return <BookingFlow onClose={() => setShowBooking(false)} />;
        }
        return (
            <div className="min-h-screen overflow-x-hidden">
                <Navigation onBookingClick={() => setShowBooking(true)} />
                <main>
                    <Hero onBookingClick={() => setShowBooking(true)} />
                    <Services />
                    <Team />
                    <Gallery />
                    <Testimonials />
                    <Contact />
                    <GetInTouch />
                </main>
                <Footer />
            </div>
        );
    };

    return (
        <Routes>
            {/* Public routes */}
            <Route path="/" element={<Home />} />

            {/* Admin routes */}
            <Route path="/admin/login" element={<Login />} />
            <Route path="/aurora" element={<AuroraBackgroundDemo />} />
            <Route path="/admin" element={<AdminLayout />}>
                <Route
                    index
                    element={<Navigate to="/admin/appointments" replace />}
                />
                <Route path="dashboard" element={<DashboardHome />} />
                <Route path="appointments" element={<Appointments />} />
                <Route path="messages" element={<Messages />} />
                <Route path="barbers" element={<Barbers />} />
                <Route path="availability" element={<Availability />} />
                <Route path="services" element={<AdminServices />} />
            </Route>

            {/* Catch all */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}
