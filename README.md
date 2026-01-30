# ITPM Assignment 1 – SwiftTranslator (Singlish → Sinhala) Playwright Automation

This repository contains Playwright automation for functional + UI test scenarios for:
https://www.swifttranslator.com/

## Prerequisites
- Node.js 18+ (recommended)
- npm 9+

## Setup
```bash
npm install
npx playwright install
```

## Run tests (and export Excel)
```bash
npm run test:excel
```

Outputs:
- `out/results.json` (raw run results)
- `out/IT28XXXXX_TestCases_Executed.xlsx` (filled template with Actual Output + Status)

## Notes
- The test script **does not fail the whole run** when a scenario fails. Instead, it records Pass/Fail per test case in the exported Excel (matches assignment requirement).
- Update your registration number by renaming files before submission.
