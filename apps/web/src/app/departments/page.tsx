'use client';

import { ModulePage } from '@/components/layout/module-page';
import { Building2 } from 'lucide-react';

export default function Page() {
  return <ModulePage title="Departamentos" icon={<Building2 className="h-10 w-10" />} />;
}
