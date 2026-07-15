'use client';

import { ModulePage } from '@/components/layout/module-page';
import { Calendar } from 'lucide-react';

export default function Page() {
  return <ModulePage title="Calendário" icon={<Calendar className="h-10 w-10" />} />;
}
