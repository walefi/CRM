'use client';

import { ModulePage } from '@/components/layout/module-page';
import { Phone } from 'lucide-react';

export default function Page() {
  return <ModulePage title="WhatsApp" icon={<Phone className="h-10 w-10" />} />;
}
