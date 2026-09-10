'use client';

import * as React from 'react';
import {
  AlertTriangle,
  Lightbulb,
  Trash2,
  Droplets,
  AlertOctagon,
  Footprints,
  Trees,
  ShieldAlert,
  HelpCircle,
  LucideProps,
} from 'lucide-react';
import { ReportCategory } from './types';

const ICON_MAP: Record<ReportCategory, React.ComponentType<LucideProps>> = {
  pothole: AlertTriangle,
  lighting: Lightbulb,
  waste: Trash2,
  drainage: Droplets,
  signage: AlertOctagon,
  accessibility: Footprints,
  greenery: Trees,
  vandalism: ShieldAlert,
  other: HelpCircle,
};

interface CategoryIconProps extends LucideProps {
  category: ReportCategory;
}

export function CategoryIcon({ category, ...props }: CategoryIconProps) {
  const IconComponent = ICON_MAP[category] || HelpCircle;
  return <IconComponent {...props} />;
}
