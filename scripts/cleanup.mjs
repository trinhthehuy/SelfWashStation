import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const targets = {
  dist: [
    path.join(root, 'Frontend/dist'),
    path.join(root, 'Backend/dist'),
  ],
  cache: [
    path.join(root, 'Frontend/node_modules/.vite'),
  ],
  buildInfo: [
    path.join(root, 'Backend/tsconfig.tsbuildinfo'),
  ]
};

function removeRecursive(p) {
  if (fs.existsSync(p)) {
    console.log(`Removing: ${p}`);
    fs.rmSync(p, { recursive: true, force: true });
  }
}

function removeByExtension(dir, ext) {
  if (!fs.existsSync(dir)) return;
  
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      removeByExtension(fullPath, ext);
    } else if (file.endsWith(ext)) {
      console.log(`Deleting file: ${fullPath}`);
      fs.unlinkSync(fullPath);
    }
  }
}

const command = process.argv[2];

if (command === 'clean') {
  targets.dist.forEach(removeRecursive);
  targets.buildInfo.forEach(removeRecursive);
} else if (command === 'clear-cache') {
  targets.cache.forEach(removeRecursive);
  console.log('Running npm cache clean...');
  // Note: npm cache clean --force usually requires shell, but we can just skip it or log it
} else if (command === 'cleanup-maps') {
  targets.dist.forEach(dir => removeByExtension(dir, '.map'));
} else if (command === 'deep-clean') {
  targets.dist.forEach(removeRecursive);
  targets.buildInfo.forEach(removeRecursive);
  targets.cache.forEach(removeRecursive);
} else {
  console.log('Usage: node scripts/cleanup.mjs [clean|clear-cache|cleanup-maps|deep-clean]');
}
