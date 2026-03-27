/**
 * Broadcast Photography Specifications (Phase 3: Photographic Realism)
 *
 * Detailed technical specifications to make images look like real broadcast news photography
 * instead of generic AI-generated images.
 */
export const BROADCAST_PHOTOGRAPHY_SPECS = {
  camera: {
    type: 'Broadcast-grade ENG camera or professional DSLR',
    commonLenses: {
      establishing: '24mm wide angle lens',
      medium: '35-50mm standard lens',
      closeup: '50-85mm portrait lens',
      detail: '70mm+ telephoto or macro lens',
    },
    aperture: {
      establishing: 'f/4-f/5.6 (greater depth of field)',
      medium: 'f/2.8-f/4 (moderate depth)',
      closeup: 'f/2.8-f/4 (subject separation)',
      detail: 'f/2.8 (shallow depth, background blur)',
    },
  },

  lighting: {
    natural: 'Natural daylight, 5500K color temperature balanced',
    indoor: 'Mixed fluorescent and ambient light, 4500-5000K',
    golden: 'Golden hour (4500K), warm tones, soft shadows',
    studio: 'Professional studio lighting, three-point setup',
    avoid: 'Harsh midday sun, extreme shadows, oversaturation',
  },

  composition: {
    ruleOfThirds: 'Subject on left or right third line, not dead center',
    headroom: 'Appropriate negative space above subjects (not cropped tight)',
    leadingLines: 'Use architectural elements, roads, or environmental lines',
    depth: 'Visible foreground, midground, and background layers',
    horizon: 'Level horizon (unless Dutch angle for dramatic effect)',
  },

  productionReality: {
    environments: 'Crowded rooms with natural chaos, not sterile empty spaces',
    people: 'Slightly out-of-focus background figures in natural positions',
    movement: 'Slight motion blur on moving subjects (1/200s shutter feel)',
    lensCharacteristics: 'Subtle lens flare when light sources present, natural vignetting',
    focus: 'Sharp on primary subject, gradual falloff to background',
    imperfections: 'Slight noise in shadows, subtle lens distortion, natural grain',
  },

  cameraAngles: {
    eyeLevel: 'Standard neutral perspective, subject at eye level',
    highAngle: 'Shot from above looking down (shows scale, vulnerability, authority over subject)',
    lowAngle: 'Shot from below looking up (shows power, dominance, subject authority)',
    dutchAngle: 'Tilted horizon (tension, instability) - use sparingly',
    profile: 'Side view, 90-degree angle to subject',
    overShoulder: 'From behind subject looking forward',
    threeQuarter: 'Angled 45 degrees, shows depth',
  },

  avoidAITells: [
    'Perfect symmetry (too artificial)',
    'Oversaturated colors (Instagram filter look)',
    'Extreme bokeh (iPhone portrait mode)',
    'Perfectly clean environments (sterile CG look)',
    'Everyone facing camera (unnatural staging)',
    'Extreme wide angles (GoPro distortion)',
    'HDR tone-mapping artifacts (halo edges)',
    'Generic "photorealistic" without specific details',
  ],

  realityChecks: [
    'Natural imperfections: slight noise, subtle distortion',
    'Environmental context: power lines, signage, urban clutter',
    'Weather effects: cloud cover, lighting quality',
    'Time continuity: consistent sun position within story segment',
    'Production hints: lens flare, vignetting, focus rolloff',
  ],
};

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
 * Gets camera specifications for a shot type (Phase 3)
 */
export function getCameraSpec(shotType: string): string {
  const specs = BROADCAST_PHOTOGRAPHY_SPECS.camera;

  switch (shotType) {
    case 'establishing':
      return `shot on broadcast ENG camera with ${specs.commonLenses.establishing} at ${specs.aperture.establishing}`;
    case 'medium':
      return `shot on broadcast camera with ${specs.commonLenses.medium} at ${specs.aperture.medium}`;
    case 'closeup':
      return `shot with ${specs.commonLenses.closeup} at ${specs.aperture.closeup}`;
    case 'detail':
      return `shot with ${specs.commonLenses.detail} at ${specs.aperture.detail}`;
    default:
      return 'shot on professional broadcast camera';
  }
}

/**
 * Gets lighting specifications based on time of day (Phase 3)
 */
export function getLightingSpec(timeOfDay: string): string {
  const specs = BROADCAST_PHOTOGRAPHY_SPECS.lighting;

  if (timeOfDay.includes('golden') || timeOfDay.includes('sunset') || timeOfDay.includes('sunrise')) {
    return specs.golden;
  } else if (timeOfDay.includes('night') || timeOfDay.includes('evening')) {
    return specs.indoor + ', mixed with artificial building lights';
  } else {
    return specs.natural;
  }
}

/**
 * Gets composition rules (Phase 3)
 */
export function getCompositionRules(shotType: string): string {
  const comp = BROADCAST_PHOTOGRAPHY_SPECS.composition;

  const rules = [comp.ruleOfThirds];

  if (shotType === 'establishing') {
    rules.push(comp.depth);
    rules.push(comp.leadingLines);
  } else if (shotType === 'closeup') {
    rules.push(comp.headroom);
  }

  return rules.join(', ');
}

/**
 * Gets realism modifiers (Phase 3)
 */
export function getRealismModifiers(): string {
  const prod = BROADCAST_PHOTOGRAPHY_SPECS.productionReality;
  return `${prod.lensCharacteristics}, ${prod.focus}, ${prod.imperfections}`;
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

/**
 * Formats broadcast photography specifications for prompts (Phase 3)
 */
export function formatPhotographySpecsForPrompt(): string {
  const specs = BROADCAST_PHOTOGRAPHY_SPECS;

  return `
# Professional News Photography Requirements

## Camera & Lens Specifications
- Camera type: ${specs.camera.type}
- Focal lengths by shot type:
  * Establishing: ${specs.camera.commonLenses.establishing}
  * Medium: ${specs.camera.commonLenses.medium}
  * Closeup: ${specs.camera.commonLenses.closeup}
  * Detail: ${specs.camera.commonLenses.detail}
- Aperture ranges:
  * Establishing: ${specs.camera.aperture.establishing}
  * Medium: ${specs.camera.aperture.medium}
  * Closeup: ${specs.camera.aperture.closeup}
  * Detail: ${specs.camera.aperture.detail}

## Lighting & Color
- Natural lighting: ${specs.lighting.natural}
- Indoor lighting: ${specs.lighting.indoor}
- Golden hour: ${specs.lighting.golden}
- Studio lighting: ${specs.lighting.studio}
- AVOID: ${specs.lighting.avoid}

## Composition & Framing
- Rule of thirds: ${specs.composition.ruleOfThirds}
- Headroom: ${specs.composition.headroom}
- Leading lines: ${specs.composition.leadingLines}
- Depth cues: ${specs.composition.depth}
- Horizon: ${specs.composition.horizon}

## Production Reality
- Environments: ${specs.productionReality.environments}
- People: ${specs.productionReality.people}
- Movement: ${specs.productionReality.movement}
- Lens characteristics: ${specs.productionReality.lensCharacteristics}
- Focus: ${specs.productionReality.focus}
- Imperfections: ${specs.productionReality.imperfections}

## Camera Angles
- Eye level: ${specs.cameraAngles.eyeLevel}
- High angle: ${specs.cameraAngles.highAngle}
- Low angle: ${specs.cameraAngles.lowAngle}
- Dutch angle: ${specs.cameraAngles.dutchAngle}
- Profile: ${specs.cameraAngles.profile}
- Over-the-shoulder: ${specs.cameraAngles.overShoulder}
- Three-quarter: ${specs.cameraAngles.threeQuarter}

## Avoid These AI Tells
${specs.avoidAITells.map(tell => `- ❌ ${tell}`).join('\n')}

## Reality Checks
${specs.realityChecks.map(check => `- ✅ ${check}`).join('\n')}
`;
}
