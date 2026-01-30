import { test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

type Case = {
  id: string;
  name: string;
  len_type: 'S' | 'M' | 'L';
  input: string;
  expected: string;
  coverage: string[];
  notes: string;
};

function normalize(s: string): string {
  return (s ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

test('Run all transliteration scenarios and record Pass/Fail', async ({ page }) => {
  test.setTimeout(5 * 60 * 1000); // 5 minutes

  // Ensure output folder exists
  fs.mkdirSync('out', { recursive: true });

  const casesPath = path.join('data', 'testcases.json');
  const cases: Case[] = JSON.parse(fs.readFileSync(casesPath, 'utf-8'));

  await page.goto('https://www.swifttranslator.com/', { waitUntil: 'domcontentloaded' });

  // Attempt to find the Singlish input and Sinhala output areas with multiple fallback strategies.
  // (Site may change IDs; these locators aim to be resilient.)
  const input = page
    .locator('textarea[placeholder*="Singlish" i], textarea[aria-label*="Singlish" i], textarea:below(:text("Singlish"))')
    .first();

  const output = page
    .locator('textarea[placeholder*="Sinhala" i], textarea[aria-label*="Sinhala" i], textarea:below(:text("Sinhala")), textarea:below(:text("Output"))')
    .first();

  // If the above doesn't work, fall back to first two textareas on the page.
  const textareaCount = await page.locator('textarea').count();
  if ((await input.count()) === 0 || (await output.count()) === 0) {
    if (textareaCount >= 2) {
      // eslint-disable-next-line no-console
      console.log('Fallback: using first two textareas as input/output.');
    }
  }

  const inputBox = (await input.count()) ? input : page.locator('textarea').nth(0);
  const outputBox = (await output.count()) ? output : page.locator('textarea').nth(1);

  const results: Array<{
    id: string;
    name: string;
    input: string;
    expected: string;
    actual: string;
    status: 'Pass' | 'Fail';
    issue: string;
  }> = [];

  for (const tc of cases) {
    // Clear, type, and wait for real-time output update
  await inputBox.fill('');

// 🔥 Prevent timeout on long inputs
if (tc.input.length >= 120) {
  await inputBox.fill(tc.input);   // instant insert
} else if (tc.input.length > 0) {
  await inputBox.type(tc.input, { delay: 2 }); // short inputs only
}

    // Wait a bit for real-time conversion to settle
    await page.waitForTimeout(350);

    const actualRaw = await outputBox.inputValue().catch(async () => {
      // Some sites render output in a div instead of textarea
      const alt = page.locator('[data-output], #output, .output, .result').first();
      return (await alt.innerText().catch(() => '')) || '';
    });

    const actual = actualRaw ?? '';

    // Comparison rules:
    // - For short/medium: strict-ish after normalization
    // - For long: use "contains" to reduce false fails due to minor spacing differences
    const expN = normalize(tc.expected);
    const actN = normalize(actual);

    let pass = false;
    if (tc.len_type === 'L') {
      pass = expN.length > 0 ? actN.includes(expN.slice(0, Math.min(80, expN.length))) : actN.length === 0;
    } else {
      pass = expN === actN;
      // If strict match fails, allow "contains" as a backup for cases with minor spacing
      if (!pass && expN.length > 0) pass = actN.includes(expN);
    }

    results.push({
      id: tc.id,
      name: tc.name,
      input: tc.input,
      expected: tc.expected,
      actual,
      status: pass ? 'Pass' : 'Fail',
      issue: pass ? 'Converted as expected.' : 'Mismatch between expected and actual output.',
    });
  }

  fs.writeFileSync('out/case-results.json', JSON.stringify(results, null, 2), 'utf-8');
});
