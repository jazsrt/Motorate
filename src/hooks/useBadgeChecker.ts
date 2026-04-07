/*
 * Badge awards are now handled entirely by DB triggers.
 * This hook is kept as a no-op for backward compatibility with App.tsx.
 */

export function useBadgeChecker() {
  // No-op — DB triggers handle all badge awards automatically
}
