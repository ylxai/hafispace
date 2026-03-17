"use client";

interface BrandProps {
  variant?: "hafispace" | "hafiview" | "hafiselect";
  size?: "sm" | "md" | "lg" | "xl";
  withIcon?: boolean;
  className?: string;
}

const iconSvg = (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    className="inline-block"
    stroke="currentColor" 
    strokeWidth={1.5}
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
    <path d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const variantStyles = {
  hafispace: {
    text: "Hafispace",
    tagline: "Admin Dashboard",
    gradient: "from-violet-900 via-purple-800 to-indigo-800",
  },
  hafiview: {
    text: "HafiView",
    tagline: null,
    gradient: "from-rose-700 via-pink-600 to-fuchsia-700",
  },
  hafiselect: {
    text: "HafiSelect",
    tagline: "Pilih foto favoritmu!",
    gradient: "from-orange-700 via-amber-600 to-rose-700",
  },
};

const sizeStyles = {
  sm: { text: "text-xl", icon: "w-4 h-4", tagline: "text-[10px]" },
  md: { text: "text-2xl", icon: "w-5 h-5", tagline: "text-xs" },
  lg: { text: "text-3xl", icon: "w-6 h-6", tagline: "text-sm" },
  xl: { text: "text-4xl", icon: "w-7 h-7", tagline: "text-base" },
};

export function Brand({ 
  variant = "hafispace", 
  size = "md", 
  withIcon = true,
  className = "" 
}: BrandProps) {
  const config = variantStyles[variant];
  const sizes = sizeStyles[size];

  return (
    <div className={`flex flex-col ${className}`}>
      <div className="flex items-center gap-1.5">
        {withIcon && (
          <span className={`${sizes.icon} bg-gradient-to-br ${config.gradient} bg-clip-text text-transparent`}>
            {iconSvg}
          </span>
        )}
        <span 
          className={`${sizes.text} font-[family-name:var(--font-bonheur)] bg-gradient-to-br ${config.gradient} bg-clip-text text-transparent`}
        >
          {config.text}
        </span>
      </div>
      {config.tagline && (
        <span className={`${sizes.tagline} text-slate-400 font-medium tracking-wide`}>
          {config.tagline}
        </span>
      )}
    </div>
  );
}
