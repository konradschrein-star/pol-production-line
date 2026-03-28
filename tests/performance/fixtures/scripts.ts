/**
 * Test Script Fixtures for Performance Testing
 *
 * Provides pre-defined scripts of different lengths for load testing.
 * These scripts are designed to generate predictable numbers of scenes.
 */

export const testScripts = {
  /**
   * Short script (~10 seconds video)
   * Generates 2 scenes
   */
  short: `Breaking news tonight. The city council has approved the new budget. Back to you in the studio.`,

  /**
   * Medium script (~30 seconds video)
   * Generates 4-5 scenes
   */
  medium: `
    Good evening, I'm bringing you tonight's top stories.

    In local news, the city council voted 7 to 2 in favor of the new budget proposal.

    The budget includes increased funding for public transportation and education.

    Mayor Johnson praised the council's decision, calling it a step forward for the community.

    More details will be available on our website later tonight.
  `.trim(),

  /**
   * Long script (~60 seconds video)
   * Generates 8-10 scenes
   */
  long: `
    Good evening, I'm bringing you tonight's top stories from around the nation.

    In Washington, lawmakers have reached a bipartisan agreement on infrastructure spending.

    The bill allocates 500 billion dollars over the next five years for roads, bridges, and public transit.

    President Smith is expected to sign the legislation by the end of the week.

    In economic news, the stock market reached record highs today.

    The Dow Jones Industrial Average closed up 300 points, driven by strong earnings reports.

    Tech stocks led the gains, with major companies reporting better-than-expected quarterly results.

    Analysts say investor confidence remains strong despite recent inflation concerns.

    And finally, in sports, the championship game is set for this Sunday.

    Stay tuned for more updates throughout the evening.
  `.trim(),

  /**
   * Very long script (~120 seconds video)
   * Generates 16-20 scenes
   */
  veryLong: `
    Good evening, I'm bringing you tonight's comprehensive news coverage.

    We begin with breaking news from the nation's capital.

    Lawmakers have reached a historic bipartisan agreement on infrastructure spending.

    The bill allocates 500 billion dollars over the next five years.

    Funding will go towards roads, bridges, public transit, and broadband expansion.

    President Smith called the agreement a major victory for the American people.

    Congressional leaders from both parties praised the compromise.

    The legislation is expected to create thousands of jobs across the country.

    In international news, diplomatic talks continue in Geneva.

    Officials are discussing trade agreements and climate change initiatives.

    Foreign ministers from 20 nations are attending the summit.

    Early reports suggest progress on key issues.

    Meanwhile, in economic news, the stock market reached new record highs.

    The Dow Jones Industrial Average closed up 300 points today.

    Tech stocks led the gains with strong earnings reports.

    Major companies exceeded Wall Street expectations for the quarter.

    Analysts attribute the rally to improving economic indicators.

    Consumer confidence surveys show optimism about the economy.

    Unemployment rates have fallen to their lowest levels in years.

    Retail sales figures also show robust consumer spending.

    However, some economists caution about potential inflation risks.

    The Federal Reserve is monitoring the situation closely.

    In sports, the championship game is set for this Sunday.

    Fans are eagerly anticipating the matchup between the two top teams.

    And that concludes tonight's news coverage.
  `.trim(),

  /**
   * Minimal script for stress testing (fast processing)
   * Generates 1 scene
   */
  minimal: `Breaking news.`,
};

/**
 * Generate random test script of specified length
 */
export function generateRandomScript(sentenceCount: number): string {
  const sentences = [
    'Breaking news from the capital.',
    'The mayor announced new policies today.',
    'Stock markets reached record highs.',
    'Weather forecasts predict sunny conditions.',
    'Sports teams prepare for championship.',
    'Technology companies report strong earnings.',
    'Education reforms are under discussion.',
    'Healthcare system faces new challenges.',
    'Transportation infrastructure gets funding boost.',
    'Environmental initiatives gain momentum.',
  ];

  return Array(sentenceCount)
    .fill(null)
    .map(() => sentences[Math.floor(Math.random() * sentences.length)])
    .join(' ');
}

/**
 * Script metadata for benchmarking
 */
export const scriptMetadata = {
  short: {
    expectedScenes: 2,
    expectedDuration: 10,
    description: 'Short script for quick testing',
  },
  medium: {
    expectedScenes: 5,
    expectedDuration: 30,
    description: 'Medium script for standard testing',
  },
  long: {
    expectedScenes: 8,
    expectedDuration: 60,
    description: 'Long script for stress testing',
  },
  veryLong: {
    expectedScenes: 16,
    expectedDuration: 120,
    description: 'Very long script for maximum load',
  },
  minimal: {
    expectedScenes: 1,
    expectedDuration: 5,
    description: 'Minimal script for rapid iteration',
  },
};
