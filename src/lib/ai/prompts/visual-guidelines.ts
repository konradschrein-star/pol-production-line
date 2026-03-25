/**
 * Documentary-Style Visual Guidelines
 *
 * Professional cinematography rules for coherent, engaging video production.
 * Based on best practices from YouTube automation and AI video generation.
 */

export const DOCUMENTARY_VISUAL_GUIDELINES = {
  composition: [
    "Professional cinematography with clear focal point (center or rule-of-thirds)",
    "Balanced composition avoiding cluttered backgrounds",
    "Natural lighting consistent with scene mood",
    "High production value, polished aesthetic",
  ],

  shotTypes: {
    establishing: {
      description: "Wide angle shot showing full context/location",
      usage: "Use for opening scenes, location changes, or setting context",
      examples: [
        "Aerial view of city skyline",
        "Wide shot of factory exterior",
        "Panoramic view of conference hall",
      ],
    },
    medium: {
      description: "Medium shot showing subject in environment",
      usage: "Use for main content, development, and explanations",
      examples: [
        "Factory floor with workers and machinery visible",
        "Office space with people at desks",
        "Laboratory with equipment and researchers",
      ],
    },
    closeup: {
      description: "Close-up on key subject, person, or object",
      usage: "Use for emotional moments, emphasis, or highlighting specific details",
      examples: [
        "Close-up of hands typing on keyboard",
        "Face of speaker during important statement",
        "Detailed view of product or technology",
      ],
    },
    detail: {
      description: "Macro or detail shot of specific object/element",
      usage: "Use for facts, evidence, data visualization, or specific points",
      examples: [
        "Stock ticker display with numbers",
        "Chart showing financial data",
        "Close-up of document or contract",
      ],
    },
  },

  subjectProgression: [
    "Vary between: locations → people → objects → concepts",
    "Maintain visual thread: if scene N shows a factory, scene N+1 can show workers inside",
    "Avoid abrupt jumps: don't go from indoor office to outdoor mountain without transition",
    "Create narrative flow: each scene should feel connected to the previous one",
  ],

  stylisticConsistency: [
    "Photorealistic, modern documentary style",
    "Consistent time of day (unless script implies time change)",
    "Professional color grading with neutral tones",
    "Avoid cartoonish, artistic, or abstract imagery unless script requires it",
    "No visible faces unless script specifically mentions a person",
    "Focus on environments, objects, and concepts rather than people",
  ],

  visualContinuity: [
    "Consider what came before: maintain visual coherence",
    "Consider what comes next: set up transitions",
    "Use similar lighting/color palette for consecutive scenes in same topic",
    "Vary camera angles to prevent monotony while maintaining style",
  ],
};

/**
 * Shot type distribution strategy for N scenes
 *
 * Opening (0-15%): Establishing + Medium
 * Development (15-70%): Medium + Closeup
 * Evidence (70-85%): Medium + Closeup + Detail
 * Conclusion (85-100%): Medium + Establishing
 */
export function getShotTypeRecommendation(
  narrativePosition: 'opening' | 'development' | 'evidence' | 'conclusion',
  sceneIndex: number,
  totalScenes: number
): string[] {
  const percentage = (sceneIndex / totalScenes) * 100;

  if (narrativePosition === 'opening') {
    // Opening scenes: establish context
    return sceneIndex === 0
      ? ['establishing', 'medium'] // First scene strongly prefers establishing
      : ['medium', 'establishing'];
  }

  if (narrativePosition === 'development') {
    // Development: main content
    return ['medium', 'closeup', 'establishing'];
  }

  if (narrativePosition === 'evidence') {
    // Evidence: facts and details
    return ['detail', 'medium', 'closeup'];
  }

  // Conclusion: wrap up with broader view
  return sceneIndex === totalScenes - 1
    ? ['establishing', 'medium'] // Last scene prefers establishing
    : ['medium', 'establishing'];
}

/**
 * Formats visual guidelines as a system prompt section
 */
export function formatVisualGuidelinesForPrompt(): string {
  return `
# Documentary Cinematography Guidelines

## Shot Type Reference

**Establishing Shot:**
${DOCUMENTARY_VISUAL_GUIDELINES.shotTypes.establishing.description}
Usage: ${DOCUMENTARY_VISUAL_GUIDELINES.shotTypes.establishing.usage}

**Medium Shot:**
${DOCUMENTARY_VISUAL_GUIDELINES.shotTypes.medium.description}
Usage: ${DOCUMENTARY_VISUAL_GUIDELINES.shotTypes.medium.usage}

**Closeup Shot:**
${DOCUMENTARY_VISUAL_GUIDELINES.shotTypes.closeup.description}
Usage: ${DOCUMENTARY_VISUAL_GUIDELINES.shotTypes.closeup.usage}

**Detail Shot:**
${DOCUMENTARY_VISUAL_GUIDELINES.shotTypes.detail.description}
Usage: ${DOCUMENTARY_VISUAL_GUIDELINES.shotTypes.detail.usage}

## Composition Principles

${DOCUMENTARY_VISUAL_GUIDELINES.composition.map(rule => `- ${rule}`).join('\n')}

## Visual Continuity

${DOCUMENTARY_VISUAL_GUIDELINES.visualContinuity.map(rule => `- ${rule}`).join('\n')}

## Style Consistency

${DOCUMENTARY_VISUAL_GUIDELINES.stylisticConsistency.map(rule => `- ${rule}`).join('\n')}

## Shot Progression Strategy

${DOCUMENTARY_VISUAL_GUIDELINES.subjectProgression.map(rule => `- ${rule}`).join('\n')}
`;
}
