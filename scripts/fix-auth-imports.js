#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Fixing auth imports across codebase...\n');

// Find all files that import from @/lib/auth
const filesOutput = execSync(
  'grep -r -l "from [\'\\"]@/lib/auth[\'\\"]" src/',
  { encoding: 'utf-8' }
);

const files = filesOutput.trim().split('\n').filter(Boolean);

console.log(`📝 Found ${files.length} files to update:\n`);

let updatedCount = 0;

files.forEach((file) => {
  let content = fs.readFileSync(file, 'utf-8');
  const originalContent = content;

  // Pattern to match imports from @/lib/auth
  const importRegex = /import\s+{([^}]+)}\s+from\s+['"]@\/lib\/auth['"]/g;

  content = content.replace(importRegex, (match, imports) => {
    // List of utility functions that should come from auth-utils
    const utilityFunctions = [
      'generateToken',
      'verifyToken',
      'hasRole',
      'isAdmin',
      'isCreator',
      'isCreatorOrAdmin',
      'JWTPayload',
      'AuthUser',
      'Role'
    ];

    const importsList = imports.split(',').map(i => i.trim());
    const authUtilsImports = [];
    const authImports = [];

    importsList.forEach(imp => {
      // Remove 'type' keyword for checking
      const cleanImp = imp.replace(/^type\s+/, '');

      if (utilityFunctions.some(util => cleanImp.includes(util))) {
        authUtilsImports.push(imp);
      } else {
        authImports.push(imp);
      }
    });

    let result = '';

    if (authUtilsImports.length > 0) {
      result += `import { ${authUtilsImports.join(', ')} } from '@/lib/auth-utils';`;
    }

    if (authImports.length > 0) {
      if (result) result += '\n';
      result += `import { ${authImports.join(', ')} } from '@/lib/auth';`;
    }

    return result || match;
  });

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf-8');
    console.log(`  ✅ ${file}`);
    updatedCount++;
  } else {
    console.log(`  ⏭️  ${file} (no utility imports)`);
  }
});

console.log(`\n✅ Updated ${updatedCount} file(s)\n`);
