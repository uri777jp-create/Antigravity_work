import { useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation, useSearch } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2 } from "lucide-react";

/**
 * Stripe決済成功後のコールバックページ
 */
export default function BillingSuccessPage() {
    const [, setLocation] = useLocation();
    const search = useSearch();
    const params = new URLSearchParams(search);
    const sessionId = params.get("session_id");

    const handleSuccess = trpc.billing.handleCheckoutSuccess.useMutation({
        onSuccess: (data) => {
            // 成功処理
        },
        onError: (error) => {
            console.error("決済処理エラー:", error);
        },
    });

    useEffect(() => {
        if (sessionId && !handleSuccess.isSuccess && !handleSuccess.isPending) {
            handleSuccess.mutate({ sessionId });
        }
    }, [sessionId]);

    return (
        <div className="container max-w-md py-16">
            <Card className="text-center">
                <CardHeader>
                    {handleSuccess.isPending ? (
                        <Loader2 className="h-16 w-16 mx-auto text-primary animate-spin" />
                    ) : handleSuccess.isSuccess ? (
                        <CheckCircle2 className="h-16 w-16 mx-auto text-green-500" />
                    ) : handleSuccess.isError ? (
                        <div className="h-16 w-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
                            <span className="text-2xl">❌</span>
                        </div>
                    ) : null}
                    <CardTitle className="mt-4">
                        {handleSuccess.isPending ? "処理中..." :
                            handleSuccess.isSuccess ? "購入完了！" :
                                handleSuccess.isError ? "エラーが発生しました" : "確認中..."}
                    </CardTitle>
                    <CardDescription>
                        {handleSuccess.isPending ? "決済を確認しています" :
                            handleSuccess.isSuccess ? (
                                <>
                                    {handleSuccess.data.alreadyProcessed
                                        ? "この決済は既に処理済みです"
                                        : `${handleSuccess.data.creditsAdded} クレジットが追加されました`}
                                </>
                            ) :
                                handleSuccess.isError ? handleSuccess.error.message : ""}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <Button
                            className="w-full"
                            onClick={() => setLocation("/dashboard")}
                        >
                            ダッシュボードに戻る
                        </Button>
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => setLocation("/billing")}
                        >
                            クレジット管理を見る
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
