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
    text: "HafiSpace",
    color: "#000000",
    defaultWithIcon: false,
  },
  hafiview: {
    text: "HafiView",
    color: "#be1854",
    defaultWithIcon: false,
  },
  hafiselect: {
    text: "HafiSelect",
    color: "#c2410c",
    defaultWithIcon: false,
  },
};

const sizeStyles = {
  sm: { text: "text-2xl", icon: "w-5 h-5" },
  md: { text: "text-3xl", icon: "w-6 h-6" },
  lg: { text: "text-4xl", icon: "w-7 h-7" },
  xl: { text: "text-5xl", icon: "w-8 h-8" },
};

export function Brand({ 
  variant = "hafispace", 
  size = "md", 
  withIcon,
  className = "" 
}: BrandProps) {
  const config = variantStyles[variant];
  const sizes = sizeStyles[size];
  const showIcon = withIcon ?? config.defaultWithIcon;

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {showIcon && (
        <span 
          className={sizes.icon}
          style={{ color: config.color }}
        >
          {iconSvg}
        </span>
      )}
      <span 
        className={`${sizes.text} font-[family-name:var(--font-bonheur)]`}
        style={{ color: config.color }}
      >
        {config.text}
      </span>
    </div>
  );
}
