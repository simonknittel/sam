import type { SeasonalDecorationProps } from "../../utils/types";

/**
 * The shapes are large and few, because the banner gives the ornament a box of
 * 112 pixels.
 */
export const NewYearHeroOrnament = ({ className }: SeasonalDecorationProps) => (
  <svg viewBox="0 0 24 24" aria-hidden className={className}>
    <path
      d="M5.8 4h2.6v5c0 1 2.6 1.6 2.6 4v6.5a1.2 1.2 0 0 1-1.2 1.2H3.8a1.2 1.2 0 0 1-1.2-1.2V13c0-2.4 3.2-3 3.2-4Z"
      fill="#15803d"
    />
    <rect x="5.3" y="2" width="3.6" height="3.4" rx="0.9" fill="#fbbf24" />
    <rect x="3.4" y="14.2" width="6.8" height="3.8" rx="0.6" fill="#fef3c7" />

    <g fill="#fbbf24">
      <path d="M12.5 8.9h4.2l-.6 5.6a1.5 1.5 0 0 1-3 0Z" />
      <path d="M17.9 8.9h4.2l-.6 5.6a1.5 1.5 0 0 1-3 0Z" />
    </g>

    <g fill="#fef3c7">
      <rect x="14.1" y="14.4" width="1" height="5.3" />
      <rect x="12.8" y="19.6" width="3.6" height="1.1" rx="0.55" />
      <rect x="19.5" y="14.4" width="1" height="5.3" />
      <rect x="18.2" y="19.6" width="3.6" height="1.1" rx="0.55" />
    </g>
  </svg>
);
