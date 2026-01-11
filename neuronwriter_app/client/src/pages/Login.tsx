import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect } from "react";

export default function Login() {
    const { user, loading, isAuthenticated } = useAuth();
    const [, setLocation] = useLocation();

    useEffect(() => {
        if (isAuthenticated && user) {
            setLocation("/dashboard");
        }
    }, [isAuthenticated, user, setLocation]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <div className="max-w-md w-full">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center p-3 rounded-xl bg-primary/10 mb-4">
                        <Zap className="w-8 h-8 text-primary" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">NLP Data にログイン</h1>
                    <p className="text-slate-600 mt-2">SEOコンテンツ最適化プラットフォーム</p>
                </div>

                <Card className="border-slate-200 shadow-xl">
                    <CardHeader className="space-y-1">
                        <CardTitle className="text-xl text-center">アカウントにアクセス</CardTitle>
                        <CardDescription className="text-center">
                            続行するには認証を行ってください
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                        <a href="/api/auth/mock-login">
                            <Button className="w-full" size="lg">
                                開発用アカウントでログイン (Dev)
                            </Button>
                        </a>
                        {/* 
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">
                                Or continue with
                            </span>
                        </div>
                    </div>
                    <Button variant="outline" className="w-full" disabled>
                        Google (Not Configured)
                    </Button>
                    */}
                    </CardContent>
                </Card>

                <p className="text-center text-sm text-slate-500 mt-6">
                    管理者に招待されたアカウントでログインしてください。
                </p>
            </div>
        </div>
    );
}
