import { buttonClasses } from '@ui';
import { Show } from 'solid-js';
import { SettingsCard, SettingsPage, SettingsRow } from '../primitives';

export function DesktopAppDownload() {
  return (
    <SettingsPage
      title="Desktop App"
      description="Get Fintail for your computer."
    >
      <SettingsCard>
        <SettingsRow
          label="Download Fintail"
          description="Get the latest release for macOS or Linux."
          stackOnNarrow
        >
          <a
            href="https://github.com/macro-inc/macro/releases/latest"
            target="_blank"
            rel="noopener noreferrer"
            class={buttonClasses({ variant: 'outline', size: 'md' })}
          >
            Download desktop app
          </a>
        </SettingsRow>
      </SettingsCard>
    </SettingsPage>
  );
}

export function DesktopAppInfo(props: { version: string; buildDate?: Date }) {
  return (
    <SettingsPage
      title="Desktop App"
      description="Your installed version of Fintail."
    >
      <SettingsCard>
        <SettingsRow label="Version">
          <span class="text-sm text-ink-muted">{props.version}</span>
        </SettingsRow>
        <SettingsRow label="Build date" stackOnNarrow>
          <span class="text-sm text-ink-muted">
            <Show when={props.buildDate} fallback="Not available">
              {(date) => (
                <time datetime={date().toISOString()}>
                  {date().toLocaleString(undefined, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </time>
              )}
            </Show>
          </span>
        </SettingsRow>
      </SettingsCard>
    </SettingsPage>
  );
}
