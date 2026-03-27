# Image Processing Guide

## Overview

The Obsidian News Desk now includes professional image processing powered by **Sharp**, providing automatic validation, resizing, and optimization for all uploaded scene images.

## Features

### 1. Automatic Image Validation
All uploaded images are validated against production-ready requirements:

- **Minimum Resolution:** 1280x720
- **Target Resolution:** 1920x1080 (Full HD)
- **Max File Size:** 10 MB
- **Supported Formats:** JPG, PNG, WebP
- **Aspect Ratio:** 16:9 (with 2% tolerance)

### 2. Automatic Image Processing
Images are automatically processed upon upload:

- **Resized** to 1920x1080 (maintains 16:9 aspect ratio)
- **Cropped** to center if aspect ratio doesn't match
- **Optimized** with 90% JPEG quality
- **Converted** to JPEG format for consistency
- **Compressed** using mozjpeg for smaller file sizes

### 3. Upload Methods

#### A. Single Scene Upload (Drag & Drop)
1. Navigate to the Storyboard Editor
2. Drag an image directly onto a scene card
3. Image is validated, processed, and uploaded automatically
4. Visual feedback shows upload progress and errors

#### B. Single Scene Upload (Click)
1. Click the "Upload" button on any scene card
2. Select an image file from your computer
3. Image is validated, processed, and uploaded

#### C. Batch Upload (Multiple Scenes)
1. Open the Batch Upload panel in Storyboard Editor
2. Drag multiple images into the drop zone
3. Images auto-distribute to available scene slots
4. Click "Upload All" to process all images simultaneously
5. Progress bars show upload status for each image

## Validation Rules

### Pass Criteria
- Resolution >= 1280x720
- File size <= 10 MB
- Format: JPG, PNG, or WebP
- Valid image file (not corrupt)

### Warning Criteria (Still Uploads)
- Aspect ratio not exactly 16:9 → Auto-cropped to fit
- Resolution not 1920x1080 → Resized to target

### Fail Criteria
- Resolution < 1280x720 → Rejected
- File size > 10 MB → Rejected
- Invalid format → Rejected
- Corrupt file → Rejected

## Processing Pipeline

```
1. File Upload → FormData
2. Buffer Extraction → Raw image data
3. Validation → Check resolution, size, format
4. Processing → Resize, optimize, convert to JPEG
5. Storage → Save to local filesystem
6. Database → Update scene record with file path
```

## Error Handling

### User-Facing Errors
All errors are displayed with clear, actionable messages:

- "File too large: 12.5MB. Maximum: 10MB"
- "Resolution too low: 800x600. Minimum: 1280x720"
- "Invalid format: bmp. Allowed: JPG, PNG, WebP"

### Warnings
Non-critical issues that don't prevent upload:

- "Non-standard aspect ratio: 1.33:1. Will be cropped to 16:9"
- "Image will be resized from 2560x1440 to 1920x1080"

## Technical Details

### Sharp Configuration

```typescript
// Resize with cover fit (maintains aspect ratio)
.resize(1920, 1080, {
  fit: 'cover',
  position: 'center',
})

// JPEG optimization
.jpeg({
  quality: 90,
  progressive: true,
  mozjpeg: true,
})
```

### Performance
- **Validation:** ~50ms per image
- **Processing:** ~200-500ms per image (depending on size)
- **Batch Upload:** Parallel processing (all images at once)

### Storage
All processed images are saved to:
```
C:\Users\konra\ObsidianNewsDesk\images\{scene_id}.jpg
```

## API Endpoints

### POST `/api/jobs/[id]/scenes/[scene_id]/upload`

**Request:**
```typescript
FormData {
  image: File (PNG, JPG, WebP)
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Image processed and saved successfully",
  "scene_id": "uuid",
  "image_url": "C:\\Users\\konra\\ObsidianNewsDesk\\images\\uuid.jpg",
  "file_name": "my-image.png",
  "original_size": 2048576,
  "processed_size": 245632,
  "resolution": "1920x1080",
  "validation": {
    "original_width": 2560,
    "original_height": 1440,
    "warnings": ["Image will be resized from 2560x1440 to 1920x1080"]
  }
}
```

**Response (Error):**
```json
{
  "error": "Image validation failed",
  "details": "Resolution too low: 800x600. Minimum: 1280x720",
  "validation": {
    "valid": false,
    "width": 800,
    "height": 600,
    "errors": ["Resolution too low: 800x600. Minimum: 1280x720"],
    "warnings": []
  }
}
```

## Testing

Run the test suite to verify image processing:

```bash
npm run test:image-processing
```

Tests include:
1. Placeholder generation
2. Valid image validation
3. Low-resolution rejection
4. Aspect ratio warnings
5. Image processing (resize & optimize)
6. Batch validation

## Troubleshooting

### Issue: "Sharp installation failed"
**Solution:** Rebuild Sharp native binaries
```bash
npm rebuild sharp
```

### Issue: "Processing timeout"
**Solution:** Reduce image size before upload or increase server timeout

### Issue: "Image appears stretched/cropped"
**Solution:** Use 16:9 aspect ratio images (e.g., 1920x1080, 3840x2160)

### Issue: "Upload fails silently"
**Solution:** Check browser console for error details, verify file is not corrupt

## Best Practices

1. **Use 16:9 Aspect Ratio:** Images at 1920x1080, 3840x2160, or 2560x1440
2. **Pre-optimize Large Files:** If file > 10MB, compress before upload
3. **Batch Upload for Speed:** Upload all 8 scenes at once instead of one-by-one
4. **Check Validation Warnings:** Review warnings to understand processing changes
5. **Use High-Quality Sources:** Start with high-res images for best results

## Components

### Image Processing Utility
**File:** `src/lib/utils/image-processing.ts`

Functions:
- `validateImage(buffer)` - Validate image against requirements
- `processImage(buffer, options)` - Resize and optimize image
- `generatePlaceholder(text)` - Create gray placeholder image
- `getImageDimensions(buffer)` - Extract image dimensions
- `batchValidateImages(buffers)` - Validate multiple images
- `batchProcessImages(buffers, options)` - Process multiple images

### Batch Upload Component
**File:** `src/components/broadcast/BatchImageUpload.tsx`

Features:
- Drag-drop zone for multiple images
- 8 upload slots (one per scene)
- Real-time validation feedback
- Progress indicators
- Error/warning display
- Clear and retry options

### Scene Card Component
**File:** `src/components/broadcast/SceneCard.tsx`

Added features:
- Drag-drop directly onto scene image
- Visual drag-over indicator
- Upload progress feedback
- Error alerts with details

## Future Enhancements

Potential improvements for future releases:

1. **Image Filters:** Brightness, contrast, saturation adjustments
2. **Crop Editor:** Manual crop/zoom before upload
3. **Format Conversion:** Save as PNG or WebP instead of JPG
4. **Compression Presets:** Low/Medium/High quality options
5. **Batch Filters:** Apply same filter to all images
6. **Image History:** Undo/redo for uploaded images
7. **AI Upscaling:** Automatically upscale low-res images
8. **Watermark Support:** Add logo/watermark during processing

## Related Documentation

- [USER_GUIDE.md](./USER_GUIDE.md) - Full user guide
- [CLAUDE.md](./CLAUDE.md) - Project architecture
- [package.json](./package.json) - Dependencies (Sharp v0.33+)
