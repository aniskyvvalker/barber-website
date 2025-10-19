import { useState, useEffect } from "react";
import type React from "react";
import { Logo } from "./Logo";
import { Menu, X } from "lucide-react";
import { Button } from "./ui/button";

const navItems = [
  { name: "Home", href: "#hero" },
  { name: "Services", href: "#services" },
  { name: "Team", href: "#team" },
  { name: "Gallery", href: "#gallery" },
  { name: "Testimonials", href: "#testimonials" },
  { name: "Contact", href: "#contact" },
  { name: "Get in Touch", href: "#getintouch" },
];

export function Navigation({ onBookingClick }: { onBookingClick?: () => void }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (
    e: React.MouseEvent<HTMLAnchorElement>,
    href: string,
  ) => {
    e.preventDefault();
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      setIsMobileMenuOpen(false);
    }
  };

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? "bg-background/95 backdrop-blur-sm shadow-md"
            : "bg-transparent"
        }`}
      >
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Logo
            size="small"
            className={isScrolled ? "text-primary" : "text-white"}
          />

          {/* Desktop Navigation */}
          <div className="show-lg items-center gap-6">
            {navItems.map((item) => (
              <a
                key={item.name}
                href={item.href}
                onClick={(e) => scrollToSection(e, item.href)}
                className={`nav-link relative pb-0.5 transition-[background-size,color] duration-300 hover:text-accent ${
                  isScrolled ? "text-foreground" : "text-white"
                } ${item.name === "Get in Touch" ? "whitespace-nowrap" : ""}
                bg-[linear-gradient(currentColor,currentColor)] bg-no-repeat [background-size:0%_2px] [background-position:0_100%] hover:[background-size:100%_2px]`}
              >
                {item.name}
              </a>
            ))}
            {onBookingClick && (
              <Button
                onClick={onBookingClick}
                size="sm"
                className="bg-transparent hover:bg-accent/90 transition-colors"
                style={{ borderColor: '#8B6F47', borderWidth: 2, borderStyle: 'solid' }}
                onMouseEnter={(e) => { const el = e.currentTarget.querySelector('[data-cta-text]') as HTMLElement | null; if (el) el.style.color = '#ffffff'; }}
                onMouseLeave={(e) => { const el = e.currentTarget.querySelector('[data-cta-text]') as HTMLElement | null; if (el) el.style.color = '#8B6F47'; }}
              >
                <span data-cta-text style={{ color: '#8B6F47' }}>Book Now</span>
              </Button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={`hide-lg ${isScrolled ? "text-primary" : "text-white"}`}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="hide-lg bg-background border-t border-border">
            <div className="container mx-auto px-4 py-4 flex flex-col items-center gap-4">
              {navItems.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  onClick={(e) => scrollToSection(e, item.href)}
                  className="nav-link relative text-foreground hover:text-accent text-center pb-0.5 transition-[background-size,color] duration-300 
                  bg-[linear-gradient(currentColor,currentColor)] bg-no-repeat [background-size:0%_2px] [background-position:0_100%] hover:[background-size:100%_2px]"
                >
                  {item.name}
                </a>
              ))}
              {onBookingClick && (
                <Button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onBookingClick();
                  }}
                  className="bg-accent hover:bg-accent/90 text-white w-full mt-4"
                >
                  Book Now
                </Button>
              )}
            </div>
          </div>
        )}
      </nav>
    </>
  );
}
