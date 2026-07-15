'use client';

import { ModulePage } from '@/components/layout/module-page';
import { Briefcase } from 'lucide-react';

export default function Page() {
  return <ModulePage title="Equipes" icon={<Briefcase className="h-10 w-10" />} />;
}
