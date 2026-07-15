'use client';

import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '@/components/layout/admin-layout';
import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Plus, Loader2, CalendarDays, List, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';

type ViewMode = 'month' | 'week' | 'day';

export default function CalendarPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');

  const dateRange = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    if (viewMode === 'month') {
      const start = new Date(year, month, 1);
      const s = new Date(year, month, 1 - start.getDay());
      const e = new Date(year, month + 1, 6 - start.getDay(), 23, 59, 59);
      return { start: s.toISOString(), end: e.toISOString() };
    }
    if (viewMode === 'week') {
      const start = new Date(currentDate);
      start.setDate(start.getDate() - start.getDay());
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      end.setHours(23, 59, 59);
      return { start: start.toISOString(), end: end.toISOString() };
    }
    const start = new Date(currentDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(currentDate);
    end.setHours(23, 59, 59);
    return { start: start.toISOString(), end: end.toISOString() };
  }, [currentDate, viewMode]);

  const events = useQuery({
    queryKey: ['calendar-events', dateRange.start, dateRange.end],
    queryFn: () =>
      api
        .get('/calendar/events', { params: { start: dateRange.start, end: dateRange.end } })
        .then((r) => r.data?.data || r.data || []),
  });

  const navigate = (dir: -1 | 1) => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      if (viewMode === 'month') d.setMonth(d.getMonth() + dir);
      else if (viewMode === 'week') d.setDate(d.getDate() + dir * 7);
      else d.setDate(d.getDate() + dir);
      return d;
    });
  };

  function goToToday() {
    setCurrentDate(new Date());
  }

  function handleDayClick(date: Date) {
    setSelectedDate(date.toISOString().split('T')[0]);
    setShowModal(true);
  }

  const title =
    viewMode === 'month'
      ? currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
      : viewMode === 'week'
        ? `Semana de ${new Date(dateRange.start).toLocaleDateString('pt-BR')}`
        : currentDate.toLocaleDateString('pt-BR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          });

  if (!user) return null;

  return (
    <AdminLayout
      user={{
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
      }}
    >
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold capitalize">{title}</h1>
            <div className="flex gap-1">
              <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToToday}>
                Hoje
              </Button>
              <Button variant="outline" size="icon" onClick={() => navigate(1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-md border">
              <Button
                variant={viewMode === 'month' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('month')}
              >
                <CalendarDays className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'week' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('week')}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'day' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('day')}
              >
                <Clock className="h-4 w-4" />
              </Button>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setSelectedDate(new Date().toISOString().split('T')[0]);
                setShowModal(true);
              }}
            >
              <Plus className="h-4 w-4 mr-1" /> Evento
            </Button>
          </div>
        </div>

        {viewMode === 'month' && (
          <MonthView
            currentDate={currentDate}
            events={events.data || []}
            onDayClick={handleDayClick}
          />
        )}
        {viewMode === 'week' && (
          <WeekView
            startDate={new Date(dateRange.start)}
            events={events.data || []}
            onSlotClick={handleDayClick}
          />
        )}
        {viewMode === 'day' && (
          <DayView
            date={new Date(dateRange.start)}
            events={events.data || []}
            onSlotClick={(h) => {
              setSelectedDate(
                new Date(dateRange.start).toISOString().split('T')[0] +
                  `T${String(h).padStart(2, '0')}:00`,
              );
              setShowModal(true);
            }}
          />
        )}

        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Evento</DialogTitle>
            </DialogHeader>
            <EventForm
              defaultDate={selectedDate}
              onClose={() => {
                setShowModal(false);
                queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
              }}
            />
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}

function MonthView({
  currentDate,
  events,
  onDayClick,
}: {
  currentDate: Date;
  events: any[];
  onDayClick: (d: Date) => void;
}) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date().toDateString();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let i = 1; i <= daysInMonth; i++) cells.push(i);

  return (
    <div className="rounded-lg border">
      <div className="grid grid-cols-7 border-b bg-muted/50">
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => (
          <div key={d} className="p-2 text-center text-xs font-semibold text-muted-foreground">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((day, i) => {
          if (!day) return <div key={`e${i}`} className="h-24 border-b border-r p-1 bg-muted/20" />;
          const date = new Date(year, month, day);
          const dateStr = date.toDateString();
          const dayEvents = events.filter((e) => new Date(e.startAt).toDateString() === dateStr);
          const isToday = dateStr === today;
          return (
            <div
              key={day}
              className="h-24 border-b border-r p-1 hover:bg-muted/30 cursor-pointer transition-colors overflow-hidden"
              onClick={() => onDayClick(date)}
            >
              <span
                className={cn(
                  'inline-flex items-center justify-center w-6 h-6 text-xs rounded-full',
                  isToday && 'bg-primary text-primary-foreground font-bold',
                )}
              >
                {day}
              </span>
              <div className="space-y-0.5 mt-0.5">
                {dayEvents.slice(0, 2).map((e) => (
                  <div
                    key={e.id}
                    className="text-xs truncate rounded px-1 py-0.5 bg-primary/10 text-primary"
                    title={e.title}
                  >
                    {e.title}
                  </div>
                ))}
                {dayEvents.length > 2 && (
                  <div className="text-xs text-muted-foreground">+{dayEvents.length - 2} mais</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekView({
  startDate,
  events,
  onSlotClick,
}: {
  startDate: Date;
  events: any[];
  onSlotClick: (d: Date) => void;
}) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    return d;
  });
  const hours = Array.from({ length: 14 }, (_, i) => i + 7);
  return (
    <div className="rounded-lg border overflow-x-auto">
      <div className="grid grid-cols-[4rem_repeat(7,1fr)] border-b bg-muted/50 min-w-[600px]">
        <div className="p-2" />
        {days.map((d) => (
          <div key={d.toISOString()} className="p-2 text-center text-xs">
            <div className="text-muted-foreground">
              {d.toLocaleDateString('pt-BR', { weekday: 'short' })}
            </div>
            <div
              className={cn(
                'font-semibold',
                d.toDateString() === new Date().toDateString() && 'text-primary',
              )}
            >
              {d.getDate()}
            </div>
          </div>
        ))}
      </div>
      <div className="min-w-[600px]">
        {hours.map((h) => (
          <div key={h} className="grid grid-cols-[4rem_repeat(7,1fr)] border-b">
            <div className="p-1 text-xs text-muted-foreground text-right pr-2">
              {String(h).padStart(2, '0')}:00
            </div>
            {days.map((d) => {
              const slotEvents = events.filter(
                (e) =>
                  new Date(e.startAt).getHours() === h &&
                  new Date(e.startAt).toDateString() === d.toDateString(),
              );
              return (
                <div
                  key={d.toISOString()}
                  className="p-0.5 border-r min-h-[2rem] hover:bg-muted/30 cursor-pointer"
                  onClick={() => {
                    d.setHours(h);
                    onSlotClick(d);
                  }}
                >
                  {slotEvents.map((e) => (
                    <div
                      key={e.id}
                      className="text-xs truncate rounded px-1 bg-primary/10 text-primary mb-0.5"
                    >
                      {e.title}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function DayView({
  date,
  events,
  onSlotClick,
}: {
  date: Date;
  events: any[];
  onSlotClick: (h: number) => void;
}) {
  const hours = Array.from({ length: 16 }, (_, i) => i + 6);
  const dayEvents = events.filter(
    (e) => new Date(e.startAt).toDateString() === date.toDateString(),
  );
  return (
    <div className="rounded-lg border">
      <div className="p-3 bg-muted/50 border-b text-center font-semibold">
        {date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
      </div>
      {hours.map((h) => {
        const hourEvents = dayEvents.filter((e) => new Date(e.startAt).getHours() === h);
        return (
          <div
            key={h}
            className="flex border-b hover:bg-muted/30 cursor-pointer min-h-[3rem]"
            onClick={() => onSlotClick(h)}
          >
            <div className="w-16 p-2 text-xs text-muted-foreground text-right border-r shrink-0">
              {String(h).padStart(2, '0')}:00
            </div>
            <div className="flex-1 p-1 space-y-0.5">
              {hourEvents.map((e) => (
                <div key={e.id} className="rounded px-2 py-1 bg-primary/10 text-primary text-sm">
                  {e.title}{' '}
                  <span className="text-xs text-muted-foreground ml-1">{e.description}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EventForm({ defaultDate, onClose }: { defaultDate?: string; onClose: () => void }) {
  const [form, setForm] = useState({ title: '', description: '', startAt: defaultDate || '' });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/calendar/events', form);
      toast.success('Evento criado');
      onClose();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Erro');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Título *</Label>
        <Input
          required
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label>Data/Hora *</Label>
        <Input
          type="datetime-local"
          required
          value={form.startAt}
          onChange={(e) => setForm({ ...form, startAt: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label>Descrição</Label>
        <Input
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Criar Evento
      </Button>
    </form>
  );
}
