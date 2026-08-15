// frontend/src/utils/export.js

/**
 * Escapes CSV values to handle commas, quotes, and newlines.
 * @param {string|number} value - The value to escape.
 * @returns {string} The escaped CSV value.
 */
const escapeCsvValue = (value) => {
  if (value === null || value === undefined) return '""';
  const stringValue = String(value);
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return `"${stringValue}"`;
};

/**
 * Generates a CSV file and triggers a browser download.
 * @param {string} filename - The name of the file to save (without .csv extension).
 * @param {Array<Object>} rows - Array of objects representing the rows.
 * @param {Array<Object>} headers - Array of objects { key, label } defining columns.
 */
export const exportToCSV = (filename, rows, headers) => {
  if (!rows || !rows.length) return;

  const headerRow = headers.map(h => escapeCsvValue(h.label)).join(',');
  const dataRows = rows.map(row => {
    return headers.map(h => escapeCsvValue(row[h.key])).join(',');
  });

  const csvContent = [headerRow, ...dataRows].join('\n');
  const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel UTF-8
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
