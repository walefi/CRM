'use client';

import { ModulePage } from '@/components/layout/module-page';
import { Workflow } from 'lucide-react';

export default function Page() {
  return <ModulePage title="Automações" icon={<Workflow className="h-10 w-10" />} />;
}
