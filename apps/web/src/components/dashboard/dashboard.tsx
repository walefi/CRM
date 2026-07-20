import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, CheckSquare, DollarSign } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';

export function Dashboard() {
  const [stats, setStats] = useState({
    totalContacts: 0,
    totalDeals: 0,
    pendingTasks: 0,
    totalValue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [contactsRes, dealsRes, tasksRes] = await Promise.all([
          api.get('/contacts/stats').catch(() => ({ data: { total: 0 } })),
          api.get('/deals/stats').catch(() => ({ data: { total: 0, totalValue: 0 } })),
          api.get('/tasks/stats').catch(() => ({ data: { pending: 0 } })),
        ]);
        setStats({
          totalContacts: contactsRes.data?.total ?? 0,
          totalDeals: dealsRes.data?.total ?? 0,
          totalValue: dealsRes.data?.totalValue ?? 0,
          pendingTasks: tasksRes.data?.pending ?? 0,
        });
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Link href="/contacts">
        <Card className="card-hover cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Contatos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : stats.totalContacts}</div>
          </CardContent>
        </Card>
      </Link>

      <Link href="/deals">
        <Card className="card-hover cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Negócios</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : stats.totalDeals}</div>
            <p className="text-xs text-muted-foreground">
              {loading
                ? ''
                : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                    stats.totalValue
                  )}
            </p>
          </CardContent>
        </Card>
      </Link>

      <Link href="/tasks">
        <Card className="card-hover cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tarefas Pendentes</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : stats.pendingTasks}</div>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}
