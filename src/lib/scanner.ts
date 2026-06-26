export type HtmlAnalysis = {
  requiresStudio: boolean;
  reasons: string[];
};

export function analyzeHtmlForStudioMode(html: string): HtmlAnalysis {
  const reasons: string[] = [];
  
  // Check for external GSAP or Anime.js
  if ((/gsap\.min\.js/i.test(html) || /gsap/i.test(html)) && /<script/i.test(html)) {
    reasons.push("GSAP library detected (Requires Studio Mode for perfect timing)");
  }
  if (/anime\.min\.js/i.test(html) || /animejs/i.test(html)) {
    reasons.push("Anime.js library detected");
  }

  // Check for complex external assets (fonts, images) that might trigger CORS issues in canvas
  if (/fonts\.googleapis\.com/i.test(html)) {
    reasons.push("External Google Fonts detected (CORS limitation)");
  }
  
  // Check for any external stylesheet or script that isn't inline
  const scriptRegex = /<script[^>]+src=["']([^"']+)["']/gi;
  let match;
  let hasExternalScript = false;
  while ((match = scriptRegex.exec(html)) !== null) {
    const src = match[1];
    if (src.startsWith('http') && !src.includes('gsap') && !src.includes('anime')) {
      hasExternalScript = true;
    }
  }
  if (hasExternalScript) {
    reasons.push("External JS scripts detected");
  }

  const imgRegex = /<img[^>]+src=["'](http[^"']+)["']/gi;
  if (imgRegex.test(html)) {
    reasons.push("External images detected (CORS limitation)");
  }

  // Determine if studio mode is heavily recommended
  const requiresStudio = reasons.length > 0;

  return { requiresStudio, reasons };
}
