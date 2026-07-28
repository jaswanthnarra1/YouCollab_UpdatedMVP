import { Children, cloneElement, isValidElement, type CSSProperties, type ReactElement, type ReactNode } from "react";

interface HeroShineTextProps {
  children: ReactNode;
  className?: string;
}

/**
 * Wraps heading content with a subtle, looping glossy light sweep. The real
 * text underneath is untouched (same color/gradient/typography); a
 * duplicate, aria-hidden copy is layered on top with a wide soft-white
 * gradient clipped to the same glyph shapes and blended in via
 * `mix-blend-mode: screen`. Any color/gradient a child sets inline (e.g. a
 * gradient word) is neutralized only in this overlay copy, so the sweep
 * reads uniformly across every word without fighting the real gradient.
 *
 * ponytail: pure-white glyphs are already at maximum luminance, so a screen
 * blend can't visibly brighten their fill directly — the sweep still reads
 * on them via the blurred edge bleed. Only the accent-colored word (which
 * has headroom below max brightness) shows a fully visible brightening
 * pass. This is a color-math ceiling, not a missed effect.
 */
export function HeroShineText({ children, className }: HeroShineTextProps) {
  const neutralized = Children.map(children, (child) => {
    if (!isValidElement(child)) return child;
    const el = child as ReactElement<{ style?: CSSProperties }>;
    return cloneElement(el, {
      style: {
        ...el.props.style,
        backgroundImage: "none",
        color: "inherit",
        WebkitTextFillColor: "inherit",
      },
    });
  });

  return (
    <span className={`relative inline-block ${className ?? ""}`}>
      {children}
      <span
        aria-hidden="true"
        className="hero-shine-overlay absolute inset-0 pointer-events-none select-none animate-hero-shine motion-reduce:hidden"
      >
        {neutralized}
      </span>
    </span>
  );
}
