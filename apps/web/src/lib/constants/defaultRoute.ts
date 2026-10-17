import { FINTAIL_DEMO } from '@core/constant/featureFlags';

/** Where signed-in visitors land; the demo opens on its sample Portfolio. */
export const DEFAULT_ROUTE = FINTAIL_DEMO ? '/portfolio' : '/home';
