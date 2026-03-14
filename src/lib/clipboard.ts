/**
 * Cross-platform clipboard copy.
 * iOS Safari requires either a direct user gesture *and* HTTPS for the
 * Clipboard API, or the old execCommand fallback via a temporary textarea.
 */
export async function copyText(text: string): Promise<void> {
  // Modern Clipboard API — works on iOS 13.4+, all desktop browsers
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Permission denied or lost gesture context — fall through
    }
  }

  // execCommand fallback — reliable on iOS Safari and older browsers
  const el = document.createElement('textarea');
  el.value = text;
  el.setAttribute('readonly', '');
  el.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none';
  document.body.appendChild(el);
  el.focus();
  el.setSelectionRange(0, text.length);
  document.execCommand('copy');
  document.body.removeChild(el);
}
