'use client';

import { ModulePage } from '@/components/layout/module-page';
import { PieChart } from 'lucide-react';

export default function Page() {
  return <ModulePage title="Relatórios" icon={<PieChart className="h-10 w-10" />} />;
}
