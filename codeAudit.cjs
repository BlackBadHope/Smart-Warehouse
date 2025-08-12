// Code audit script for Inventory OS
const fs = require('fs');
const path = require('path');

console.log('🔍 Starting Code Audit for Inventory OS v2.6');
console.log('=' .repeat(50));

const issues = [];

function addIssue(severity, file, line, message, suggestion) {
  issues.push({ severity, file, line, message, suggestion });
}

function auditFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  lines.forEach((line, index) => {
    const lineNum = index + 1;
    
    // Check for console.log (should use debugService)
    if (line.includes('console.log') && !filePath.includes('codeAudit.js')) {
      addIssue('MEDIUM', filePath, lineNum, 'Using console.log instead of debugService', 'Replace with debugService.info()');
    }
    
    // Check for console.error (should use debugService)
    if (line.includes('console.error') && !filePath.includes('codeAudit.js')) {
      addIssue('MEDIUM', filePath, lineNum, 'Using console.error instead of debugService', 'Replace with debugService.error()');
    }
    
    // Check for missing error handling
    if (line.includes('async ') && !line.includes('try') && !line.includes('catch')) {
      const nextLines = lines.slice(index, index + 10).join('\n');
      if (!nextLines.includes('try') && !nextLines.includes('catch')) {
        addIssue('LOW', filePath, lineNum, 'Async function without error handling', 'Add try-catch block');
      }
    }
    
    // Check for hardcoded URLs
    if (line.includes('http://') || line.includes('https://')) {
      if (!line.includes('172.29.240.1') && !line.includes('localhost')) {
        addIssue('MEDIUM', filePath, lineNum, 'Hardcoded URL found', 'Move to configuration');
      }
    }
    
    // Check for potential memory leaks
    if (line.includes('addEventListener') && !content.includes('removeEventListener')) {
      addIssue('HIGH', filePath, lineNum, 'Event listener without cleanup', 'Add removeEventListener in cleanup');
    }
    
    // Check for missing null checks
    if (line.includes('.find(') && !line.includes('||') && !line.includes('??')) {
      addIssue('MEDIUM', filePath, lineNum, 'Array.find() without null check', 'Add null handling');
    }
    
    // Check for deprecated React patterns
    if (line.includes('componentWillMount') || line.includes('componentWillReceiveProps')) {
      addIssue('HIGH', filePath, lineNum, 'Deprecated React lifecycle method', 'Update to modern React patterns');
    }
    
    // Check for missing TypeScript types
    if (line.includes(': any') && !line.includes('// @ts-')) {
      addIssue('MEDIUM', filePath, lineNum, 'Using "any" type', 'Define proper TypeScript types');
    }
    
    // Check for security issues
    if (line.includes('dangerouslySetInnerHTML')) {
      addIssue('HIGH', filePath, lineNum, 'Potential XSS vulnerability', 'Sanitize HTML content');
    }
    
    // Check for performance issues
    if (line.includes('JSON.parse(JSON.stringify(') || line.includes('JSON.stringify(JSON.parse(')) {
      addIssue('MEDIUM', filePath, lineNum, 'Inefficient deep copy', 'Use structuredClone() or proper deep copy library');
    }
  });
}

// Files to audit
const filesToAudit = [
  'InventoryApp.tsx',
  'services/selfTestService.ts',
  'services/themeService.ts',
  'services/claudeService.ts',
  'services/localStorageService.ts',
  'components/SelfTestModal.tsx',
  'components/ChatModal.tsx'
];

filesToAudit.forEach(file => {
  console.log(`🔍 Auditing ${file}...`);
  auditFile(path.join(__dirname, file));
});

// Check specific known issues
console.log('\n🎯 Checking for specific known issues...');

// Check themeService for designer mode bug
const themeServicePath = path.join(__dirname, 'services/themeService.ts');
if (fs.existsSync(themeServicePath)) {
  const themeContent = fs.readFileSync(themeServicePath, 'utf8');
  
  if (themeContent.includes('designerModeEnabled = true')) {
    addIssue('HIGH', 'services/themeService.ts', 0, 'Designer mode enabled by default', 'Set to false by default');
  }
  
  if (!themeContent.includes('disableDesignerMode()')) {
    addIssue('MEDIUM', 'services/themeService.ts', 0, 'Missing designer mode cleanup', 'Add disableDesignerMode() call');
  }
}

// Check for missing self-test integration
const inventoryAppPath = path.join(__dirname, 'InventoryApp.tsx');
if (fs.existsSync(inventoryAppPath)) {
  const appContent = fs.readFileSync(inventoryAppPath, 'utf8');
  
  if (!appContent.includes('SelfTestModal')) {
    addIssue('HIGH', 'InventoryApp.tsx', 0, 'Self-test modal not integrated', 'Import and use SelfTestModal component');
  }
  
  if (!appContent.includes('TestTube')) {
    addIssue('MEDIUM', 'InventoryApp.tsx', 0, 'Self-test button icon missing', 'Add TestTube icon import');
  }
}

// Report results
console.log('\n📊 AUDIT RESULTS');
console.log('-' .repeat(30));

const severityCounts = {
  HIGH: issues.filter(i => i.severity === 'HIGH').length,
  MEDIUM: issues.filter(i => i.severity === 'MEDIUM').length,
  LOW: issues.filter(i => i.severity === 'LOW').length
};

console.log(`🔴 HIGH Priority Issues: ${severityCounts.HIGH}`);
console.log(`🟡 MEDIUM Priority Issues: ${severityCounts.MEDIUM}`);
console.log(`🟢 LOW Priority Issues: ${severityCounts.LOW}`);
console.log(`📝 Total Issues: ${issues.length}`);

if (issues.length === 0) {
  console.log('🎉 No issues found! Code looks good.');
} else {
  console.log('\n📋 DETAILED ISSUES:');
  
  ['HIGH', 'MEDIUM', 'LOW'].forEach(severity => {
    const severityIssues = issues.filter(i => i.severity === severity);
    if (severityIssues.length === 0) return;
    
    console.log(`\n${severity === 'HIGH' ? '🔴' : severity === 'MEDIUM' ? '🟡' : '🟢'} ${severity} PRIORITY:`);
    
    severityIssues.forEach((issue, index) => {
      console.log(`  ${index + 1}. ${path.basename(issue.file)}:${issue.line || '?'}`);
      console.log(`     Issue: ${issue.message}`);
      console.log(`     Fix: ${issue.suggestion}`);
      console.log('');
    });
  });
}

// Check package.json for vulnerabilities
const packagePath = path.join(__dirname, 'package.json');
if (fs.existsSync(packagePath)) {
  const packageContent = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  console.log('\n📦 PACKAGE ANALYSIS:');
  console.log(`   App Version: ${packageContent.version}`);
  console.log(`   React Version: ${packageContent.dependencies?.react || 'Not found'}`);
  console.log(`   TypeScript: ${packageContent.devDependencies?.typescript || 'Not found'}`);
  console.log(`   Vite Version: ${packageContent.devDependencies?.vite || 'Not found'}`);
  
  // Check for security-sensitive packages
  const deps = { ...packageContent.dependencies, ...packageContent.devDependencies };
  const securityConcerns = [];
  
  Object.keys(deps).forEach(pkg => {
    if (pkg.includes('eval') || pkg.includes('unsafe')) {
      securityConcerns.push(pkg);
    }
  });
  
  if (securityConcerns.length > 0) {
    console.log(`⚠️  Security concerns: ${securityConcerns.join(', ')}`);
  } else {
    console.log('✅ No obvious security concerns in dependencies');
  }
}

console.log('\n🏁 Code audit completed!');

// Save results
const auditReport = {
  timestamp: new Date().toISOString(),
  totalIssues: issues.length,
  severityCounts,
  issues,
  recommendation: issues.length === 0 ? 'Ready for deployment' : 
    severityCounts.HIGH > 0 ? 'Fix HIGH priority issues before deployment' :
    'Consider fixing MEDIUM priority issues for better code quality'
};

fs.writeFileSync('audit-report.json', JSON.stringify(auditReport, null, 2));
console.log('💾 Detailed report saved to audit-report.json');