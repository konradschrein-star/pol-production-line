/**
 * Script Segmenter Tests
 * Tests intelligent sentence splitting and narrative position assignment
 */

import { segmentScript, getSentenceCount } from '../script-segmenter';

describe('Script Segmenter', () => {
  describe('Basic Sentence Splitting', () => {
    test('splits simple sentences', () => {
      const script = 'Tesla announced record deliveries. The company shipped 500,000 vehicles.';
      const result = segmentScript(script);

      expect(result).toHaveLength(2);
      expect(result[0].text).toBe('Tesla announced record deliveries.');
      expect(result[1].text).toBe('The company shipped 500,000 vehicles.');
    });

    test('handles single sentence', () => {
      const script = 'This is a test sentence.';
      const result = segmentScript(script);

      expect(result).toHaveLength(1);
      expect(result[0].text).toBe('This is a test sentence.');
    });

    test('handles multiple sentence types (., !, ?)', () => {
      const script = 'Markets are up. Is this sustainable? Probably not!';
      const result = segmentScript(script);

      expect(result).toHaveLength(3);
      expect(result[0].text).toBe('Markets are up.');
      expect(result[1].text).toBe('Is this sustainable?');
      expect(result[2].text).toBe('Probably not!');
    });
  });

  describe('Abbreviation Handling', () => {
    test('handles U.S. abbreviation', () => {
      const script = 'The U.S. Senate passed the bill. This is historic.';
      const result = segmentScript(script);

      expect(result).toHaveLength(2);
      expect(result[0].text).toBe('The U.S. Senate passed the bill.');
      expect(result[1].text).toBe('This is historic.');
    });

    test('handles Dr. title', () => {
      const script = 'Dr. Smith announced the breakthrough. Markets reacted positively.';
      const result = segmentScript(script);

      expect(result).toHaveLength(2);
      expect(result[0].text).toContain('Dr. Smith');
    });

    test('handles multiple abbreviations', () => {
      const script = 'Mr. Jones from the U.K. met with Dr. Lee. They discussed E.U. policy.';
      const result = segmentScript(script);

      expect(result).toHaveLength(2);
      expect(result[0].text).toContain('Mr. Jones');
      expect(result[0].text).toContain('U.K.');
      expect(result[0].text).toContain('Dr. Lee');
    });

    test('handles e.g. and i.e.', () => {
      const script = 'Some sectors, e.g. technology, performed well. Others, i.e. retail, struggled.';
      const result = segmentScript(script);

      expect(result).toHaveLength(2);
      expect(result[0].text).toContain('e.g.');
      expect(result[1].text).toContain('i.e.');
    });
  });

  describe('Context Windows', () => {
    test('provides correct context for first sentence', () => {
      const script = 'First sentence. Second sentence. Third sentence.';
      const result = segmentScript(script);

      expect(result[0].contextWindow).toEqual({
        previous: null,
        current: 'First sentence.',
        next: 'Second sentence.',
      });
    });

    test('provides correct context for middle sentence', () => {
      const script = 'First sentence. Second sentence. Third sentence.';
      const result = segmentScript(script);

      expect(result[1].contextWindow).toEqual({
        previous: 'First sentence.',
        current: 'Second sentence.',
        next: 'Third sentence.',
      });
    });

    test('provides correct context for last sentence', () => {
      const script = 'First sentence. Second sentence. Third sentence.';
      const result = segmentScript(script);

      expect(result[2].contextWindow).toEqual({
        previous: 'Second sentence.',
        current: 'Third sentence.',
        next: null,
      });
    });
  });

  describe('Narrative Position Assignment', () => {
    test('assigns opening position to first 15% of sentences', () => {
      // 10 sentences: sentence 0 should be opening (0-10% = 0%)
      const script = Array(10).fill('Sentence.').join(' ');
      const result = segmentScript(script);

      expect(result[0].narrativePosition).toBe('opening');
      expect(result[1].narrativePosition).toBe('opening'); // 10% < 15%
    });

    test('assigns development position to 15-70% of sentences', () => {
      const script = Array(10).fill('Sentence.').join(' ');
      const result = segmentScript(script);

      // Sentence 2 (20%) and 5 (50%) should be development
      expect(result[2].narrativePosition).toBe('development');
      expect(result[5].narrativePosition).toBe('development');
    });

    test('assigns evidence position to 70-85% of sentences', () => {
      const script = Array(10).fill('Sentence.').join(' ');
      const result = segmentScript(script);

      // Sentence 7 (70%) and 8 (80%) should be evidence
      expect(result[7].narrativePosition).toBe('evidence');
      expect(result[8].narrativePosition).toBe('evidence');
    });

    test('assigns conclusion position to last 15% of sentences', () => {
      const script = Array(10).fill('Sentence.').join(' ');
      const result = segmentScript(script);

      // Sentence 9 (90%) should be conclusion
      expect(result[9].narrativePosition).toBe('conclusion');
    });

    test('handles very short scripts (3 sentences)', () => {
      const script = 'First. Second. Third.';
      const result = segmentScript(script);

      expect(result).toHaveLength(3);
      expect(result[0].narrativePosition).toBe('opening'); // 0%
      expect(result[1].narrativePosition).toBe('development'); // 33%
      expect(result[2].narrativePosition).toBe('development'); // 66%
    });
  });

  describe('Sentence Index', () => {
    test('assigns correct index to each sentence', () => {
      const script = 'First. Second. Third. Fourth.';
      const result = segmentScript(script);

      expect(result[0].index).toBe(0);
      expect(result[1].index).toBe(1);
      expect(result[2].index).toBe(2);
      expect(result[3].index).toBe(3);
    });
  });

  describe('getSentenceCount utility', () => {
    test('returns correct count for simple script', () => {
      const script = 'One. Two. Three.';
      expect(getSentenceCount(script)).toBe(3);
    });

    test('returns correct count with abbreviations', () => {
      const script = 'The U.S. markets rallied. Dr. Smith confirmed.';
      expect(getSentenceCount(script)).toBe(2);
    });
  });

  describe('Real-World News Script', () => {
    test('handles complex news script correctly', () => {
      const script = `Tesla announced record deliveries today. The company shipped 500,000 vehicles in Q4.
CEO Elon Musk celebrated the milestone on social media. Investors reacted positively.
Stock prices rose 5% in after-hours trading. Analysts predict continued growth in 2026.`;

      const result = segmentScript(script);

      expect(result).toHaveLength(6);

      // Check first sentence
      expect(result[0].text).toBe('Tesla announced record deliveries today.');
      expect(result[0].narrativePosition).toBe('opening');
      expect(result[0].index).toBe(0);

      // Check middle sentence
      expect(result[2].text).toBe('CEO Elon Musk celebrated the milestone on social media.');
      expect(result[2].narrativePosition).toBe('development');
      expect(result[2].contextWindow.previous).toBe('The company shipped 500,000 vehicles in Q4.');
      expect(result[2].contextWindow.next).toBe('Investors reacted positively.');

      // Check last sentence
      expect(result[5].text).toBe('Analysts predict continued growth in 2026.');
      expect(result[5].narrativePosition).toBe('conclusion');
      expect(result[5].contextWindow.next).toBe(null);
    });
  });
});
