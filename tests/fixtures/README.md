# Test Fixtures

This directory contains minimal test data for automated tests.

## Creating Fixtures

### Test Avatar (1-second silent video)

```bash
ffmpeg -f lavfi -i color=blue:s=640x360:d=1 \
  -f lavfi -i anullsrc=r=48000 \
  -shortest avatars/test-avatar.mp4
```

### Test Images (1x1 pixel colored images)

```bash
ffmpeg -f lavfi -i color=blue:s=1x1 -frames:v 1 images/test-scene-1.jpg
ffmpeg -f lavfi -i color=green:s=1x1 -frames:v 1 images/test-scene-2.jpg
ffmpeg -f lavfi -i color=red:s=1x1 -frames:v 1 images/test-scene-3.jpg
```

## Fixture Files

- `avatars/test-avatar.mp4` - 1-second silent video (640x360)
- `images/test-scene-*.jpg` - 1x1 pixel colored images
- `scripts.ts` - Sample news scripts

## Usage in Tests

```typescript
import path from 'path';
import fs from 'fs';

const avatarPath = path.join(__dirname, '../fixtures/avatars/test-avatar.mp4');
const imagePath = path.join(__dirname, '../fixtures/images/test-scene-1.jpg');

// Use in tests
const avatarBuffer = fs.readFileSync(avatarPath);
```
