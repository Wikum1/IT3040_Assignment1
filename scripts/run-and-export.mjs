import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import ExcelJS from 'exceljs';

function safeReadJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

function bulletJoin(arr) {
  return arr.map(x => `• ${x}`).join('\n');
}

fs.mkdirSync('out', { recursive: true });

// 1) Run Playwright
execSync('npx playwright test', { stdio: 'inherit' });

// 2) Load template data and run results
const cases = safeReadJson(path.join('data', 'testcases.json'));
const results = safeReadJson(path.join('out', 'case-results.json'));

// Map by TC ID
const byId = new Map(results.map(r => [r.id, r]));

// 3) Build Excel in required template format
const wb = new ExcelJS.Workbook();
const ws = wb.addWorksheet('TestCases');

const columns = [
  { header: 'TC ID', key: 'id', width: 16 },
  { header: 'Test case name', key: 'name', width: 40 },
  { header: 'Input length type', key: 'len_type', width: 16 },
  { header: 'Input', key: 'input', width: 50 },
  { header: 'Expected output', key: 'expected', width: 40 },
  { header: 'Actual output', key: 'actual', width: 40 },
  { header: 'Status', key: 'status', width: 10 },
  { header: 'Accuracy justification/ Description of issue type', key: 'notes', width: 45 },
  { header: 'What is covered by the test', key: 'coverage', width: 40 },
];

ws.columns = columns;

for (const tc of cases) {
  const r = byId.get(tc.id);
  ws.addRow({
    id: tc.id,
    name: tc.name,
    len_type: tc.len_type,
    input: tc.input,
    expected: tc.expected,
    actual: r?.actual ?? '',
    status: r?.status ?? '',
    notes: r?.status === 'Pass' ? tc.notes : (tc.notes ? `${tc.notes} | ${r?.issue ?? ''}` : (r?.issue ?? '')),
    coverage: bulletJoin(tc.coverage),
  });
}

// Basic header styling
ws.getRow(1).font = { bold: true };

// Wrap text for wide cells
['D','E','F','H','I'].forEach(col => {
  ws.getColumn(col).alignment = { wrapText: true, vertical: 'top' };
});
ws.eachRow((row, rowNumber) => {
  if (rowNumber > 1) row.height = 48;
});

const outFile = path.join('out', 'IT23650220_TestCases_Executed.xlsx');


await wb.xlsx.writeFile(outFile);

console.log(`\n✅ Excel exported: ${outFile}\n`);
