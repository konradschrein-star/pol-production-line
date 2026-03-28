/**
 * Test Fixtures: Sample News Scripts
 *
 * Reusable news scripts for testing the analysis pipeline.
 */

export const testScripts = {
  /**
   * Short script (1 sentence)
   * Use for: Quick tests, basic validation
   */
  short: 'Breaking news: Short test script.',

  /**
   * Medium script (2-3 sentences)
   * Use for: Standard workflow tests
   */
  medium:
    'Breaking news: Medium-length test script with multiple sentences. ' +
    'This tests moderate content processing. ' +
    'Expected to generate 2-3 scenes.',

  /**
   * Long script (500+ words)
   * Use for: Stress testing, performance validation
   */
  long:
    'Breaking news: '.repeat(50) +
    'Long test script for stress testing. ' +
    'This should generate 6-10 scenes depending on AI analysis.',

  /**
   * Script with abbreviations
   * Use for: Testing text normalization
   */
  withAbbreviations:
    'The USA and FBI announced cooperation with NATO. ' +
    'The CEO of IBM spoke at the UN about AI regulations.',

  /**
   * Script with special characters
   * Use for: Testing sanitization
   */
  specialCharacters: 'Test with emojis: 🚀 🎥 📰 and special chars: é à ñ ü',

  /**
   * Script with potential XSS
   * Use for: Security testing
   */
  malicious: '<script>alert("xss")</script> Breaking news: Malicious content test.',

  /**
   * Multi-paragraph script
   * Use for: Scene segmentation testing
   */
  multiParagraph: `Breaking news from Washington: The President announced new economic policies today.

The legislation includes tax reforms and infrastructure spending.

Economists predict significant impact on markets.

Public reaction has been mixed, with supporters praising the initiative.`,

  /**
   * Script with dialogue
   * Use for: Quotation handling
   */
  withDialogue: `Breaking news: The mayor stated, "We are committed to transparency."

Officials responded: "This is a step forward for our community."

Critics argue: "More details are needed before we can support this."`,

  /**
   * News script with numbers and dates
   * Use for: Data extraction testing
   */
  withNumbers:
    'On March 28, 2026, the stock market rose by 3.5%. ' +
    'Over 1,000 companies reported earnings. ' +
    'The S&P 500 reached 4,800 points.',
};

/**
 * Expected analysis results for validation
 */
export const expectedResults = {
  short: {
    minScenes: 1,
    maxScenes: 2,
    hasAvatarScript: true,
  },
  medium: {
    minScenes: 2,
    maxScenes: 4,
    hasAvatarScript: true,
  },
  long: {
    minScenes: 6,
    maxScenes: 12,
    hasAvatarScript: true,
  },
};
