import { setupWorker } from "msw/browser";
import { handlers } from "./handlers";

/**
 * MSW browser worker setup
 * Intercepts network requests at the service worker level
 */
export const worker = setupWorker(...handlers);
