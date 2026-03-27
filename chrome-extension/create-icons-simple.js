const fs = require('fs');

// Minimal valid PNG files (1x1 pixels, will be upscaled by browser)
const icons = {
  'icon16.png': Buffer.from('iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAEklEQVR42mNk+M9QzzCKBgYGADT6AoF3N+iUAAAAAElFTkSuQmCC', 'base64'),
  'icon48.png': Buffer.from('iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAAEklEQVR42mNk+M9QzzAKhx0AAdQAoVVm5r4AAAAASUVORK5CYII=', 'base64'),
  'icon128.png': Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAAAUklEQVR42u3PMQ0AAAgDINc/9K3hDQygoWlqlACAAAgAAIAACIAAAAACIAACAAAgAAIgAAIAACAAAgAAIAACIAAAAACAAAgAAIAACMBXAcBQAm0eBoRbAAAAAElFTkSuQmCC', 'base64')
};

Object.keys(icons).forEach(filename => {
  fs.writeFileSync(filename, icons[filename]);
  console.log(`✅ Created ${filename}`);
});

console.log('🎨 All icons created successfully!');
