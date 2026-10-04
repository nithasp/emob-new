import ExcelJS from 'exceljs';
import { CellValue, SheetData, SheetSpec } from '../../types/pipeline.types';
import { AppError } from '../../utils/errors';
import { extensionOf } from '../storage/keys';

const MAX_ROWS = 20_000;
const CSV_DELIMITERS = [',', ';', '\t', '|'];

// Excel writes a byte-order mark at the start of a CSV, and needs one to read Thai text correctly
const BOM = String.fromCharCode(0xfeff);
const BOM_PATTERN = new RegExp(`^${BOM}`);

// ExcelJS hands back an object for rich text, formulas and hyperlinks; a planner only ever means
// the text they see in the cell
function plainValue(value: ExcelJS.CellValue): CellValue {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean' || value instanceof Date) return value;
  if (typeof value === 'object') {
    if ('richText' in value)
      return value.richText
        .map((part) => part.text)
        .join('')
        .trim();
    if ('result' in value) return plainValue(value.result as ExcelJS.CellValue);
    if ('text' in value) return String(value.text).trim();
    if ('error' in value) return null;
  }
  return String(value);
}

function parseCsvLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let current = '';
  let quoted = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (char === delimiter && !quoted) {
      cells.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

function readCsv(content: Buffer): SheetData {
  const lines = content
    .toString('utf8')
    .replace(BOM_PATTERN, '')
    .split(/\r\n|\n|\r/)
    .filter((line) => line.trim() !== '');
  const headerLine = lines[0];
  if (!headerLine) return { headers: [], rows: [] };

  const delimiter =
    CSV_DELIMITERS.map((candidate) => ({ candidate, count: headerLine.split(candidate).length })).sort(
      (a, b) => b.count - a.count,
    )[0]?.candidate ?? ',';

  const headers = parseCsvLine(headerLine, delimiter).filter(Boolean);
  const rows = lines.slice(1, MAX_ROWS + 1).map((line) => {
    const cells = parseCsvLine(line, delimiter);
    return Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? null]));
  });
  return { headers, rows };
}

async function readXlsx(content: Buffer): Promise<SheetData> {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(content as unknown as ExcelJS.Buffer);
  } catch {
    throw new AppError('The file could not be read as an Excel workbook (.xlsx)', 400, 'invalid_request');
  }

  const worksheet =
    workbook.worksheets.find((sheet) => sheet.getRow(1).cellCount > 0) ?? workbook.worksheets[0];
  if (!worksheet) return { headers: [], rows: [] };

  const columns: Array<{ index: number; header: string }> = [];
  worksheet.getRow(1).eachCell((cell, index) => {
    const header = plainValue(cell.value);
    if (typeof header === 'string' && header) columns.push({ index, header });
  });

  const rows: Array<Record<string, unknown>> = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1 || rows.length >= MAX_ROWS) return;
    const record: Record<string, unknown> = {};
    let hasValue = false;
    for (const { index, header } of columns) {
      const value = plainValue(row.getCell(index).value);
      record[header] = value;
      if (value !== null && value !== '') hasValue = true;
    }
    if (hasValue) rows.push(record);
  });

  return { headers: columns.map((column) => column.header), rows };
}

export async function readSheet(content: Buffer, fileName: string): Promise<SheetData> {
  const extension = extensionOf(fileName);
  if (extension === 'csv') return readCsv(content);
  if (extension === 'xlsx') return readXlsx(content);
  throw new AppError(
    `Unsupported file type ".${extension}". Upload an .xlsx or .csv file.`,
    400,
    'invalid_request',
  );
}

export async function buildWorkbook(sheets: SheetSpec[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'E-Mobility Route Planner';

  for (const spec of sheets) {
    const worksheet = workbook.addWorksheet(spec.name);
    worksheet.addRow(spec.headers);
    worksheet.getRow(1).font = { bold: true };
    for (const row of spec.rows) worksheet.addRow(row);
    spec.headers.forEach((header, index) => {
      worksheet.getColumn(index + 1).width = spec.columnWidths?.[index] ?? Math.max(12, header.length + 4);
    });
  }
  return Buffer.from((await workbook.xlsx.writeBuffer()) as ArrayBuffer);
}

const csvCell = (value: CellValue): string => {
  if (value === null) return '';
  const text = value instanceof Date ? value.toISOString() : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export function buildCsv(headers: string[], rows: CellValue[][]): Buffer {
  const lines = [headers, ...rows].map((row) => row.map(csvCell).join(','));
  return Buffer.from(`${BOM}${lines.join('\r\n')}\r\n`, 'utf8');
}

export const text = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim();
};
