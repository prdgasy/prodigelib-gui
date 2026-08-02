import { IS_DEBUG } from "../index";

export function debugLog(arg: any) {
  if (IS_DEBUG) {
    console.log('[GUILIB DEBUG]', arg);
  }
}