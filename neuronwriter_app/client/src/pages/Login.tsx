import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Zap, Loader2, Mail, Lock, User as UserIcon, ArrowRight } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function Login() {
    const { user, loading, isAuthenticated, refresh } = useAuth();
    const [, setLocation] = useLocation();

    // Form logic
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isAuthenticated && user) {
            if (user.role === "admin") {
                setLocation("/admin");
            } else {
                setLocation("/dashboard");
            }
        }
    }, [isAuthenticated, user, setLocation]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });
            const data = await res.json();
            if (data.success) {
                toast.success("ログインしました");
                await refresh(); // Refresh internal auth state
                // Redirect handled by useEffect
            } else {
                toast.error(data.error || "ログインに失敗しました");
            }
        } catch (error) {
            toast.error("エラーが発生しました");
        } finally {
            setIsLoading(false);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const res = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email, password }),
            });
            const data = await res.json();
            if (data.success) {
                toast.success("アカウントを作成しました");
                await refresh(); // Refresh internal auth state
                // Redirect handled by useEffect
            } else {
                toast.error(data.error || "登録に失敗しました");
            }
        } catch (error) {
            toast.error("エラーが発生しました");
        } finally {
            setIsLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
            <div className="max-w-md w-full">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center p-3 rounded-xl bg-primary/10 mb-4 animate-in fade-in zoom-in duration-500">
                        <Zap className="w-8 h-8 text-primary" />
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Lumina</h1>
                    <p className="text-slate-500 mt-2 font-medium">SEOコンテンツ最適化プラットフォーム</p>
                </div>

                <Tabs defaultValue="login" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-4 h-12">
                        <TabsTrigger value="login" className="text-base">ログイン</TabsTrigger>
                        <TabsTrigger value="register" className="text-base">新規登録</TabsTrigger>
                    </TabsList>

                    <TabsContent value="login">
                        <Card className="border-slate-200 shadow-xl backdrop-blur-sm bg-white/80">
                            <CardHeader>
                                <CardTitle>おかえりなさい</CardTitle>
                                <CardDescription>アカウントにログインして作業を再開しましょう</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleLogin} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="email">メールアドレス</Label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                            <Input
                                                id="email"
                                                type="email"
                                                placeholder="name@example.com"
                                                className="pl-9"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="password">パスワード</Label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                            <Input
                                                id="password"
                                                type="password"
                                                placeholder="••••••••"
                                                className="pl-9"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <Button type="submit" className="w-full group" size="lg" disabled={isLoading}>
                                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                        ログイン
                                        <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                    </Button>
                                </form>
                            </CardContent>
                            <CardFooter className="flex justify-center border-t pt-4">
                                <p className="text-xs text-slate-500 text-center">
                                    Demo Mode: 任意のメールアドレスとパスワードでログイン可能です
                                </p>
                            </CardFooter>
                        </Card>
                    </TabsContent>

                    <TabsContent value="register">
                        <Card className="border-slate-200 shadow-xl backdrop-blur-sm bg-white/80">
                            <CardHeader>
                                <CardTitle>アカウント作成</CardTitle>
                                <CardDescription>SEO最適化の旅を始めましょう</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleRegister} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">プロジェクト名 / ニックネーム (英数字推奨)</Label>
                                        <div className="relative">
                                            <UserIcon className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                            <Input
                                                id="name"
                                                type="text"
                                                placeholder="例: my-project-01"
                                                className="pl-9"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                required
                                            />
                                        </div>
                                        <p className="text-xs text-slate-500 mt-1">※ 半角英数字(my-project等)の使用を推奨</p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="reg-email">メールアドレス</Label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                            <Input
                                                id="reg-email"
                                                type="email"
                                                placeholder="name@example.com"
                                                className="pl-9"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="reg-password">パスワード</Label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                            <Input
                                                id="reg-password"
                                                type="password"
                                                placeholder="••••••••"
                                                className="pl-9"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                required
                                                minLength={4}
                                            />
                                        </div>
                                    </div>
                                    <Button type="submit" className="w-full group" size="lg" disabled={isLoading}>
                                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                        アカウント作成
                                        <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                <p className="text-center text-sm text-slate-400 mt-8">
                    &copy; 2026 Lumina. All rights reserved.
                </p>
            </div>
        </div>
    );
}
