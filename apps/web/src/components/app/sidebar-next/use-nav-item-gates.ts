import { useCalendarUiFlag } from '@app/features/calendar/hooks/use-calendar-ui-flag';
import { useFeatureFlag } from '@app/lib/analytics/posthog';
import {
  ENABLE_CALLS,
  ENABLE_FINTAIL,
  enableCalendarScheduling,
  enableCrm,
  enableTasksReviews,
} from '@core/constant/featureFlags';
import { type Accessor, createMemo } from 'solid-js';
import type { NavItemGates } from './nav-items';
import { useSidebarPrefs } from './use-sidebar-prefs';

/**
 * Subscribes to feature flags so flags that resolve after mount reach the
 * rendered list. Shared by the sidebar's nav and the More menu so the two
 * agree about which apps exist.
 */
export function useNavItemGates(): Accessor<NavItemGates> {
  const calendar = useCalendarUiFlag();
  const scheduling = useFeatureFlag(enableCalendarScheduling);
  const crm = useFeatureFlag(enableCrm);
  const reviews = useFeatureFlag(enableTasksReviews);
  const { prefs } = useSidebarPrefs();

  return createMemo(() => ({
    showCalendar: calendar(),
    showScheduling: !ENABLE_FINTAIL && scheduling().enabled,
    showCustomers: !ENABLE_FINTAIL && crm().enabled,
    showCalls: !ENABLE_FINTAIL && ENABLE_CALLS,
    showReviews: !ENABLE_FINTAIL && reviews().enabled,
    showMessages: !ENABLE_FINTAIL,
    showAgents: !ENABLE_FINTAIL,
    prefs: prefs(),
  }));
}
