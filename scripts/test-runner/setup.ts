#!/usr/bin/env node
/**
 * Setup Script
 *
 * One-time setup for the test runner project.
 */

import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const NODE_VERSION = process.version;
const MIN_VERSION = '20.0.0';

function checkNodeVersion(): boolean {
  const current = NODE_VERSION.slice(1).split('.').map(Number);
  const min = MIN_VERSION.split('.').map(Number);

  for (let i = 0; i < 3; i++) {
    const currentPart = current[i] ?? 0;
    const minimumPart = min[i] ?? 0;
    if (currentPart > minimumPart) return true;
    if (currentPart < minimumPart) return false;
  }
  return true;
}

function main(): void {
  console.log('🔧 Robust Test Runner Setup');
  console.log(`   Node.js: ${NODE_VERSION}`);

  if (!checkNodeVersion()) {
    console.error(`❌ Node.js ${MIN_VERSION}+ required`);
    process.exit(1);
  }

  console.log('✅ Node.js version OK');

  // Check for glob package
  try {
    const globPath = resolve(process.cwd(), 'node_modules/glob/package.json');
    if (!existsSync(globPath)) {
      console.log('📦 Installing glob dependency...');
      execSync('npm install glob@^10.0.0 --save-dev', { stdio: 'inherit' });
    }
  } catch {
    console.log('⚠️  Could not verify glob installation');
  }

  console.log('\n✅ Setup complete!');
  console.log('\nRun tests with:');
  console.log('   npm test');
  console.log('   npm run test:unit');
  console.log('   npm run test:strict');
}

main();
