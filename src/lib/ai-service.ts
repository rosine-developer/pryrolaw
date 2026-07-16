// AI prompt templates — used in the AI Workspace UI.
// Actual AI calls go through the Express backend (never from the browser).

export const AI_PROMPT_TEMPLATES = [
  {
    category: 'Case Analysis',
    prompts: [
      'Summarize this case and its current status.',
      'Identify any missing information I should gather.',
      'Create a chronological timeline of key events.',
      'What are the main legal issues in this case?',
    ],
  },
  {
    category: 'Document Assistance',
    prompts: [
      'Summarize the key documents in this case.',
      'Explain a clause I am unsure about (I will paste it).',
      'Draft a legal letter based on the case context.',
      'Suggest redlines for the attached contract language.',
    ],
  },
  {
    category: 'Legal Research',
    prompts: [
      'Help me understand this legal issue and what to research.',
      'What statutes or doctrines might apply here?',
      'What arguments could the opposing party raise?',
      'Suggest a research plan for this matter.',
    ],
  },
];
