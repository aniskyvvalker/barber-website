import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Switch } from "../../components/ui/switch";
import { Input } from "../../components/ui/input";
import { toast } from "../../hooks/use-toast";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Badge } from "../../components/ui/badge";
import {
    Settings,
    Plus,
    Edit,
    Trash2,
    Clock,
    Scissors,
    X,
    Calendar,
} from "lucide-react";

interface Service {
    id: string;
    name: string;
    price: number;
    duration: number;
    description: string | null;
    is_active: boolean;
    display_order: number;
    created_at: string;
}

export default function Services() {
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingService, setEditingService] = useState<Service | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        name: "",
        price: "",
        duration: "",
        description: "",
    });

    const [serviceDelete, setServiceDelete] = useState<{
        open: boolean;
        service?: Service | null;
    }>({ open: false });

    useEffect(() => {
        fetchServices();
    }, []);

    const fetchServices = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("services")
            .select("*")
            .order("display_order");

        if (error) {
            console.error("Error fetching services:", error);
        } else {
            setServices(data || []);
        }
        setLoading(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name || !formData.price || !formData.duration) {
            toast({
                title: "Missing fields",
                description: "Please fill in all required fields",
                variant: "destructive",
            });
            return;
        }

        const price = parseFloat(formData.price);
        const duration = parseInt(formData.duration);

        if (isNaN(price) || price <= 0) {
            toast({
                title: "Invalid price",
                description: "Please enter a valid price",
                variant: "destructive",
            });
            return;
        }

        if (isNaN(duration) || duration <= 0) {
            toast({
                title: "Invalid duration",
                description: "Please enter a valid duration",
                variant: "destructive",
            });
            return;
        }

        setSubmitting(true);

        try {
            if (editingService) {
                const { error } = await supabase
                    .from("services")
                    .update({
                        name: formData.name,
                        price: price,
                        duration: duration,
                        description: formData.description || null,
                    })
                    .eq("id", editingService.id);

                if (error) throw error;
            } else {
                const maxOrder =
                    services.length > 0
                        ? Math.max(...services.map((s) => s.display_order))
                        : 0;

                const { error } = await supabase.from("services").insert({
                    name: formData.name,
                    price: price,
                    duration: duration,
                    description: formData.description || null,
                    is_active: true,
                    display_order: maxOrder + 1,
                });

                if (error) throw error;
            }

            setFormData({ name: "", price: "", duration: "", description: "" });
            setEditingService(null);
            setDialogOpen(false);
            fetchServices();
        } catch (error) {
            console.error("Error saving service:", error);
            toast({
                title: "Error",
                description: "Failed to save service",
                variant: "destructive",
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = (service: Service) => {
        setEditingService(service);
        setFormData({
            name: service.name,
            price: service.price.toString(),
            duration: service.duration.toString(),
            description: service.description || "",
        });
        setDialogOpen(true);
    };

    const handleToggleActive = async (service: Service, checked?: boolean) => {
        const newVal =
            typeof checked === "boolean" ? checked : !service.is_active;
        const { error } = await supabase
            .from("services")
            .update({ is_active: newVal })
            .eq("id", service.id);

        if (error) {
            console.error("Error toggling service status:", error);
            toast({
                title: "Error",
                description: "Failed to update service status",
                variant: "destructive",
            });
        } else {
            toast({ title: "Success", description: "Service status updated" });
            // update local array to preserve original order
            setServices((prev) =>
                prev.map((s) =>
                    s.id === service.id ? { ...s, is_active: newVal } : s
                )
            );
        }
    };

    // handleToggleActive covers both button and switch toggles (updates local state)

    // open delete confirmation modal
    const handleDelete = (service: Service) => {
        setServiceDelete({ open: true, service });
    };

    // confirm deletion from modal
    const confirmDeleteService = async () => {
        if (!serviceDelete.service) return;
        const svc = serviceDelete.service;
        const { error } = await supabase
            .from("services")
            .delete()
            .eq("id", svc.id);
        if (error) {
            console.error("Error deleting service:", error);
            toast({
                title: "Error",
                description: "Failed to delete service",
                variant: "destructive",
            });
        } else {
            toast({
                title: "Deleted",
                description: "Service deleted successfully",
            });
            fetchServices();
        }
        setServiceDelete({ open: false, service: null });
    };

    const activeServices = services.filter((s) => s.is_active);
    const inactiveServices = services.filter((s) => !s.is_active);

    const avgDuration =
        services.length > 0
            ? Math.round(
                  services.reduce((sum, s) => sum + s.duration, 0) /
                      services.length
              )
            : 0;

    // truncate long descriptions to a max length for card display
    const truncate = (text: string | null | undefined, max = 70) => {
        if (!text) return text;
        return text.length > max ? text.slice(0, max) + "..." : text;
    };

    return (
        <div
            className="p-6 min-h-screen"
            style={{ backgroundColor: "#F9FAFB" }}>
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold text-gray-900">
                        Services Management
                    </h2>
                    <p className="text-gray-600 mt-1">
                        Manage your service offerings and pricing
                    </p>
                </div>

                <Button
                    className="admin-primary-btn h-10 px-4 rounded-md outline-none focus:outline-none ring-0 focus:ring-0 focus-visible:ring-0 ring-offset-0 focus-visible:ring-offset-0 transition-colors"
                    onClick={() => {
                        setEditingService(null);
                        setFormData({
                            name: "",
                            price: "",
                            duration: "",
                            description: "",
                        });
                        setDialogOpen(true);
                    }}>
                    <Plus className="h-4 w-4 mr-2" />
                    <span className="btn-text-full">Add Service</span>
                    <span className="btn-text-short">Add</span>
                </Button>
                {dialogOpen && (
                    <div
                        className="fixed inset-0"
                        style={{
                            position: "fixed",
                            inset: 0,
                            background: "rgba(0,0,0,0.6)",
                            zIndex: 2147483600,
                            backdropFilter: "blur(4px)",
                            WebkitBackdropFilter: "blur(4px)",
                        }}
                        onClick={() => {
                            setDialogOpen(false);
                            setEditingService(null);
                            setFormData({
                                name: "",
                                price: "",
                                duration: "",
                                description: "",
                            });
                        }}>
                        <div
                            className="relative rounded-xl bg-white shadow-lg overflow-hidden"
                            style={{
                                position: "fixed",
                                left: "50%",
                                top: "50%",
                                transform: "translate(-50%, -50%)",
                                zIndex: 2147483601,
                                width: "min(100%, 640px)",
                                height: "58vh",
                                maxHeight: "427px",
                                backgroundColor: "#fff",
                                border: "none",
                            }}
                            onClick={(e) => e.stopPropagation()}>
                            <button
                                type="button"
                                onClick={() => {
                                    setDialogOpen(false);
                                    setEditingService(null);
                                    setFormData({
                                        name: "",
                                        price: "",
                                        duration: "",
                                        description: "",
                                    });
                                }}
                                style={{
                                    position: "absolute",
                                    top: "16px",
                                    right: "16px",
                                    background: "none",
                                    border: "none",
                                    cursor: "pointer",
                                    padding: "4px",
                                    color: "#9CA3AF",
                                    transition: "color 0.2s",
                                    zIndex: 10,
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.color = "#4B5563";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.color = "#9CA3AF";
                                }}>
                                <X size={20} />
                            </button>

                            <div className="flex flex-col h-full">
                                {/* Scrollable Content */}
                                <div
                                    className="flex-1 overflow-y-auto barber-dialog-scroll"
                                    style={{ padding: "24px" }}>
                                    <div className="flex flex-col space-y-1.5 text-center sm:text-left">
                                        <h3
                                            className="text-xl font-bold leading-none tracking-tight mb-8"
                                            style={{
                                                color: "#111827",
                                                fontWeight: 600,
                                            }}>
                                            {editingService
                                                ? "Edit Service"
                                                : "Add New Service"}
                                        </h3>
                                        {editingService && (
                                            <p className="text-sm text-gray-500">
                                                Update service details
                                            </p>
                                        )}
                                    </div>

                                    <form
                                        onSubmit={handleSubmit}
                                        className="space-y-4"
                                        id="addServiceForm">
                                        <div className="space-y-2">
                                            <Label>Service Name *</Label>
                                            <input
                                                type="text"
                                                placeholder="Classic Haircut"
                                                value={formData.name}
                                                onChange={(e) =>
                                                    setFormData({
                                                        ...formData,
                                                        name: e.target.value,
                                                    })
                                                }
                                                required
                                                className="barber-dialog-input flex h-9 w-full rounded-md border px-3 py-1 text-sm outline-none transition-all"
                                                style={{
                                                    backgroundColor: "#F9FAFB",
                                                    color: "#111827",
                                                    borderColor: "#D1D5DB",
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.borderColor =
                                                        "#9CA3AF";
                                                }}
                                                onMouseLeave={(e) => {
                                                    if (
                                                        document.activeElement !==
                                                        e.currentTarget
                                                    ) {
                                                        e.currentTarget.style.borderColor =
                                                            "#D1D5DB";
                                                    }
                                                }}
                                                onFocus={(e) => {
                                                    e.currentTarget.style.borderColor =
                                                        "#9CA3AF";
                                                }}
                                                onBlur={(e) => {
                                                    e.currentTarget.style.borderColor =
                                                        "#D1D5DB";
                                                }}
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>Price ($) *</Label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    placeholder="45.00"
                                                    value={formData.price}
                                                    onChange={(e) =>
                                                        setFormData({
                                                            ...formData,
                                                            price: e.target
                                                                .value,
                                                        })
                                                    }
                                                    required
                                                    className="barber-dialog-input flex h-9 w-full rounded-md border px-3 py-1 text-sm outline-none transition-all"
                                                    style={{
                                                        backgroundColor:
                                                            "#F9FAFB",
                                                        color: "#111827",
                                                        borderColor: "#D1D5DB",
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.borderColor =
                                                            "#9CA3AF";
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        if (
                                                            document.activeElement !==
                                                            e.currentTarget
                                                        ) {
                                                            e.currentTarget.style.borderColor =
                                                                "#D1D5DB";
                                                        }
                                                    }}
                                                    onFocus={(e) => {
                                                        e.currentTarget.style.borderColor =
                                                            "#9CA3AF";
                                                    }}
                                                    onBlur={(e) => {
                                                        e.currentTarget.style.borderColor =
                                                            "#D1D5DB";
                                                    }}
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label>Duration (min) *</Label>
                                                <input
                                                    type="number"
                                                    step="5"
                                                    min="5"
                                                    placeholder="45"
                                                    value={formData.duration}
                                                    onChange={(e) =>
                                                        setFormData({
                                                            ...formData,
                                                            duration:
                                                                e.target.value,
                                                        })
                                                    }
                                                    required
                                                    className="barber-dialog-input flex h-9 w-full rounded-md border px-3 py-1 text-sm outline-none transition-all"
                                                    style={{
                                                        backgroundColor:
                                                            "#F9FAFB",
                                                        color: "#111827",
                                                        borderColor: "#D1D5DB",
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.borderColor =
                                                            "#9CA3AF";
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        if (
                                                            document.activeElement !==
                                                            e.currentTarget
                                                        ) {
                                                            e.currentTarget.style.borderColor =
                                                                "#D1D5DB";
                                                        }
                                                    }}
                                                    onFocus={(e) => {
                                                        e.currentTarget.style.borderColor =
                                                            "#9CA3AF";
                                                    }}
                                                    onBlur={(e) => {
                                                        e.currentTarget.style.borderColor =
                                                            "#D1D5DB";
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label>
                                                Description (Optional)
                                            </Label>
                                            <textarea
                                                placeholder="Brief description of the service..."
                                                value={formData.description}
                                                onChange={(e) =>
                                                    setFormData({
                                                        ...formData,
                                                        description:
                                                            e.target.value,
                                                    })
                                                }
                                                rows={3}
                                                className="barber-dialog-input flex w-full rounded-md border px-3 py-1 text-sm outline-none transition-all resize-none"
                                                style={{
                                                    backgroundColor: "#F9FAFB",
                                                    color: "#111827",
                                                    borderColor: "#D1D5DB",
                                                }}
                                                onFocus={(e) => {
                                                    const el =
                                                        e.currentTarget as HTMLTextAreaElement;
                                                    el.style.borderColor =
                                                        "#9CA3AF";
                                                    el.style.outline = "none";
                                                    el.style.boxShadow = "none";
                                                }}
                                                onBlur={(e) => {
                                                    const el =
                                                        e.currentTarget as HTMLTextAreaElement;
                                                    el.style.borderColor =
                                                        "#D1D5DB";
                                                    el.style.outline = "none";
                                                    el.style.boxShadow = "none";
                                                }}
                                            />
                                        </div>
                                    </form>
                                </div>

                                {/* Footer Actions (sticky at bottom) */}
                                <div className="px-6 md:px-8 py-6 rounded-b-xl flex flex-row items-center justify-end gap-3 flex-wrap">
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
                                            ).style.backgroundColor = "#FFFFFF";
                                        }}
                                        onClick={() => {
                                            setDialogOpen(false);
                                            setEditingService(null);
                                            setFormData({
                                                name: "",
                                                price: "",
                                                duration: "",
                                                description: "",
                                            });
                                        }}>
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        form="addServiceForm"
                                        disabled={submitting}
                                        className="admin-primary-btn h-11 px-7 whitespace-nowrap rounded-md outline-none focus:outline-none ring-0 focus:ring-0 focus-visible:ring-0 ring-offset-0 focus-visible:ring-offset-0 transition-colors"
                                        style={{
                                            paddingLeft: "1rem",
                                            paddingRight: "1rem",
                                            minWidth: "8rem",
                                        }}>
                                        {submitting
                                            ? "Saving..."
                                            : editingService
                                            ? "Update Service"
                                            : "Add Service"}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Stats */}
            <div
                className="service-stats"
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    border: "1px solid #E5E7EB",
                    borderRadius: "0.5rem",
                    overflow: "hidden",
                    backgroundColor: "#ffffff",
                    marginBottom: "1.5rem",
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
                        Total Services
                    </div>
                    <div
                        style={{
                            fontSize: "2.5rem",
                            fontWeight: 500,
                            color: "#111827",
                            marginTop: "0.25rem",
                        }}>
                        {services.length}
                    </div>
                </div>

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
                        Active Services
                    </div>
                    <div
                        style={{
                            fontSize: "2.5rem",
                            fontWeight: 500,
                            color: "#059669",
                            marginTop: "0.25rem",
                        }}>
                        {activeServices.length}
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
                        Inactive Services
                    </div>
                    <div
                        style={{
                            fontSize: "2.5rem",
                            fontWeight: 500,
                            color: "#9CA3AF",
                            marginTop: "0.25rem",
                        }}>
                        {inactiveServices.length}
                    </div>
                </div>
            </div>

            {/* Active Services */}
            <Card
                className="mb-6 bg-transparent shadow-none border-0"
                style={{
                    backgroundColor: "transparent",
                    boxShadow: "none",
                    border: "none",
                }}>
                <CardHeader>
                    <CardTitle className="text-2xl font-bold text-gray-900">
                        Active Services
                    </CardTitle>
                </CardHeader>
                <CardContent className="px-0">
                    {loading ? (
                        <div className="text-center py-12">
                            <p className="text-gray-500">Loading...</p>
                        </div>
                    ) : services.length === 0 ? (
                        <div className="text-center py-12">
                            <Scissors className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                            <p className="text-gray-500">No active services</p>
                        </div>
                    ) : (
                        <div
                            className="barber-row px-0"
                            style={{ paddingLeft: 0, paddingRight: 0 }}>
                            {services.map((service) => (
                                <Card
                                    key={service.id}
                                    className="bg-white rounded-lg overflow-hidden"
                                    style={{
                                        backgroundColor: "#ffffff",
                                        borderColor: "#E5E7EB",
                                        borderWidth: 1,
                                        borderStyle: "solid",
                                        height: "320px",
                                        borderBottomLeftRadius: "1rem",
                                        borderBottomRightRadius: "1rem",
                                    }}>
                                    <div
                                        className="pt-6 px-6 pb-0"
                                        style={{
                                            height: "220px",
                                            overflow: "hidden",
                                            position: "relative",
                                            zIndex: 10,
                                            marginBottom: "-20px",
                                        }}>
                                        <div
                                            className="grid"
                                            style={{
                                                gridTemplateColumns: "64px 1fr",
                                                gap: "16px",
                                                alignItems: "center",
                                            }}>
                                            <div>
                                                <div
                                                    className="rounded-full flex items-center justify-center overflow-hidden"
                                                    style={{
                                                        width: 64,
                                                        height: 64,
                                                        backgroundColor:
                                                            "#F5F5DC",
                                                    }}>
                                                    <Scissors size={28} />
                                                </div>
                                            </div>
                                            <div className="min-w-0">
                                                <h3
                                                    className="text-xl font-extrabold text-gray-700"
                                                    style={{
                                                        display: "-webkit-box",
                                                        WebkitLineClamp: 2,
                                                        WebkitBoxOrient:
                                                            "vertical",
                                                        overflow: "hidden",
                                                    }}>
                                                    {truncate(service.name, 20)}
                                                </h3>
                                                {service.description && (
                                                    <p
                                                        className="text-sm mt-1 truncate"
                                                        style={{
                                                            color: "#6B7280",
                                                        }}>
                                                        {truncate(
                                                            service.description,
                                                            70
                                                        )}
                                                    </p>
                                                )}
                                            </div>
                                            <div
                                                className="col-span-full mt-3"
                                                style={{
                                                    gridColumn: "1 / -1",
                                                }}>
                                                <div className="flex items-center w-full">
                                                    <div className="flex-[0.5]" />
                                                    <div className="flex items-center gap-2 text-[#D4AF37]">
                                                        <span className="font-medium text-2xl">
                                                            ${service.price}
                                                        </span>
                                                    </div>
                                                    <div className="flex-1" />
                                                    <div className="flex items-center gap-2 text-gray-600">
                                                        <Clock size={18} />
                                                        <span className="text-sm">
                                                            {service.duration}{" "}
                                                            minutes
                                                        </span>
                                                    </div>
                                                    <div className="flex-[0.5]" />
                                                </div>
                                            </div>

                                            <div className="col-start-1 mt-1">
                                                <span
                                                    className="inline-flex items-center gap-2 rounded-full text-sm font-medium"
                                                    style={{
                                                        padding: "6px 12px",
                                                        backgroundColor:
                                                            service.is_active
                                                                ? "#ECFDF5"
                                                                : "#F3F4F6",
                                                        color: service.is_active
                                                            ? "#065F46"
                                                            : "#6B7280",
                                                        border: service.is_active
                                                            ? "1px solid rgba(16,185,129,0.15)"
                                                            : "1px solid rgba(203,208,212,0.6)",
                                                    }}>
                                                    <span
                                                        style={{
                                                            width: 8,
                                                            height: 8,
                                                            backgroundColor:
                                                                service.is_active
                                                                    ? "#10B981"
                                                                    : "#9CA3AF",
                                                            borderRadius: 8,
                                                        }}
                                                    />
                                                    {service.is_active
                                                        ? "Available"
                                                        : "Inactive"}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="border-t" />
                                    <div className="px-6 pb-4 bg-gray-50 flex items-center justify-between">
                                        <div className="flex-1 flex items-center justify-center">
                                            <button
                                                onClick={() =>
                                                    handleEdit(service)
                                                }
                                                className="flex flex-col items-center gap-2 text-sm text-gray-700">
                                                <Calendar size={20} />
                                                <span>Manage</span>
                                            </button>
                                        </div>

                                        <div
                                            style={{
                                                width: 2,
                                                height: 40,
                                                backgroundColor:
                                                    "rgba(203,204,207,0.72)",
                                                margin: "0 12px",
                                            }}
                                        />

                                        <div className="flex-1 flex items-center justify-center">
                                            <div className="flex flex-col items-center gap-2 text-sm text-gray-700">
                                                <Switch
                                                    checked={service.is_active}
                                                    onCheckedChange={(
                                                        checked
                                                    ) =>
                                                        handleToggleActive(
                                                            service,
                                                            checked as boolean
                                                        )
                                                    }
                                                />
                                                <span>Status</span>
                                            </div>
                                        </div>

                                        <div className="flex-1 flex items-center justify-center">
                                            <button
                                                onClick={() =>
                                                    handleDelete(service)
                                                }
                                                className="flex flex-col items-center gap-2 text-sm"
                                                style={{ color: "#DC2626" }}>
                                                <Trash2 size={20} />
                                                <span>Delete</span>
                                            </button>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Delete service confirmation modal (matches delete barber design) */}
            {serviceDelete.open && (
                <div
                    className="fixed inset-0 flex items-center justify-center"
                    style={{ zIndex: 2147483647 }}>
                    <div
                        className="absolute inset-0 bg-black/70"
                        style={{
                            backdropFilter: "blur(4px)",
                            WebkitBackdropFilter: "blur(4px)",
                        }}
                        onClick={() =>
                            setServiceDelete({ open: false, service: null })
                        }
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
                                Delete service?
                            </h3>
                            <p
                                className="text-sm text-gray-600 text-center font-bold"
                                style={{ marginTop: "15px" }}>
                                This action cannot be undone.
                                <br />
                                Deleting this service will remove it from the
                                public listing and may affect existing
                                appointments.
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
                                onClick={() =>
                                    setServiceDelete({
                                        open: false,
                                        service: null,
                                    })
                                }>
                                Cancel
                            </Button>
                            <Button
                                className="h-9 px-4 rounded-md transition-colors admin-cancel-btn"
                                onClick={async () => {
                                    if (!serviceDelete.service) return;
                                    const { error } = await supabase
                                        .from("services")
                                        .delete()
                                        .eq("id", serviceDelete.service.id);
                                    if (error) {
                                        toast({
                                            title: "Delete failed",
                                            description: error.message,
                                            variant: "destructive",
                                        });
                                    } else {
                                        setServices((prev) =>
                                            prev.filter(
                                                (s) =>
                                                    s.id !==
                                                    serviceDelete.service!.id
                                            )
                                        );
                                        toast({
                                            title: "Deleted",
                                            description: `${
                                                serviceDelete.service!.name
                                            } deleted`,
                                        });
                                    }
                                    setServiceDelete({
                                        open: false,
                                        service: null,
                                    });
                                }}>
                                Confirm Delete
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Inactive Services removed - services now use barber card layout and live update on toggle */}
        </div>
    );
}
