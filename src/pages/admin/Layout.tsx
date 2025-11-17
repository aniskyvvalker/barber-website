import React, { useEffect, useRef, useState } from "react";
import { useNavigate, Outlet, NavLink, useLocation } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { Button } from "../../components/ui/button";
import {
    Calendar,
    MessageSquare,
    Users,
    Clock,
    Settings,
    LogOut,
    LayoutDashboard,
    Scissors,
} from "lucide-react";
import { Toaster } from "../../components/ui/toaster";

export default function AdminLayout() {
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [collapsed, setCollapsed] = useState(false);
    const [isNarrowScreen, setIsNarrowScreen] = useState(false);
    const [isMediumScreen, setIsMediumScreen] = useState(false);
    const asideRef = useRef<HTMLDivElement | null>(null);
    const [spacerWidth, setSpacerWidth] = useState<number>(0);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const checkAuth = async () => {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!user) {
                navigate("/admin/login");
            } else {
                setUser(user);
            }
            setLoading(false);
        };
        checkAuth();
    }, [navigate]);

    // Collapse sidebar on smaller screens and adapt on resize
    useEffect(() => {
        const handleResize = () => {
            try {
                if (typeof window !== "undefined") {
                    setCollapsed(window.innerWidth < 1300);
                    // use 900px breakpoint for mobile overlay behavior
                    setIsNarrowScreen(window.innerWidth < 900);
                    // medium breakpoint at 1200px for appointments-specific non-push behavior
                    setIsMediumScreen(window.innerWidth < 1201);
                }
            } catch (_) {
                /* noop */
            }
        };
        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    // Shorten page titles and hide subtitles on very small screens (<768px)
    useEffect(() => {
        const shortenTitles = () => {
            if (typeof window === "undefined") return;
            const small = window.innerWidth < 768;
            const container = document.querySelector("main .min-h-screen");
            if (!container) return;
            const heading = container.querySelector(
                "h1, h2"
            ) as HTMLElement | null;
            if (!heading) return;

            if (small) {
                if (!heading.getAttribute("data-orig-title")) {
                    heading.setAttribute(
                        "data-orig-title",
                        heading.textContent || ""
                    );
                }
                const orig = heading.getAttribute("data-orig-title") || "";
                // custom mapping (best-effort)
                const mapping: Record<string, string> = {
                    "Availability Management": "Availability",
                    "Dashboard Overview": "Dashboard",
                    "Services Management": "Services",
                    "Messages Management": "Messages",
                    "Appointments Management": "Appointments",
                };

                let short = mapping[orig];
                if (!short) {
                    // remove common trailing words
                    short = orig
                        .replace(
                            /\b(Management|Overview|Administration|Management|Dashboard)\b/gi,
                            ""
                        )
                        .trim();
                    if (!short) short = orig.split(" ")[0] || orig;
                }
                heading.textContent = short;
            } else {
                const orig = heading.getAttribute("data-orig-title");
                if (orig) heading.textContent = orig;
            }
        };

        // run after a tiny delay so page content has rendered
        const t = setTimeout(shortenTitles, 40);
        window.addEventListener("resize", shortenTitles);
        return () => {
            clearTimeout(t);
            window.removeEventListener("resize", shortenTitles);
        };
    }, [location]);

    // Keep spacer width exactly equal to the rendered sidebar width (including border)
    useEffect(() => {
        const updateSpacer = () => {
            try {
                const el = asideRef.current;
                if (el) {
                    const rect = el.getBoundingClientRect();
                    setSpacerWidth(rect.width);
                } else {
                    setSpacerWidth(collapsed ? 80 : 256);
                }
            } catch (_) {
                /* noop */
            }
        };
        updateSpacer();
        const onResize = () => updateSpacer();
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, [collapsed]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate("/admin/login");
    };

    if (loading) {
        return (
            <div
                className="min-h-screen flex items-center justify-center"
                style={{ backgroundColor: "#F9FAFB" }}>
                <div>Loading...</div>
            </div>
        );
    }

    const navItems = [
        { name: "Dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
        { name: "Appointments", path: "/admin/appointments", icon: Calendar },
        { name: "Messages", path: "/admin/messages", icon: MessageSquare },
        { name: "Barbers", path: "/admin/barbers", icon: Users },
        { name: "Availability", path: "/admin/availability", icon: Clock },
        { name: "Services", path: "/admin/services", icon: Scissors },
    ];

    return (
        <div
            className="min-h-screen bg-gray-50 flex"
            style={{ backgroundColor: "#F9FAFB", position: "relative" }}>
            {/* Mobile menu button moved into main content to avoid overlapping page titles */}
            {/* Overlay backdrop when sidebar is expanded on narrow screens */}
            {isNarrowScreen && !collapsed && (
                <div
                    style={{
                        position: "fixed",
                        inset: 0,
                        backgroundColor: "rgba(0, 0, 0, 0.5)",
                        zIndex: 50,
                        transition: "opacity 400ms ease-in-out",
                        opacity: 1,
                    }}
                    onClick={() => setCollapsed(true)}
                />
            )}
            {/* Sidebar */}
            <aside
                className={`admin-sidebar h-screen fixed left-0 top-0 overflow-y-hidden bg-white flex flex-col transition-all duration-300 border-r border-gray-200 z-40`}
                style={{
                    backgroundColor: "#FFFFFF",
                    width: collapsed ? 80 : 240,
                    boxShadow:
                        "4px 0 6px -1px rgba(0, 0, 0, 0.1), 2px 0 4px -1px rgba(0, 0, 0, 0.06)",
                    // Position fixed always; adjust zIndex so that on appointments medium breakpoint
                    // the expanded sidebar overlays the content while the spacer keeps layout width equal to 80.
                    position: "fixed",
                    zIndex: isNarrowScreen
                        ? 60
                        : isMediumScreen &&
                          location.pathname.startsWith("/admin/appointments") &&
                          !collapsed
                        ? 60
                        : 40,
                    // hide persistent sidebar on narrow screens when collapsed
                    display: isNarrowScreen && collapsed ? "none" : undefined,
                }}
                ref={asideRef as any}
                onClick={() => setCollapsed(!collapsed)}>
                {/* Header */}
                <div className="h-24 flex items-center justify-center px-4">
                    {collapsed ? (
                        <div className="w-10 h-10 rounded-full bg-[#D4AF37] flex items-center justify-center text-[#3D2817] font-bold text-sm">
                            IC
                        </div>
                    ) : (
                        <div className="text-center">
                            <h1 className="text-xl font-bold text-[#3D2817]">
                                Imperial Cut
                            </h1>
                            <p className="text-xs text-gray-500 mt-1">
                                Admin Dashboard
                            </p>
                        </div>
                    )}
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-3">
                    <ul className="space-y-1">
                        {navItems.map((item) => (
                            <li key={item.path}>
                                <NavLink
                                    to={item.path}
                                    className={({ isActive }) =>
                                        `group flex items-center justify-start gap-3 h-12 px-4 rounded-lg transition-colors ${
                                            isActive
                                                ? "bg-gray-100 text-blue-600 font-medium"
                                                : "text-gray-700 hover:bg-gray-100 hover:text-blue-600"
                                        }`
                                    }
                                    onClick={(e) => e.stopPropagation()}
                                    title={collapsed ? item.name : undefined}>
                                    {({ isActive }) => (
                                        <>
                                            <item.icon
                                                size={22}
                                                className={`flex-shrink-0`}
                                                style={{
                                                    color: isActive
                                                        ? "#2563EB"
                                                        : undefined,
                                                }}
                                            />
                                            <span
                                                className={
                                                    isActive
                                                        ? "group-hover:text-blue-600"
                                                        : "text-gray-700 group-hover:text-blue-600"
                                                }
                                                style={{
                                                    color: isActive
                                                        ? "#2563EB"
                                                        : undefined,
                                                    display: "inline-block",
                                                    overflow: "hidden",
                                                    whiteSpace: "nowrap",
                                                    maxWidth: collapsed
                                                        ? 0
                                                        : 160,
                                                    transition:
                                                        "max-width 300ms ease, opacity 220ms ease",
                                                    opacity: collapsed ? 0 : 1,
                                                }}>
                                                {item.name}
                                            </span>
                                        </>
                                    )}
                                </NavLink>
                            </li>
                        ))}
                    </ul>
                </nav>

                {/* Settings & Logout */}
                <div className="p-3">
                    {/* Settings Nav Item */}
                    <NavLink
                        to="/admin/settings"
                        className={({ isActive }) =>
                            `group flex items-center justify-start gap-3 h-12 px-4 rounded-lg transition-colors ${
                                isActive
                                    ? "bg-gray-100 text-blue-600 font-medium"
                                    : "text-gray-700 hover:bg-gray-100 hover:text-blue-600"
                            }`
                        }
                        onClick={(e) => e.stopPropagation()}
                        title={collapsed ? "Settings" : undefined}>
                        {({ isActive }) => (
                            <>
                                <Settings
                                    size={22}
                                    className="flex-shrink-0"
                                    style={{
                                        color: isActive ? "#2563EB" : undefined,
                                    }}
                                />
                                <span
                                    className={
                                        isActive
                                            ? "group-hover:text-blue-600"
                                            : "text-gray-700 group-hover:text-blue-600"
                                    }
                                    style={{
                                        color: isActive ? "#2563EB" : undefined,
                                        display: "inline-block",
                                        overflow: "hidden",
                                        whiteSpace: "nowrap",
                                        maxWidth: collapsed ? 0 : 160,
                                        transition:
                                            "max-width 300ms ease, opacity 220ms ease",
                                        opacity: collapsed ? 0 : 1,
                                    }}>
                                    Settings
                                </span>
                            </>
                        )}
                    </NavLink>

                    {/* Logout Item */}
                    <div
                        role="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleLogout();
                        }}
                        className="group w-full flex items-center justify-start gap-3 h-12 px-4 rounded-lg transition-colors text-gray-700 bg-gray-100 hover:bg-gray-200 hover:text-blue-600"
                        title={collapsed ? "Logout" : undefined}>
                        <LogOut
                            size={22}
                            className="flex-shrink-0 text-gray-700 group-hover:text-blue-600"
                        />
                        <span
                            className="text-gray-700 group-hover:text-blue-600"
                            style={{
                                display: "inline-block",
                                overflow: "hidden",
                                whiteSpace: "nowrap",
                                maxWidth: collapsed ? 0 : 160,
                                transition:
                                    "max-width 300ms ease, opacity 220ms ease",
                                opacity: collapsed ? 0 : 1,
                            }}>
                            Logout
                        </span>
                    </div>
                </div>
            </aside>
            {/* Spacer to reserve layout width equal to the fixed sidebar */}
            <div
                className={`shrink-0 h-screen`}
                style={{
                    // For appointments page on medium screens (<1200px) do not reserve spacer (don't push content)
                    width: ((): number => {
                        // Narrow screens always hide spacer (overlay sidebar)
                        if (isNarrowScreen) return 0;
                        // For appointments on medium screens (<1201px) keep an 80px spacer
                        // so the main content width remains constant; when the sidebar
                        // expands it will overlay (z-index increased elsewhere).
                        if (
                            isMediumScreen &&
                            location.pathname.startsWith("/admin/appointments")
                        ) {
                            return 80;
                        }
                        // Default behavior: show full or collapsed width
                        return collapsed ? 80 : 240;
                    })(),
                    transition: "width 300ms",
                    backgroundColor: "#F9FAFB",
                }}
            />

            {/* Main Content */}
            <main className="flex-1" style={{ backgroundColor: "#F9FAFB" }}>
                <div
                    className={`min-h-screen ${
                        isNarrowScreen && collapsed ? "mobile-has-menu" : ""
                    }`}
                    style={{
                        backgroundColor: "#F9FAFB",
                        position: "relative",
                    }}>
                    {/* Mobile menu button inside main so it aligns with page header and doesn't overlap */}
                    {isNarrowScreen && collapsed && (
                        <button
                            className="mobile-menu-btn"
                            aria-label="Open menu"
                            onClick={(e) => {
                                e.stopPropagation();
                                setCollapsed(false);
                            }}>
                            ☰
                        </button>
                    )}
                    <Outlet />
                </div>
            </main>
            <Toaster />
        </div>
    );
}
