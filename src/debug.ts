export const IS_DEBUG = false;

export function debugLog(arg: any) {
  if (IS_DEBUG) {
    console.log('[GUILIB DEBUG]', arg);
  }
}