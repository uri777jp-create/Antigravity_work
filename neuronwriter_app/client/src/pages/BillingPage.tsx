import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { CreditPurchaseSection } from "@/components/CreditComponents";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Coins, History, ShieldCheck, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Link } from "wouter";


/**
 * クレジット購入・管理ページ
 */
export default function BillingPage() {
    const { user } = useAuth();
    const { data: payments, isLoading } = trpc.billing.getPaymentHistory.useQuery();

    return (
        <div className="container max-w-4xl py-8 space-y-8">
            {/* 戻るリンク */}
            <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-primary">
                    <ArrowLeft className="h-4 w-4" />
                    ダッシュボードに戻る
                </Button>
            </Link>

            {/* ヘッダー */}
            <div>
                <h1 className="text-3xl font-bold flex items-center gap-3">
                    <Coins className="h-8 w-8 text-primary" />
                    クレジット管理
                </h1>
                <p className="text-muted-foreground mt-2">
                    キーワード分析用のクレジットを購入・管理できます
                </p>
            </div>

            {/* 購入セクション */}
            <CreditPurchaseSection />

            {/* 決済履歴 */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <History className="h-5 w-5" />
                        決済履歴
                    </CardTitle>
                    <CardDescription>
                        過去の購入履歴を確認できます
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="text-center py-8 text-muted-foreground">
                            読み込み中...
                        </div>
                    ) : payments && payments.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>日時</TableHead>
                                    <TableHead>クレジット数</TableHead>
                                    <TableHead>金額</TableHead>
                                    <TableHead>ステータス</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {payments.map((payment) => (
                                    <TableRow key={payment.id}>
                                        <TableCell>
                                            {format(new Date(payment.createdAt), "yyyy/MM/dd HH:mm", { locale: ja })}
                                        </TableCell>
                                        <TableCell>{payment.creditsAmount} クレジット</TableCell>
                                        <TableCell>¥{payment.amountJpy.toLocaleString()}</TableCell>
                                        <TableCell>
                                            <Badge variant={
                                                payment.status === "completed" ? "default" :
                                                    payment.status === "pending" ? "secondary" :
                                                        "destructive"
                                            }>
                                                {payment.status === "completed" ? "完了" :
                                                    payment.status === "pending" ? "処理中" :
                                                        payment.status === "failed" ? "失敗" : "返金済み"}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            まだ決済履歴がありません
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* セキュリティ情報 */}
            <Card className="bg-muted/30">
                <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                        <ShieldCheck className="h-5 w-5 text-green-500 mt-0.5" />
                        <div>
                            <p className="font-medium">安全な決済</p>
                            <p className="text-sm text-muted-foreground">
                                すべての決済はStripeを通じて安全に処理されます。
                                クレジットカード情報は当サイトには保存されません。
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
