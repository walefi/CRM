'use client';

import { ModulePage } from '@/components/layout/module-page';
import { DollarSign } from 'lucide-react';

export default function Page() {
  return <ModulePage title="Negócios" icon={<DollarSign className="h-10 w-10" />} />;
}
