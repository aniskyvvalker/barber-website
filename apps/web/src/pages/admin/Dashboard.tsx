import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";

export default function Dashboard() {
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const navigate = useNavigate();

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

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate("/admin/login");
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div>Loading...</div>
            </div>
        );
    }

    return (
        <div
            className="min-h-screen"
            style={{ backgroundColor: "var(--background, #F9FAFB)" }}>
            <div className="p-6 max-w-7xl mx-auto">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-[#3D2817]">
                            Dashboard Overview
                        </h1>
                        <p className="text-muted-foreground mt-2">
                            Quick summary and recent activity
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            onClick={() => navigate("/admin/appointments")}
                            className="appointments-new-btn admin-primary-btn">
                            <span className="btn-text-full">
                                View Appointments
                            </span>
                            <span className="btn-text-short">Appointments</span>
                        </Button>
                        <Button variant="outline" onClick={handleLogout}>
                            Logout
                        </Button>
                    </div>
                </div>

                {/* Stats */}
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 appointments-stats">
                    <Card>
                        <div className="p-4">
                            <div className="text-sm text-muted-foreground">
                                Total Appointments
                            </div>
                            <div className="text-2xl font-semibold mt-2">—</div>
                        </div>
                    </Card>
                    <Card>
                        <div className="p-4">
                            <div className="text-sm text-muted-foreground">
                                Upcoming
                            </div>
                            <div className="text-2xl font-semibold mt-2">—</div>
                        </div>
                    </Card>
                    <Card>
                        <div className="p-4">
                            <div className="text-sm text-muted-foreground">
                                Registered Customers
                            </div>
                            <div className="text-2xl font-semibold mt-2">—</div>
                        </div>
                    </Card>
                    <Card>
                        <div className="p-4">
                            <div className="text-sm text-muted-foreground">
                                Revenue (30d)
                            </div>
                            <div className="text-2xl font-semibold mt-2">—</div>
                        </div>
                    </Card>
                </div>

                {/* Recent Activity */}
                <div className="mt-8">
                    <Card>
                        <div className="p-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-semibold">
                                    Recent Appointments
                                </h2>
                                <Button
                                    variant="ghost"
                                    onClick={() =>
                                        navigate("/admin/appointments")
                                    }>
                                    Open Appointments
                                </Button>
                            </div>

                            <div className="mt-4 text-sm text-muted-foreground">
                                There are no recent appointments to display.
                                Visit the Appointments page to manage bookings.
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
