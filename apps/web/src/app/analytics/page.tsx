'use client';

import { ModulePage } from '@/components/layout/module-page';
import { TrendingUp } from 'lucide-react';

export default function Page() {
  return <ModulePage title="Analytics" icon={<TrendingUp className="h-10 w-10" />} />;
}
