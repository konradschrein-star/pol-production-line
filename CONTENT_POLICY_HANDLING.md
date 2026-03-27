# Automatic Content Policy Error Handling

**Status:** ✅ Implemented
**Date:** March 22, 2026

---

## Overview

Political news content often triggers content policy violations in image generation APIs. This system **automatically detects and handles** policy rejections by intelligently rewriting prompts to be compliant while maintaining journalistic value.

---

## How It Works

### Detection → Sanitization → Retry Flow

```
┌─────────────────────────────────────────────────────────┐
│ 1. Generate Image with Original Prompt                 │
│    "Photo of Donald Trump at the Capitol..."           │
└───────────────────┬─────────────────────────────────────┘
                    │
                    ▼
              ┌─────────┐
              │ SUCCESS?│
              └─────┬───┘
                    │
        ┌───────────┴───────────┐
        │                       │
       YES                     NO
        │                       │
        ▼                       ▼
   ┌────────┐          ┌───────────────┐
   │ DONE   │          │ Policy Error? │
   └────────┘          └───────┬───────┘
                               │
                    ┌──────────┴──────────┐
                    │                     │
                   YES                   NO
                    │                     │
                    ▼                     ▼
        ┌────────────────────┐      ┌─────────┐
        │ 2. Sanitize Prompt │      │ Throw   │
        │    (AI Rewrite)    │      │ Error   │
        └────────┬───────────┘      └─────────┘
                 │
                 ▼
    ┌──────────────────────────┐
    │ 3. Retry with New Prompt │
    │    "Photo of political   │
    │    leader at government  │
    │    building..."          │
    └──────────┬───────────────┘
               │
               ▼
         (Repeat up to 3 times)
```

---

## Implementation Details

### 1. Quick Sanitization (Rule-Based)

**First attempt** uses fast rule-based replacements:

```typescript
// Remove specific names
"Biden" → "political leader"
"Trump" → "political leader"
"Harris" → "government official"

// Remove partisan references
"Democrat politician" → "government official"
"Republican senator" → "government official"

// Remove controversial symbols
"confederate flag" → "historical flag"
"nazi symbol" → "historical symbol"
```

**Pros:**
- ⚡ Instant (no API call)
- Works for obvious violations
- No cost

**Cons:**
- Limited to predefined rules
- May miss subtle violations

---

### 2. AI-Powered Sanitization (GPT-4)

If quick sanitization fails, **GPT-4 rewrites** the prompt:

**Attempt 1 (Minimal Changes):**
```
Original: "Photorealistic image of Joe Biden signing executive order at Oval Office desk"
Sanitized: "Photorealistic image of senior government official signing document at presidential office desk, professional news photography"
```

**Attempt 2 (Moderate Changes):**
```
Original: "Image of Republican senators protesting at Capitol steps"
Sanitized: "Professional photograph of government building exterior with legislative chamber visible, neutral perspective, architectural photography"
```

**Attempt 3 (Aggressive Changes):**
```
Original: "Trump rally crowd waving MAGA flags"
Sanitized: "Abstract visualization of political event data, clean infographic style, neutral color scheme, minimalist design"
```

---

### 3. Fallback Prompts (Ultra-Safe)

If all sanitization fails, use **pre-approved generic prompts**:

1. "Photorealistic image of the United States Capitol building exterior"
2. "Professional photograph of modern government building facade"
3. "Abstract visualization of political data, clean infographic style"
4. "High-quality stock photo of legislative chamber interior"

---

## Error Detection

### Policy Violation Indicators

The system detects policy violations by checking for:

```typescript
// Error message keywords
- "content policy"
- "safety"
- "inappropriate"
- "violated"
- "blocked"
- "prohibited"

// HTTP status codes
- 400 (Bad Request - often policy violations)
- 403 (Forbidden)
```

### Rate Limit vs Policy Violation

**Important distinction:**

| Error Type | Status | Handling |
|------------|--------|----------|
| Rate Limit | 429 | Exponential backoff, no sanitization |
| Policy Violation | 400/403 | Prompt sanitization + retry |
| Auth Error | 401 | Pause queue, notify user |
| Other Error | 5xx | Standard retry logic |

---

## Configuration

### Environment Variables

```env
# Max attempts to sanitize a rejected prompt (default: 3)
MAX_PROMPT_SANITIZATION_ATTEMPTS=3

# Whisk retry configuration
MAX_RETRIES=3
RETRY_BACKOFF_BASE=5000
```

### Customization

**Add custom sanitization rules** in `prompt-sanitizer.ts`:

```typescript
// Add to quickSanitize()
sanitized = sanitized.replace(/your-term/gi, 'safe-alternative');
```

**Customize fallback prompts**:

```typescript
// Edit in prompt-sanitizer.ts → getFallbackPrompt()
const fallbacks = [
  'Your custom safe prompt 1',
  'Your custom safe prompt 2',
  // ...
];
```

---

## Usage Examples

### Example 1: Politician Name Removed

**Input Prompt:**
```
"Photorealistic image of President Biden at the White House podium,
professional news photography"
```

**Detection:**
```
⚠️  [IMAGES] Content policy violation detected (attempt 1/3)
   Error: Request blocked due to content policy
   Rewriting prompt to be policy-compliant...
```

**Sanitized Prompt (Attempt 1):**
```
"Photorealistic image of senior government official at presidential
podium, professional news photography, neutral lighting"
```

**Result:** ✅ Image generated successfully

---

### Example 2: Controversial Topic

**Input Prompt:**
```
"Photo of protesters storming the Capitol building with confederate flags"
```

**Detection:**
```
⚠️  [IMAGES] Content policy violation detected (attempt 1/3)
🔧 [Sanitizer] Rewriting prompt (attempt 1)
```

**Sanitized Prompt (Attempt 1):**
```
"Professional photograph of government building exterior with crowd
visible, news documentary style, wide angle"
```

**Detection (still rejected):**
```
⚠️  [IMAGES] Content policy violation detected (attempt 2/3)
🔧 [Sanitizer] Rewriting prompt (attempt 2) - MORE AGGRESSIVE
```

**Sanitized Prompt (Attempt 2):**
```
"Photorealistic image of the United States Capitol building exterior,
professional architectural photography, neutral perspective"
```

**Result:** ✅ Image generated successfully

---

### Example 3: Maximum Attempts Reached

**Input Prompt:**
```
"Graphic image of political violence at protest"
```

**Processing:**
1. Attempt 1: Quick sanitization → Still rejected
2. Attempt 2: AI sanitization (minimal) → Still rejected
3. Attempt 3: AI sanitization (aggressive) → Still rejected
4. **Fallback:** Use generic safe prompt

**Final Prompt (Fallback):**
```
"Professional photograph of modern government building facade,
brutalist architecture, clean geometric shapes"
```

**Result:** ✅ Image generated (generic but safe)

---

## Monitoring & Logging

### Console Output

Watch for these log messages:

```bash
# Quick sanitization applied
🔧 [IMAGES] Quick-sanitized prompt (removed obvious violations)

# Policy violation detected
⚠️  [IMAGES] Content policy violation detected (attempt 1/3)
   Error: Request blocked due to content policy
   Rewriting prompt to be policy-compliant...

# AI sanitization in progress
🔧 [Sanitizer] Rewriting prompt (attempt 2)
   Original: Photo of Trump rally...
   ✅ Sanitized: Photo of political event...

# Success after sanitization
✅ [IMAGES] Image generated successfully
   (Used sanitized prompt after 2 attempt(s))

# Fallback used
⚠️  [IMAGES] Using fallback safe prompt (all sanitization attempts failed)
```

### Database Tracking

Sanitization attempts are logged in `generation_params`:

```json
{
  "seed": 12345,
  "model": "IMAGEN_3_5",
  "hadReferences": false,
  "timestamp": "2026-03-22T...",
  "sanitizationAttempts": 2,
  "originalPrompt": "Photo of...",
  "finalPrompt": "Professional photograph of..."
}
```

---

## Cost Impact

### Quick Sanitization
- **Cost:** $0 (rule-based, no API)
- **Speed:** Instant

### AI Sanitization (GPT-4)
- **Cost:** ~$0.001 per sanitization (~200 tokens)
- **Speed:** 1-2 seconds per attempt
- **Max cost per image:** $0.003 (3 attempts)

### Overall Impact
- **Most images:** $0 (no policy violations)
- **Occasional violation:** $0.001-$0.003 (1-3 sanitization attempts)
- **Total cost increase:** < 1% for typical political news content

---

## Testing

### Manual Test

```typescript
import { PromptSanitizer } from './src/lib/ai/prompt-sanitizer';

const sanitizer = new PromptSanitizer();

const original = "Photo of Donald Trump at MAGA rally";
const sanitized = await sanitizer.sanitizePrompt(original, "content policy violation", 1);

console.log('Original:', original);
console.log('Sanitized:', sanitized);
// Expected: "Photo of political leader at campaign event..."
```

### Automated Test

Create a test job with intentionally problematic prompts:

```bash
# Edit a scene in the storyboard editor
# Change image prompt to: "Photo of Joe Biden with protesters"
# Save and generate
# Watch logs for sanitization
```

---

## Best Practices

### For Content Creators

**✅ DO:**
- Use generic terms in prompts: "political leader", "government official"
- Focus on settings/objects: "Capitol building", "legislative chamber"
- Use abstract concepts: "political momentum", "electoral trends"

**❌ AVOID:**
- Specific politician names: "Biden", "Trump", "Harris"
- Partisan language: "MAGA", "liberal extremist"
- Controversial symbols: flags, religious symbols in political context
- Violence or conflict imagery

### For Developers

**When adding new rules:**
1. Add to `quickSanitize()` for instant filtering
2. Update `getFallbackPrompt()` with safe alternatives
3. Test with problematic prompts before deploying

**When troubleshooting:**
1. Check logs for sanitization attempts
2. Review `generation_params` in database
3. Manually test prompt with Whisk API directly
4. Adjust fallback prompts if needed

---

## Architecture

### File Structure

```
src/lib/
├── ai/
│   └── prompt-sanitizer.ts       # AI-powered prompt rewriting
├── queue/
│   └── workers/
│       └── images.worker.ts      # Integrated retry logic
└── whisk/
    └── api.ts                    # Whisk API client
```

### Integration Points

1. **Images Worker** (`images.worker.ts`)
   - Detects policy violations
   - Calls sanitizer on error
   - Retries with sanitized prompt

2. **Prompt Sanitizer** (`prompt-sanitizer.ts`)
   - Quick rule-based sanitization
   - GPT-4 AI rewriting
   - Fallback prompts

3. **Database** (`news_scenes` table)
   - Stores original prompt
   - Stores final (sanitized) prompt
   - Tracks sanitization attempts

---

## Troubleshooting

### Q: All images are being sanitized (high API costs)

**Solution:** Your default prompts may be too specific. Update AI script analyzer to generate more neutral prompts.

```typescript
// In script-analyzer.ts, add guidance:
"Avoid specific politician names. Use 'political leader', 'government official' instead."
```

---

### Q: Images are too generic after sanitization

**Solution:** Reduce aggressiveness of sanitization:

```typescript
// In prompt-sanitizer.ts, adjust getSystemPrompt()
if (attemptNumber === 1) {
  return basePrompt + `Make VERY MINIMAL changes - only remove names.`;
}
```

---

### Q: Sanitization is slow

**Solution:** Enable quick sanitization for common violations:

```typescript
// Add more rules to quickSanitize()
sanitized = sanitized.replace(/common-violation/gi, 'safe-term');
```

---

## Future Enhancements

### Potential Improvements

1. **Learning System**
   - Track which prompts get rejected
   - Build database of "safe" vs "rejected" prompts
   - Improve quick sanitization rules over time

2. **Pre-emptive Sanitization**
   - Run quick sanitization on ALL prompts before sending
   - Reduce API rejections to near-zero

3. **Visual Style Preservation**
   - Analyze original prompt for style keywords
   - Ensure sanitized prompt maintains visual aesthetic
   - "photorealistic", "news photography", etc.

4. **Alternative Image Sources**
   - If Whisk rejects, try stock photo APIs
   - Unsplash, Pexels for generic political imagery
   - Fallback to illustration/infographic style

---

## Summary

✅ **Automatic error handling** for content policy violations
✅ **3-tier sanitization:** Quick rules → AI rewrite → Fallback
✅ **Progressive aggressiveness:** Preserves specificity when possible
✅ **Cost-effective:** Only uses AI when needed (~$0.001-0.003 per violation)
✅ **Transparent logging:** Full visibility into sanitization process
✅ **Production-ready:** Tested with political news content

**Result:** Political news content can be generated automatically without manual intervention for policy violations! 🎉
