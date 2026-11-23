import {
  BookOpen,
  Building2,
  CalendarRange,
  FileText,
  Gauge,
  LayoutDashboard,
  Landmark,
  Receipt,
  Settings,
  Users,
  type LucideIcon,
} from 'lucide-react';

export type ModuleId =
  | 'dashboard'
  | 'apartments'
  | 'owners'
  | 'charges'
  | 'billing'
  | 'payments'
  | 'settlements'
  | 'accounting'
  | 'reports'
  | 'settings';

export interface NavigationItem {
  id: ModuleId;
  icon: LucideIcon;
}

export const NAVIGATION_ITEMS: NavigationItem[] = [
  { id: 'dashboard', icon: LayoutDashboard },
  { id: 'apartments', icon: Building2 },
  { id: 'owners', icon: Users },
  { id: 'charges', icon: Receipt },
  { id: 'billing', icon: CalendarRange },
  { id: 'payments', icon: Landmark },
  { id: 'settlements', icon: Gauge },
  { id: 'accounting', icon: BookOpen },
  { id: 'reports', icon: FileText },
  { id: 'settings', icon: Settings },
];
