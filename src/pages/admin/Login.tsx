import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "../../components/ui/card";
import { AuroraBackground } from "../../components/ui/aurora-background";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const handleLogin = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;

            if (data.user) {
                navigate("/admin/appointments");
            }
        } catch (error: any) {
            setError(error.message || "Failed to login");
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuroraBackground className="min-h-screen p-4">
            <Card className="w-full max-w-md bg-card/90 backdrop-blur-sm">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl">Admin Login</CardTitle>
                    <CardDescription>
                        Access the barbershop dashboard
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">
                                {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="admin@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full"
                            disabled={loading}>
                            {loading ? "Logging in..." : "Login"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </AuroraBackground>
    );
}
