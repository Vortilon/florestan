# Cursor Agent for UI Best Practices Verification

This guide explains how to set up a Cursor agent to automatically verify UI best practices whenever changes are made to the codebase.

## Overview

You can use Cursor's Rules feature or a custom agent to enforce UI/UX best practices. Here are two approaches:

## Approach 1: Using Cursor Rules (Recommended)

Create a `.cursorrules` file in your project root with UI best practices:

```markdown
# UI/UX Best Practices Rules

## Layout & Responsiveness
- NO horizontal scroll: Use overflow-x-auto wrapper divs for tables, not the page body
- Tables MUST be wrapped in responsive containers: `<div class="overflow-x-auto -mx-1">`
- Field widths: Use appropriate grid columns (grid-cols-1 sm:grid-cols-2 lg:grid-cols-3) - don't use full width for single number inputs
- Max content width: Use max-w-6xl or max-w-7xl for main containers, not full width

## Typography
- Headings: Use text-sm md:text-base for h3, text-base md:text-lg for h2 (not text-xl or text-2xl)
- Body text: Use text-xs for labels, text-sm for inputs
- Font weights: Use font-semibold for headings, font-medium for labels

## Spacing & Sizing
- Padding: Use p-3 md:p-4 for sections (not p-4 md:p-6)
- Margins: Use mb-3 or mb-4 between sections (not mb-6)
- Button sizes: min-h-[36px] for mobile, can be smaller (not always 44px)
- Input padding: Use px-2.5 py-1.5 (not px-3 py-2)

## Colors & Borders
- Borders: Use border-slate-200 for containers, border-slate-300 for inputs
- Backgrounds: Use bg-white for cards, bg-slate-50 for alternating sections
- Text colors: text-slate-900 for headings, text-slate-600 for labels, text-slate-700 for body

## Form Fields
- Input styling: rounded-md (not rounded-lg), proper focus states with focus:ring-1
- Labels: text-[11px] font-medium text-slate-600 (not uppercase with tracking-wide)
- Required fields: Use <span class="text-red-500">*</span> after label

## Tables
- Header: bg-slate-50, text-xs font-semibold text-slate-700
- Rows: hover:bg-slate-50 for interactivity
- Cells: px-3 py-2, whitespace-nowrap where appropriate
- Table wrapper: overflow-x-auto with -mx-1 to prevent page scroll

## Navigation
- Tabs: text-xs font-semibold, px-3 py-2
- Section menu: Compact, easy to access on mobile
- Fixed headers/footers: Use sticky positioning appropriately

## Performance
- Use Tailwind utility classes, not custom CSS when possible
- Avoid inline styles
- Use semantic HTML

When reviewing code changes, flag any violations of these rules.
```

## Approach 2: Custom Agent Script

Create a script that runs on file changes:

### `.cursor/agents/ui-checker.js`

```javascript
// UI Best Practices Checker
// Run this with: node .cursor/agents/ui-checker.js <file-path>

const fs = require('fs');
const path = process.argv[2];

if (!path || !fs.existsSync(path)) {
  console.error('File not found');
  process.exit(1);
}

const content = fs.readFileSync(path, 'utf8');
const issues = [];

// Check for horizontal scroll issues
if (content.includes('overflow-x:') && !content.includes('overflow-x-auto')) {
  issues.push('⚠️  Potential horizontal scroll - use overflow-x-auto wrapper for tables');
}

// Check for oversized fonts
const oversizedFonts = content.match(/text-(xl|2xl|3xl)/g);
if (oversizedFonts) {
  issues.push(`⚠️  Oversized fonts found: ${oversizedFonts.join(', ')} - use text-sm/text-base instead`);
}

// Check for excessive padding
const excessivePadding = content.match(/p-[6-9]|px-[6-9]|py-[6-9]/g);
if (excessivePadding) {
  issues.push(`⚠️  Excessive padding: ${excessivePadding.join(', ')} - use p-3/p-4 instead`);
}

// Check for full-width single inputs
if (content.includes('w-full') && content.match(/type=["']number["']/)) {
  const context = content.match(/type=["']number["'][^>]*class=["'][^"']*w-full/g);
  if (context && !context[0].includes('max-w')) {
    issues.push('⚠️  Full-width number inputs - consider max-w-[120px] or grid columns');
  }
}

// Check table responsiveness
if (content.includes('<table') && !content.includes('overflow-x-auto')) {
  issues.push('⚠️  Tables should be wrapped in overflow-x-auto container');
}

// Check label styling
if (content.match(/label[^>]*uppercase[^>]*tracking-wide/)) {
  issues.push('⚠️  Avoid uppercase tracking-wide labels - use normal case with text-[11px]');
}

if (issues.length > 0) {
  console.log('\n🔍 UI Best Practices Issues Found:\n');
  issues.forEach(issue => console.log(issue));
  console.log('\n');
  process.exit(1);
} else {
  console.log('✅ No UI issues detected');
  process.exit(0);
}
```

### Using with Git Hooks

Add to `.git/hooks/pre-commit`:

```bash
#!/bin/bash
# Check UI best practices before commit

changed_files=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(html|jsx?|tsx?)$')

for file in $changed_files; do
  if [ -f "$file" ]; then
    node .cursor/agents/ui-checker.js "$file"
    if [ $? -ne 0 ]; then
      echo "❌ UI checks failed. Fix issues before committing."
      exit 1
    fi
  fi
done
```

## Approach 3: Cursor Composer Rules

When using Cursor Composer, you can add context in your prompt:

```
@.cursorrules Please review this change and ensure it follows our UI best practices:
- No horizontal scroll
- Proper font sizes (text-sm/text-base, not text-xl)
- Appropriate field widths (grid columns, not full width for numbers)
- Proper spacing (p-3/p-4, mb-3/mb-4)
- Tables wrapped in overflow-x-auto
```

## Implementation Steps

1. **Create `.cursorrules` file** in project root with the rules above
2. **Test it**: Make a change that violates rules and see if Cursor flags it
3. **Refine rules**: Add more specific checks based on your needs
4. **Optional**: Set up the script-based checker for automated verification

## Best Practices for Using Cursor

1. **Use @ symbol** to reference files: `@inspection-form.html fix the styling`
2. **Use .cursorrules** for project-wide guidelines
3. **Use Composer** for complex multi-file changes
4. **Ask for explanations**: "Why did you use grid-cols-3 here?"
5. **Iterate**: Ask for refinements - "Make it more compact"

## Example Commands

```
# Fix styling issues
@inspection-form.html fix font sizes to use text-sm/text-base instead of text-xl

# Check responsiveness
@form-loader.js ensure tables don't cause horizontal scroll

# Improve layout
Make all form sections use proper spacing (p-3 md:p-4, mb-4) and appropriate grid columns
```

## Current Violations to Watch For

Based on your feedback, always check:
- ✅ Font sizes (should be text-sm/text-base, not text-xl/text-2xl)
- ✅ Spacing (should be p-3/p-4, mb-3/mb-4, not p-6/mb-6)
- ✅ Table overflow (must have overflow-x-auto wrapper)
- ✅ Field widths (use grid columns, not w-full for numbers)
- ✅ Colors (use slate-200/slate-300 for borders, not slate-400)
- ✅ Border radius (use rounded-md, not rounded-lg for inputs)

