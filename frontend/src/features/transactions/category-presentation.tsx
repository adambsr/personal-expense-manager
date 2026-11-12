import {
  BadgeDollarSign,
  Briefcase,
  BusFront,
  ChartNoAxesCombined,
  CircleEllipsis,
  Clapperboard,
  Coffee,
  Gift,
  GraduationCap,
  HeartPulse,
  Home,
  Laptop,
  Lightbulb,
  Plane,
  Repeat,
  ShoppingBag,
  Sparkles,
  Store,
  Utensils,
  type LucideIcon,
} from "lucide-react";

const categoryPresentation = {
  "Food & Groceries": { icon: Utensils, color: "#ea580c", tint: "#fff7ed" },
  "Restaurants & Cafés": { icon: Coffee, color: "#b45309", tint: "#fffbeb" },
  Transportation: { icon: BusFront, color: "#2563eb", tint: "#eff6ff" },
  Shopping: { icon: ShoppingBag, color: "#7c3aed", tint: "#f5f3ff" },
  "Bills & Utilities": { icon: Lightbulb, color: "#ca8a04", tint: "#fefce8" },
  "Housing & Rent": { icon: Home, color: "#0891b2", tint: "#ecfeff" },
  "Health & Medical": { icon: HeartPulse, color: "#e11d48", tint: "#fff1f2" },
  Entertainment: { icon: Clapperboard, color: "#db2777", tint: "#fdf2f8" },
  Education: { icon: GraduationCap, color: "#4f46e5", tint: "#eef2ff" },
  Travel: { icon: Plane, color: "#0d9488", tint: "#f0fdfa" },
  "Personal Care": { icon: Sparkles, color: "#9333ea", tint: "#faf5ff" },
  Subscriptions: { icon: Repeat, color: "#6366f1", tint: "#eef2ff" },
  "Other Expenses": { icon: CircleEllipsis, color: "#64748b", tint: "#f1f5f9" },
  Salary: { icon: Briefcase, color: "#059669", tint: "#ecfdf5" },
  Freelance: { icon: Laptop, color: "#0284c7", tint: "#f0f9ff" },
  Business: { icon: Store, color: "#16a34a", tint: "#f0fdf4" },
  Investments: { icon: ChartNoAxesCombined, color: "#0f766e", tint: "#f0fdfa" },
  Gifts: { icon: Gift, color: "#c026d3", tint: "#fdf4ff" },
  "Other Income": { icon: BadgeDollarSign, color: "#4f46e5", tint: "#eef2ff" },
} satisfies Record<string, { icon: LucideIcon; color: string; tint: string }>;

const fallbackPresentation = { icon: CircleEllipsis, color: "#64748b", tint: "#f1f5f9" };

function getCategoryPresentation(name: string) {
  return categoryPresentation[name as keyof typeof categoryPresentation] ?? fallbackPresentation;
}

export function CategoryIcon({ name, className = "" }: { name: string; className?: string }) {
  const presentation = getCategoryPresentation(name);
  const Icon = presentation.icon;

  return (
    <span
      aria-hidden="true"
      className={`transaction-category-icon ${className}`}
      style={{ color: presentation.color, backgroundColor: presentation.tint, borderColor: `${presentation.color}24` }}
    >
      <Icon />
    </span>
  );
}

export function CategoryBadge({ name }: { name: string }) {
  return <span className="transaction-category-badge"><CategoryIcon name={name} /><span>{name}</span></span>;
}
