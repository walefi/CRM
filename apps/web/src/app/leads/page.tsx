'use client';

import { ModulePage } from '@/components/layout/module-page';
import { Target } from 'lucide-react';

export default function Page() {
  return <ModulePage title="Leads" icon={<Target className="h-10 w-10" />} />;
}
