import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Coins, CreditCard, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";

/**
 * クレジット残高表示コンポーネント
 * サイドバーやヘッダーに埋め込んで使用
 */
export function CreditBalance({ compact = false }: { compact?: boolean }) {
    const { data, isLoading } = trpc.billing.getUserCredits.useQuery();

    if (isLoading) {
        return compact ? (
            <Skeleton className="h-6 w-16" />
        ) : (
            <Skeleton className="h-10 w-24" />
        );
    }

    const credits = data?.credits ?? 0;

    if (compact) {
        return (
            <Badge variant={credits > 0 ? "default" : "destructive"} className="gap-1">
                <Coins className="h-3 w-3" />
                {credits}
            </Badge>
        );
    }

    return (
        <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg">
            <Coins className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">
                残り <span className="text-primary font-bold">{credits}</span> クレジット
            </span>
        </div>
    );
}

/**
 * クレジット購入カード
 * 購入ページで使用
 */
export function CreditPurchaseCard({ amount, onPurchase, isLoading, comingSoon = false }: {
    amount: number;
    onPurchase: (amount: number) => void;
    isLoading: boolean;
    comingSoon?: boolean; // 後日解放用フラグ
}) {
    const originalPrice = amount * 1000; // 1クレジット = 1,000円
    const discount = amount >= 10 ? 10 : amount >= 5 ? 5 : 0;
    const discountedPrice = Math.floor(originalPrice * (1 - discount / 100)); // 割引後価格

    return (
        <Card className={`relative overflow-hidden transition-shadow ${comingSoon ? 'opacity-60' : 'hover:shadow-lg'}`}>
            {/* 準備中オーバーレイ */}
            {comingSoon && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/5 backdrop-blur-[1px]">
                    <Badge variant="secondary" className="text-sm px-3 py-1 bg-white shadow-md">
                        🔒 準備中
                    </Badge>
                </div>
            )}
            {discount > 0 && (
                <Badge className={`absolute top-3 right-3 ${comingSoon ? 'bg-gray-400' : 'bg-green-500'}`}>
                    {discount}% OFF
                </Badge>
            )}
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Coins className="h-5 w-5 text-primary" />
                    {amount} クレジット
                </CardTitle>
                <CardDescription>
                    キーワード分析 {amount} 回分
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div>
                        {discount > 0 && (
                            <div className="text-sm text-muted-foreground line-through">
                                ¥{originalPrice.toLocaleString()}
                            </div>
                        )}
                        <div className="text-3xl font-bold">
                            ¥{discountedPrice.toLocaleString()}
                            <span className="text-sm font-normal text-muted-foreground ml-1">
                                (税込)
                            </span>
                        </div>
                    </div>
                    <Button
                        className="w-full"
                        onClick={() => onPurchase(amount)}
                        disabled={isLoading || comingSoon}
                    >
                        <CreditCard className="h-4 w-4 mr-2" />
                        {comingSoon ? '後日解放' : '購入する'}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}


/**
 * クレジット購入セクション
 * ダッシュボードに埋め込み可能
 */
export function CreditPurchaseSection() {
    const [, setLocation] = useLocation();
    const { data: creditsData } = trpc.billing.getUserCredits.useQuery();
    const createCheckout = trpc.billing.createCheckoutSession.useMutation({
        onSuccess: (data) => {
            if (data.url) {
                window.location.href = data.url;
            }
        },
        onError: (error) => {
            alert(`エラー: ${error.message}`);
        },
    });

    const handlePurchase = (amount: number) => {
        createCheckout.mutate({ creditsAmount: amount });
    };

    return (
        <div className="space-y-6">
            {/* 現在の残高 */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        クレジット残高
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-4xl font-bold text-primary">
                        {creditsData?.credits ?? 0}
                        <span className="text-lg font-normal text-muted-foreground ml-2">
                            クレジット
                        </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                        1クレジット = 1キーワード分析
                    </p>
                </CardContent>
            </Card>

            {/* 購入オプション */}
            <div>
                <h3 className="text-lg font-semibold mb-4">クレジットを購入</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <CreditPurchaseCard
                        amount={1}
                        onPurchase={handlePurchase}
                        isLoading={createCheckout.isPending}
                    />
                    <CreditPurchaseCard
                        amount={5}
                        onPurchase={handlePurchase}
                        isLoading={createCheckout.isPending}
                        comingSoon={true}
                    />
                    <CreditPurchaseCard
                        amount={10}
                        onPurchase={handlePurchase}
                        isLoading={createCheckout.isPending}
                        comingSoon={true}
                    />
                </div>
            </div>
        </div>
    );
}
