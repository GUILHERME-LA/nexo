import { Link } from "@tanstack/react-router";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  linkTo?: string;
  linkLabel?: string;
  className?: string;
}

export function SectionHeader({
  title,
  subtitle,
  linkTo,
  linkLabel = "Ver todas →",
  className = "",
}: SectionHeaderProps) {
  return (
    <div className={`max-w-[1440px] mx-auto px-4 md:px-12 pt-10 pb-2 ${className}`}>
      <div className="flex items-end gap-4 animate-load-in">
        {/* Gold accent bar */}
        <div
          className="section-accent-bar"
          aria-hidden
        />
        <div className="flex-1 flex items-baseline flex-wrap gap-2.5">
          <h2
            className="font-serif font-bold text-[22px] md:text-[28px] leading-none tracking-tight"
            style={{ color: "var(--ink)" }}
          >
            {title}
          </h2>
          {subtitle && (
            <span
              className="text-[11px] uppercase tracking-[0.15em]"
              style={{ fontFamily: "var(--mono)", color: "var(--ink-faint)" }}
            >
              · {subtitle}
            </span>
          )}
        </div>
        {linkTo && (
          <Link
            to={linkTo as any}
            className="text-[10px] font-bold uppercase tracking-[0.2em] transition-colors whitespace-nowrap"
            style={{
              fontFamily: "var(--mono)",
              color: "var(--radar)",
              textDecoration: "none",
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--radar)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--radar)")}
          >
            {linkLabel}
          </Link>
        )}
      </div>
      {/* Rule */}
      <div
        className="h-px mt-4"
        style={{ background: "var(--border-editorial)" }}
      />
    </div>
  );
}
