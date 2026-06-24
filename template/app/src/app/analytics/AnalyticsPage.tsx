import { useMemo, memo } from "react";
import { type AuthUser } from "wasp/auth";
import { useQuery } from "wasp/client/operations";
import { getAnalyticsData } from "wasp/client/operations";
import {
  MessageSquare, Users, UserPlus, Coins, DollarSign, TrendingUp,
  ArrowUpRight, ArrowDownRight, BarChart3, Loader2,
} from "lucide-react";
import { AppLayout } from "../layout/AppLayout";

function formatNumber(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toString();
}

function formatCost(n: number): string {
  if (n === 0) return "$0.00";
  if (n < 0.01) return "<$0.01";
  return "$" + n.toFixed(2);
}

const MiniChart = memo(function MiniChart({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1);
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1 || 1)) * 100;
    const y = 100 - (v / max) * 80;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg viewBox="0 0 100 100" className="h-12 w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`grad-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,100 ${points} 100,100`}
        fill={`url(#grad-${color.replace("#", "")})`}
      />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
});

const BarChartComponent = memo(function BarChartComponent({ data, color }: { data: { label: string; value: number }[]; color: string }) {
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="flex items-end gap-1" style={{ height: 80 }}>
      {data.map((d, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1">
          <div
            className="w-full rounded-t-sm transition-all"
            style={{
              backgroundColor: color,
              height: `${(d.value / max) * 100}%`,
              minHeight: d.value > 0 ? 2 : 0,
              opacity: 0.8,
            }}
          />
        </div>
      ))}
    </div>
  );
});

export function AnalyticsPage({ user }: { user: AuthUser }) {
  const { data, isLoading, error } = useQuery(getAnalyticsData) as any;

  const chartData = useMemo(() => {
    if (!data) return null;

    const conversationsLast7 = data.conversationsByDay.slice(-7).map((d) => d.count);
    const tokensLast7 = data.aiUsageByDay.slice(-7).map((d) => d.tokens);
    const costLast7 = data.aiUsageByDay.slice(-7).map((d) => d.cost);

    const barData = data.conversationsByDay.slice(-14).map((d) => ({
      label: new Date(d.date).toLocaleDateString(undefined, { weekday: "short" }),
      value: d.count,
    }));

    const tokenBarData = data.aiUsageByDay.slice(-14).map((d) => ({
      label: new Date(d.date).toLocaleDateString(undefined, { weekday: "short" }),
      value: d.tokens,
    }));

    return { conversationsLast7, tokensLast7, costLast7, barData, tokenBarData };
  }, [data]);

  if (error) {
    return (
      <AppLayout user={user}>
        <div className="flex h-full items-center justify-center">
          <div className="bg-card rounded-2xl p-10 shadow-lg">
            <p className="text-2xl font-bold text-destructive">Error</p>
            <p className="text-muted-foreground mt-2 text-sm">{error.message}</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  const s = data?.summary;

  return (
    <AppLayout user={user}>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">Analytics</h1>
        <p className="text-muted-foreground mt-2 text-base lg:text-lg">
          Track your AI agent performance and engagement
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
        </div>
      ) : !data ? null : (
        <>
          {/* Summary Cards */}
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {/* Conversations */}
            <div className="bg-card rounded-2xl border border-border/50 p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <div className="bg-emerald-500/10 flex h-10 w-10 items-center justify-center rounded-xl">
                  <MessageSquare className="text-emerald-500 h-5 w-5" />
                </div>
                {chartData && (
                  <MiniChart data={chartData.conversationsLast7} color="#10b981" />
                )}
              </div>
              <p className="text-muted-foreground text-xs">Conversations</p>
              <p className="text-2xl font-bold">{formatNumber(s!.totalConversations)}</p>
              <p className="text-muted-foreground mt-1 text-xs">
                {formatNumber(s!.monthConversations)} this month
              </p>
            </div>

            {/* Visitors */}
            <div className="bg-card rounded-2xl border border-border/50 p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <div className="bg-blue-500/10 flex h-10 w-10 items-center justify-center rounded-xl">
                  <Users className="text-blue-500 h-5 w-5" />
                </div>
                {chartData && (
                  <MiniChart data={chartData.conversationsLast7} color="#3b82f6" />
                )}
              </div>
              <p className="text-muted-foreground text-xs">Visitors</p>
              <p className="text-2xl font-bold">{formatNumber(s!.totalVisitors)}</p>
              <p className="text-muted-foreground mt-1 text-xs">
                {formatNumber(s!.monthVisitors)} this month
              </p>
            </div>

            {/* Leads */}
            <div className="bg-card rounded-2xl border border-border/50 p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <div className="bg-violet-500/10 flex h-10 w-10 items-center justify-center rounded-xl">
                  <UserPlus className="text-violet-500 h-5 w-5" />
                </div>
              </div>
              <p className="text-muted-foreground text-xs">Leads</p>
              <p className="text-2xl font-bold">{formatNumber(s!.totalLeads)}</p>
              <p className="text-muted-foreground mt-1 text-xs">
                {s!.newLeads} new
              </p>
            </div>

            {/* AI Tokens */}
            <div className="bg-card rounded-2xl border border-border/50 p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <div className="bg-amber-500/10 flex h-10 w-10 items-center justify-center rounded-xl">
                  <Coins className="text-amber-500 h-5 w-5" />
                </div>
                {chartData && (
                  <MiniChart data={chartData.tokensLast7} color="#f59e0b" />
                )}
              </div>
              <p className="text-muted-foreground text-xs">AI Tokens</p>
              <p className="text-2xl font-bold">{formatNumber(s!.totalTokens)}</p>
              <p className="text-muted-foreground mt-1 text-xs">
                {formatNumber(s!.monthTokens)} this month
              </p>
            </div>

            {/* AI Cost */}
            <div className="bg-card rounded-2xl border border-border/50 p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <div className="bg-rose-500/10 flex h-10 w-10 items-center justify-center rounded-xl">
                  <DollarSign className="text-rose-500 h-5 w-5" />
                </div>
                {chartData && (
                  <MiniChart data={chartData.costLast7} color="#f43f5e" />
                )}
              </div>
              <p className="text-muted-foreground text-xs">AI Cost</p>
              <p className="text-2xl font-bold">{formatCost(s!.totalCost)}</p>
              <p className="text-muted-foreground mt-1 text-xs">
                {formatCost(s!.monthCost)} this month
              </p>
            </div>
          </div>

          {/* Charts Row */}
          <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Conversations Chart */}
            <div className="bg-card rounded-2xl border border-border/50 p-6 shadow-sm">
              <h3 className="mb-1 text-sm font-semibold">Conversations</h3>
              <p className="text-muted-foreground mb-4 text-xs">Last 14 days</p>
              {chartData && (
                <BarChartComponent data={chartData.barData} color="#10b981" />
              )}
              <div className="mt-3 flex justify-between text-[10px] text-muted-foreground">
                <span>14 days ago</span>
                <span>Today</span>
              </div>
            </div>

            {/* AI Token Usage Chart */}
            <div className="bg-card rounded-2xl border border-border/50 p-6 shadow-sm">
              <h3 className="mb-1 text-sm font-semibold">AI Token Usage</h3>
              <p className="text-muted-foreground mb-4 text-xs">Last 14 days</p>
              {chartData && (
                <BarChartComponent data={chartData.tokenBarData} color="#f59e0b" />
              )}
              <div className="mt-3 flex justify-between text-[10px] text-muted-foreground">
                <span>14 days ago</span>
                <span>Today</span>
              </div>
            </div>
          </div>

          {/* AI Usage by Model */}
          {data.usageByModel.length > 0 && (
            <div className="bg-card rounded-2xl border border-border/50 p-6 shadow-sm">
              <h3 className="mb-4 text-sm font-semibold">AI Usage by Model</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border/50 text-left">
                      <th className="pb-3 text-sm font-semibold">Model</th>
                      <th className="pb-3 text-sm font-semibold">Tokens</th>
                      <th className="pb-3 text-sm font-semibold">Cost</th>
                      <th className="pb-3 text-sm font-semibold">% of Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {data.usageByModel.map((m) => {
                      const pct = s!.totalCost > 0 ? (m.cost / s!.totalCost) * 100 : 0;
                      return (
                        <tr key={m.model} className="hover:bg-muted/50">
                          <td className="py-3 pr-4">
                            <span className="bg-muted inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium font-mono">
                              {m.model}
                            </span>
                          </td>
                          <td className="text-muted-foreground py-3 pr-4 text-sm">
                            {formatNumber(m.tokens)}
                          </td>
                          <td className="text-muted-foreground py-3 pr-4 text-sm">
                            {formatCost(m.cost)}
                          </td>
                          <td className="py-3">
                            <div className="flex items-center gap-2">
                              <div className="bg-muted h-2 w-24 overflow-hidden rounded-full">
                                <div
                                  className="bg-primary h-full rounded-full"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-muted-foreground text-xs">
                                {pct.toFixed(1)}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </AppLayout>
  );
}

