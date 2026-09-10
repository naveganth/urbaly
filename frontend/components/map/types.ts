export type ReportCategory =
  | 'pothole' // Buraco / Asfalto danificado
  | 'lighting' // Iluminação pública apagada/quebrada
  | 'waste' // Lixo / Entulho acumulado
  | 'drainage' // Alagamento / Bueiro entupido
  | 'signage' // Sinalização / Semáforo quebrado
  | 'accessibility' // Calçada quebrada / Acessibilidade
  | 'greenery' // Árvore caída / Poda necessária
  | 'vandalism' // Vandalismo / Patrimônio danificado
  | 'other'; // Outro tipo de problema

export type ReportUrgency = 'low' | 'medium' | 'high' | 'critical';

export type ReportStatus = 'open' | 'investigating' | 'resolved';

export interface StreetReport {
  id: string;
  title: string;
  description: string;
  category: ReportCategory;
  urgency: ReportUrgency;
  rating: number; // 1 to 5 (gravidade do problema)
  coordinates: [number, number]; // [lng, lat]
  address: string;
  neighborhood?: string;
  referencePoint?: string;
  images: string[]; // Suporte a múltiplas fotos da ocorrência
  imageUrl?: string; // Retrocompatibilidade com foto única
  createdAt: string;
  status: ReportStatus;
  upvotes: number;
  reportedBy?: string;
  isAnonymous?: boolean;
}

export interface CategoryInfo {
  id: ReportCategory;
  label: string;
  iconName: string;
  color: string;
  bgLight: string;
  borderColor: string;
  description: string;
}

export const CATEGORIES: Record<ReportCategory, CategoryInfo> = {
  pothole: {
    id: 'pothole',
    label: 'Buraco / Asfalto',
    iconName: 'AlertTriangle',
    color: 'text-amber-500 dark:text-amber-400',
    bgLight: 'bg-amber-500/15 dark:bg-amber-500/20',
    borderColor: 'border-amber-500/30 dark:border-amber-500/40',
    description: 'Crateras, desníveis, asfalto cedendo ou erosão na pista',
  },
  lighting: {
    id: 'lighting',
    label: 'Iluminação Pública',
    iconName: 'Lightbulb',
    color: 'text-yellow-500 dark:text-yellow-400',
    bgLight: 'bg-yellow-500/15 dark:bg-yellow-500/20',
    borderColor: 'border-yellow-500/30 dark:border-yellow-500/40',
    description: 'Poste apagado, lâmpada piscando ou fiação exposta',
  },
  waste: {
    id: 'waste',
    label: 'Lixo / Entulho',
    iconName: 'Trash2',
    color: 'text-emerald-500 dark:text-emerald-400',
    bgLight: 'bg-emerald-500/15 dark:bg-emerald-500/20',
    borderColor: 'border-emerald-500/30 dark:border-emerald-500/40',
    description: 'Descarte irregular, lixeira danificada ou entulho na calçada',
  },
  drainage: {
    id: 'drainage',
    label: 'Alagamento / Bueiro',
    iconName: 'Droplets',
    color: 'text-sky-500 dark:text-sky-400',
    bgLight: 'bg-sky-500/15 dark:bg-sky-500/20',
    borderColor: 'border-sky-500/30 dark:border-sky-500/40',
    description: 'Bueiro entupido, água empossada ou galeria transbordando',
  },
  signage: {
    id: 'signage',
    label: 'Sinalização / Trânsito',
    iconName: 'AlertOctagon',
    color: 'text-rose-500 dark:text-rose-400',
    bgLight: 'bg-rose-500/15 dark:bg-rose-500/20',
    borderColor: 'border-rose-500/30 dark:border-rose-500/40',
    description: 'Semáforo desligado, placa caída ou faixa apagada',
  },
  accessibility: {
    id: 'accessibility',
    label: 'Calçada / Acessibilidade',
    iconName: 'Footprints',
    color: 'text-purple-500 dark:text-purple-400',
    bgLight: 'bg-purple-500/15 dark:bg-purple-500/20',
    borderColor: 'border-purple-500/30 dark:border-purple-500/40',
    description: 'Piso tátil rompido, rampa obstruída ou calçada intransitável',
  },
  greenery: {
    id: 'greenery',
    label: 'Árvore / Praça',
    iconName: 'Trees',
    color: 'text-green-600 dark:text-green-400',
    bgLight: 'bg-green-600/15 dark:bg-green-600/20',
    borderColor: 'border-green-600/30 dark:border-green-600/40',
    description: 'Galhos sobre fiação, árvore com risco de queda ou mato alto',
  },
  vandalism: {
    id: 'vandalism',
    label: 'Vandalismo / Praça',
    iconName: 'ShieldAlert',
    color: 'text-orange-500 dark:text-orange-400',
    bgLight: 'bg-orange-500/15 dark:bg-orange-500/20',
    borderColor: 'border-orange-500/30 dark:border-orange-500/40',
    description: 'Ponto de ônibus quebrado, pichação ou praça depredada',
  },
  other: {
    id: 'other',
    label: 'Outro Problema',
    iconName: 'HelpCircle',
    color: 'text-slate-500 dark:text-slate-400',
    bgLight: 'bg-slate-500/15 dark:bg-slate-500/20',
    borderColor: 'border-slate-500/30 dark:border-slate-500/40',
    description: 'Qualquer outra demanda urbana não listada',
  },
};
