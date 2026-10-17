import type { CreatableBlock } from '../types';

export type CreateMenuGroupId =
  | 'docs'
  | 'organization'
  | 'design'
  | 'data'
  | 'comms'
  | 'tasks'
  | 'ai'
  | 'other';

export type CreateMenuGroup = {
  id: CreateMenuGroupId | 'recent';
  label: string;
  tagline: string;
};

export const CREATE_MENU_GROUPS: readonly CreateMenuGroup[] = [
  { id: 'ai', label: 'AI', tagline: 'Put agents to work on your money' },
  { id: 'docs', label: 'Research', tagline: 'Write theses and journal trades' },
  { id: 'data', label: 'Analysis', tagline: 'Model, track and compare' },
  {
    id: 'tasks',
    label: 'Follow-ups',
    tagline: 'Never miss a date or decision',
  },
  {
    id: 'organization',
    label: 'Organize',
    tagline: 'Keep research together',
  },
  { id: 'comms', label: 'Email', tagline: 'Reach brokers and advisers' },
  { id: 'design', label: 'Design', tagline: 'Diagram, sketch, design' },
  { id: 'other', label: 'Other', tagline: 'Everything else' },
];

export type CreateMenuDetails = {
  group: CreateMenuGroupId;
  /** One line under the title: what the thing actually is. */
  tagline: string;
  /** A 10–20-word description for the detailed launcher. */
  details: string;
  /** Things people typically make with it. */
  examples: readonly string[];
};

/**
 * Keyed by label rather than block name: Message and Channel share the
 * `channel` block, and the two Agent entries (one per agents flag) are never
 * both shown.
 */
const DETAILS: Record<string, CreateMenuDetails> = {
  Document: {
    group: 'docs',
    tagline: 'Thesis, journal entry or research note',
    details:
      'A rich document for investment theses, trade journal entries and earnings notes, with tables, mentions, comments and AI editing.',
    examples: ['Investment thesis', 'Trade journal', 'Earnings notes'],
  },
  Snippet: {
    group: 'docs',
    tagline: 'Reusable template for your writing',
    details:
      'Save reusable templates, checklists and replies so you can quickly add familiar content to new documents.',
    examples: ['Doc template', 'Checklist', 'Canned reply'],
  },
  Code: {
    group: 'other',
    tagline: 'Code file with syntax highlighting',
    details:
      'A standalone source file for scripts, queries and config, in whatever language you need.',
    examples: ['Python script', 'SQL query', 'Config file'],
  },
  Folder: {
    group: 'organization',
    tagline: 'Group research and documents',
    details:
      'Keep theses, models and statements together by company, sector or tax year.',
    examples: ['Tech stocks', 'Tax year 2026', 'Broker statements'],
  },
  Canvas: {
    group: 'design',
    tagline: 'Whiteboard for diagrams and sketches',
    details:
      'An infinite canvas for flowcharts, mind maps, architecture diagrams and freeform brainstorming.',
    examples: ['Flowchart', 'Mind map', 'Architecture diagram'],
  },
  Design: {
    group: 'design',
    tagline: 'Figma-compatible design editor',
    details:
      'Create interface mockups and graphics with frames and vector shapes, then save your work as a Figma file.',
    examples: ['App mockup', 'Social graphic', 'Design system'],
  },
  Database: {
    group: 'data',
    tagline: 'Watchlists and logs in tables or boards',
    details:
      'Track stocks and trades as structured records with custom fields, then view them as a table or a stage board.',
    examples: ['Watchlist', 'Trade log', 'Research pipeline'],
  },
  Spreadsheet: {
    group: 'data',
    tagline: 'Models and trackers with formulas',
    details:
      'An Excel-style workbook with formulas and AI-assisted editing for valuation models, dividend trackers and position sizing.',
    examples: ['DCF model', 'Dividend tracker', 'Position sizing'],
  },
  Form: {
    group: 'data',
    tagline: 'Collect responses',
    details:
      'Build a form to collect feedback, requests or survey answers, with every response saved into a database.',
    examples: ['Survey', 'Intake form', 'Feedback'],
  },
  'Photoshop file': {
    group: 'design',
    tagline: 'Layered image editing',
    details:
      'Create and edit layered images for photo edits, composites and graphics, then save your work as a Photoshop file.',
    examples: ['Photo edit', 'Composite', 'Banner'],
  },
  'Illustrator file': {
    group: 'design',
    tagline: 'Vector artwork',
    details:
      'Create scalable logos, icons and illustrations on artboards, then save your vector artwork as an Illustrator file.',
    examples: ['Logo', 'Illustration', 'Icon set'],
  },
  Email: {
    group: 'comms',
    tagline: 'Compose from your connected inbox',
    details:
      'Write to your broker, adviser or accountant from your connected email account, with AI help drafting.',
    examples: [
      'Question for my broker',
      'Statement to accountant',
      'Fee dispute',
    ],
  },
  Message: {
    group: 'comms',
    tagline: 'Quick DM to a person or group',
    details:
      'Send a direct message to one or more teammates without setting up a channel.',
    examples: ['Quick question', 'Heads-up', 'Group DM'],
  },
  Channel: {
    group: 'comms',
    tagline: 'Ongoing space for a team or topic',
    details:
      'Keep a team, project or topic in one shared conversation, with threaded discussions and files everyone can find.',
    examples: ['#design', '#launch', '#support'],
  },
  Call: {
    group: 'comms',
    tagline: 'Start an audio or video call',
    details:
      'Jump into a call right away and invite teammates or external guests.',
    examples: ['Quick sync', 'Pairing', 'Customer call'],
  },
  Task: {
    group: 'tasks',
    tagline: 'Follow-up with a due date',
    details:
      'Capture an investing to-do, set a due date and tick it off when done.',
    examples: [
      'Review NVDA before earnings',
      'Rebalance in Q1',
      'Gather tax documents',
    ],
  },
  Project: {
    group: 'tasks',
    tagline: 'Group tasks toward a shared goal',
    details:
      'Collect related tasks under one goal and follow their progress together.',
    examples: ['Launch', 'Quarterly goal', 'Migration'],
  },
  Reminder: {
    group: 'tasks',
    tagline: 'Nudge yourself at a time you pick',
    details:
      'Ask Fintail to remind you about a date that matters, with no document or task required.',
    examples: [
      'Check ex-dividend date',
      'Review a stop-loss',
      'Top up retirement account',
    ],
  },
  Agent: {
    group: 'ai',
    tagline: 'AI analyst for your portfolio and the markets',
    details:
      'Start an AI session that reads your holdings, prices, filings and news to explain what is happening. Information, not advice.',
    examples: [
      'Why did my portfolio drop?',
      'Compare NVDA and AMD',
      'Backtest a strategy',
    ],
  },
  Routine: {
    group: 'ai',
    tagline: 'Scheduled AI that watches your money',
    details:
      'Run an agent on a schedule or trigger, such as a morning brief, a weekly portfolio review or an earnings watch on what you own.',
    examples: ['Morning brief', 'Weekly review', 'Earnings watch'],
  },
  Skill: {
    group: 'ai',
    tagline: 'Your investing rules for the AI',
    details:
      'Teach agents your strategy, risk limits and checklists so every analysis follows the way you invest.',
    examples: ['My investing rules', 'Risk checklist', 'Thesis format'],
  },
};

export function createMenuDetails(
  item: CreatableBlock
): CreateMenuDetails | undefined {
  return DETAILS[item.label];
}

/** The one-line description a variant shows under the title. */
export function createMenuTagline(item: CreatableBlock): string {
  const fallback =
    typeof item.description === 'function'
      ? item.description()
      : item.description;
  return createMenuDetails(item)?.tagline ?? item.launcherHint ?? fallback;
}

/** Extra text that search should match on, beyond the block's own fields. */
export function createMenuSearchText(item: CreatableBlock): string[] {
  const details = createMenuDetails(item);
  if (!details) return [];
  const group = CREATE_MENU_GROUPS.find((g) => g.id === details.group);
  return [
    details.tagline,
    details.details,
    ...details.examples,
    group?.label,
  ].filter((text): text is string => !!text);
}

export type CreateMenuSection = {
  group: CreateMenuGroup;
  items: CreatableBlock[];
};

/** Splits items into the fixed groups, keeping each group's catalog order. */
export function groupCreateMenuItems(
  items: readonly CreatableBlock[]
): CreateMenuSection[] {
  const order = Object.keys(DETAILS);
  const rank = (item: CreatableBlock) => {
    const index = order.indexOf(item.label);
    return index === -1 ? order.length : index;
  };

  const sections = CREATE_MENU_GROUPS.map((group) => ({
    group,
    items: items
      .filter(
        (item) => (createMenuDetails(item)?.group ?? 'other') === group.id
      )
      .sort((a, b) => rank(a) - rank(b)),
  }));
  return sections.filter((section) => section.items.length > 0);
}

/** Recent choices appear first and remain available in their categories. */
export function groupRecentCreateMenuItems(
  items: CreatableBlock[],
  recentItems: CreatableBlock[]
): CreateMenuSection[] {
  const recent = recentItems.filter((item) => items.includes(item));
  const categories = groupCreateMenuItems(items);
  return recent.length
    ? [
        {
          group: { id: 'recent', label: 'Recents', tagline: 'Recently used' },
          items: recent,
        },
        ...categories,
      ]
    : categories;
}

/** Two-to-four word captions for compact cards. */
const SHORT_TAGLINES: Record<string, string> = {
  Document: 'Collaborative writing',
  Snippet: 'Reusable template',
  Code: 'Syntax-highlighted file',
  Folder: 'Keep files together',
  Canvas: 'Diagrams & whiteboard',
  Design: 'Figma-compatible editor',
  Spreadsheet: 'Formulas & sheets',
  Database: 'Tables & boards',
  Email: 'Compose from inbox',
  Message: 'Quick DM',
  Channel: 'Team discussion',
  Call: 'Audio or video',
  Task: 'Track work',
  Project: 'Organize related tasks',
  Reminder: 'Nudge yourself later',
  Agent: 'Dedicated agent session',
  Routine: 'Automate recurring work',
  Skill: 'Reusable agent instructions',
  Form: 'Collect responses',
  'Photoshop file': 'Layered image editing',
  'Illustrator file': 'Vector artwork',
};

export function createMenuShortTagline(item: CreatableBlock): string {
  return SHORT_TAGLINES[item.label] ?? createMenuTagline(item);
}
