import { lazy } from 'react';

// Lazy-load each template for performance
const MinimalLight = lazy(() => import('./MinimalLightWeb'));
const NeonEdge = lazy(() => import('./NeonEdgeWeb'));
const ElegantGold = lazy(() => import('./ElegantGoldWeb'));
const ModernDark = lazy(() => import('./ModernDarkWeb'));
const GradientPro = lazy(() => import('./GradientProWeb'));
const GlassCard = lazy(() => import('./GlassCardWeb'));
const CorporateSplit = lazy(() => import('./CorporateSplitWeb'));
const StartupStack = lazy(() => import('./StartupStackWeb'));
const CreativePortfolio = lazy(() => import('./CreativePortfolioWeb'));
const ClassicHorizontal = lazy(() => import('./ClassicHorizontalWeb'));

// Map template names/styleTypes → components
const TEMPLATE_MAP = {
  'Minimal Light': MinimalLight,
  'Modern Dark': ModernDark,
  'Gradient Pro': GradientPro,
  'Glass Card': GlassCard,
  'Corporate Split': CorporateSplit,
  'Neon Edge': NeonEdge,
  'Elegant Gold': ElegantGold,
  'Startup Stack': StartupStack,
  'Creative Portfolio': CreativePortfolio,
  'Classic Horizontal': ClassicHorizontal,
  
  // Legacy/alias mappings for backward compatibility
  'Glassmorphism': GlassCard,
  'Corporate Clean': CorporateSplit,
  'Neon Dark': NeonEdge,
  'Startup Blue': StartupStack,
  'Creative Bold': CreativePortfolio,
  'Classic Business': ClassicHorizontal,
};

export const getTemplateComponent = (template) => {
  const name = template?.name || template?.styleType || '';
  return TEMPLATE_MAP[name] || MinimalLight; // Fallback to MinimalLight
};
