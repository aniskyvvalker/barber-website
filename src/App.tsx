import { useState } from "react";
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

export default function App() {
  const [showBooking, setShowBooking] = useState(false);

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
}
