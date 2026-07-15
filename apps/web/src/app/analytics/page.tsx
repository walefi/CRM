'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, DollarSign, Users, Target, Activity } from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/stores/auth.store';

const periods = [
  { value: 'today', label: 'Hoje' },
  { value: 'yesterday', label: 'Ontem' },
  { value: 'last_7_days', label: '7 dias' },
  { value: 'last_30_days', label: '30 dias' },
  { value: 'this_month', label: 'Mês' },
  { value: 'this_quarter', label: 'Trimestre' },
  { value: 'this_year', label: 'Ano' },
];

export default function AnalyticsPage() {
  const { user } = useAuthStore();
  const [period, setPeriod] = useState('last_30_days');

  const { data: kpis, isLoading: kpisLoading } = useQuery({
    queryKey: ['analytics', 'kpis', period],
    queryFn: () => api.get('/analytics/kpis', { params: { period } }).then((r) => r.data),
  });

  const { data: funnel, isLoading: funnelLoading } = useQuery({
    queryKey: ['analytics', 'funnel', period],
    queryFn: () => api.get('/analytics/funnel', { params: { period } }).then((r) => r.data),
  });

  const { data: revenue, isLoading: revenueLoading } = useQuery({
    queryKey: ['analytics', 'revenue', period],
    queryFn: () => api.get('/analytics/revenue', { params: { period } }).then((r) => r.data),
  });

  const { data: dealsByStage } = useQuery({
    queryKey: ['analytics', 'deals-by-stage', period],
    queryFn: () => api.get('/analytics/deals-by-stage', { params: { period } }).then((r) => r.data),
  });

  const { data: dealsByOwner } = useQuery({
    queryKey: ['analytics', 'deals-by-owner', period],
    queryFn: () => api.get('/analytics/deals-by-owner', { params: { period } }).then((r) => r.data),
  });

  const { data: leadsBySource } = useQuery({
    queryKey: ['analytics', 'leads-by-source', period],
    queryFn: () =>
      api.get('/analytics/leads-by-source', { params: { period } }).then((r) => r.data),
  });

  const { data: stats } = useQuery({
    queryKey: ['analytics', 'stats'],
    queryFn: () => api.get('/analytics/stats').then((r) => r.data),
  });

  const maxRevenue = revenue ? Math.max(...revenue.map((r: any) => r.value), 1) : 1;
  const maxFunnel = funnel ? Math.max(...funnel.stages.map((s: any) => s.value), 1) : 1;

  if (!user) return null;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground mt-1">Business Intelligence & Dashboards</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            {periods.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={cn(
                  'px-3 py-1.5 text-xs rounded-md font-medium transition-colors',
                  period === p.value
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {kpisLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-16" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <KpiCard
              title="Leads Criados"
              value={kpis?.leadsCreated || 0}
              icon={<Users className="h-4 w-4" />}
              color="bg-blue-500/10 text-blue-400"
            />
            <KpiCard
              title="Convertidos"
              value={kpis?.leadsConverted || 0}
              sub={`${kpis?.conversionRate || 0}%`}
              icon={<TrendingUp className="h-4 w-4" />}
              color="bg-emerald-500/10 text-emerald-400"
            />
            <KpiCard
              title="Deals Ganhos"
              value={kpis?.dealsWon || 0}
              sub={`${kpis?.winRate || 0}% win rate`}
              icon={<Target className="h-4 w-4" />}
              color="bg-green-500/10 text-green-400"
            />
            <KpiCard
              title="Receita"
              value={formatCurrency(kpis?.totalRevenue || 0)}
              icon={<DollarSign className="h-4 w-4" />}
              color="bg-purple-500/10 text-purple-400"
            />
            <KpiCard
              title="Ticket Médio"
              value={formatCurrency(kpis?.avgDealValue || 0)}
              icon={<Activity className="h-4 w-4" />}
              color="bg-orange-500/10 text-orange-400"
            />
            <KpiCard
              title="Deals Abertos"
              value={kpis?.dealsOpen || 0}
              icon={<Target className="h-4 w-4" />}
              color="bg-yellow-500/10 text-yellow-400"
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Receita por Período</CardTitle>
          </CardHeader>
          <CardContent>
            {revenueLoading ? (
              <Skeleton className="h-48" />
            ) : (
              <div className="h-48 flex items-end gap-1">
                {revenue?.map((r: any, i: number) => (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
                    <div
                      className="w-full bg-primary rounded-t-md transition-all"
                      style={{ height: `${(r.value / maxRevenue) * 100}%` }}
                    />
                  </div>
                ))}
              </div>
            )}
            {revenue?.length > 0 && (
              <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                <span>{revenue[0].date}</span>
                <span>{revenue[revenue.length - 1].date}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Funil de Vendas</CardTitle>
          </CardHeader>
          <CardContent>
            {funnelLoading ? (
              <Skeleton className="h-48" />
            ) : (
              <div className="space-y-3">
                {funnel?.stages?.map((s: any, i: number) => (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">{s.label}</span>
                      <span className="text-muted-foreground">{s.value}</span>
                    </div>
                    <div className="h-6 bg-muted rounded-md overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-md transition-all"
                        style={{ width: `${(s.value / maxFunnel) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Negócios por Etapa</CardTitle>
          </CardHeader>
          <CardContent>
            {!dealsByStage ? (
              <Skeleton className="h-48" />
            ) : (
              <div className="space-y-2">
                {dealsByStage.map((d: any, i: number) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/30"
                  >
                    <div>
                      <p className="text-sm font-medium">{d.stage}</p>
                      <p className="text-xs text-muted-foreground">{d.count} negócios</p>
                    </div>
                    <Badge variant="secondary">{formatCurrency(d.value)}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Ranking de Vendedores</CardTitle>
          </CardHeader>
          <CardContent>
            {!dealsByOwner ? (
              <Skeleton className="h-48" />
            ) : (
              <div className="space-y-2">
                {dealsByOwner.map((d: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{d.owner}</p>
                      <p className="text-xs text-muted-foreground">
                        {d.dealsWon} ganhos / {d.dealsLost} perdidos / {d.dealsTotal} total
                      </p>
                    </div>
                    <Badge variant={d.dealsWon > d.dealsLost ? 'default' : 'outline'}>
                      {d.dealsTotal > 0 ? Math.round((d.dealsWon / d.dealsTotal) * 100) : 0}%
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Leads por Origem</CardTitle>
          </CardHeader>
          <CardContent>
            {!leadsBySource ? (
              <Skeleton className="h-48" />
            ) : (
              <div className="space-y-2">
                {leadsBySource.map((l: any, i: number) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/30"
                  >
                    <span className="text-sm font-medium">{l.source}</span>
                    <Badge variant="secondary">{l.count}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Estatísticas do Engine</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Eventos Hoje</span>
                <span className="font-medium">{stats?.eventsToday || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Eventos no Mês</span>
                <span className="font-medium">{stats?.eventsMonth || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Dashboards</span>
                <span className="font-medium">{stats?.dashboardsTotal || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Widgets Ativos</span>
                <span className="font-medium">{stats?.widgetsTotal || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({
  title,
  value,
  sub,
  icon,
  color,
}: {
  title: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={cn('p-2 rounded-lg', color)}>{icon}</div>
          <div>
            <p className="text-sm font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{title}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}
