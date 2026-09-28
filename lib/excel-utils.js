/**
 * Parses registration numbers from admin remarks text using regex.
 * @param {string} remarksText 
 * @returns {Set<string>} Set of uppercase registration numbers found
 */
export const parseRegistrationNumbersFromRemarks = (remarksText) => {
  const regSet = new Set();
  if (!remarksText || typeof remarksText !== 'string') return regSet;

  const regNoRegex = /\b\d{2}[a-zA-Z]{3,4}\d{4}\b/g;
  const matches = remarksText.match(regNoRegex);
  if (matches) {
    matches.forEach(m => regSet.add(m.trim().toUpperCase()));
  }
  return regSet;
};

/**
 * Checks if a student registration number is matched in admin remarks.
 * @param {string} regNo 
 * @param {string} adminRemarks 
 * @returns {boolean}
 */
export const isStudentRemarkMatched = (regNo, adminRemarks) => {
  if (!regNo) return false;
  const cleanReg = String(regNo).trim().toUpperCase();
  if (!cleanReg) return false;
  
  if (adminRemarks) {
    const cleanRemarks = String(adminRemarks).toUpperCase();
    if (cleanRemarks.includes(cleanReg)) return true;
  }
  return false;
};

/**
 * Applies cell styles (headers, green fills for matched remarks, red fills for unmatched)
 * to a SheetJS worksheet object.
 * @param {object} ws - SheetJS worksheet
 * @param {Array<Array<any>>} wsData - 2D array data
 * @param {number} headerRowIndex - Index of header row
 * @param {number|null} [statusColIndex] - Index of status column to apply green/red styling
 */
export const applyExcelStyling = (ws, wsData, headerRowIndex = 0, statusColIndex = null) => {
  if (!ws || !Array.isArray(wsData)) return;

  const xlsxColName = (colIdx) => {
    let temp = '';
    let letter = '';
    while (colIdx >= 0) {
      temp = colIdx % 26;
      letter = String.fromCharCode(temp + 65) + letter;
      colIdx = Math.floor(colIdx / 26) - 1;
    }
    return letter;
  };

  wsData.forEach((row, rIdx) => {
    if (!Array.isArray(row)) return;

    row.forEach((cellVal, cIdx) => {
      const cellRef = `${xlsxColName(cIdx)}${rIdx + 1}`;
      if (!ws[cellRef]) return;

      // Base font and border
      const style = {
        font: { name: 'Calibri', sz: 11 },
        alignment: { vertical: 'center', horizontal: 'left' },
        border: {
          top: { style: 'thin', color: { rgb: 'E2E8F0' } },
          bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
          left: { style: 'thin', color: { rgb: 'E2E8F0' } },
          right: { style: 'thin', color: { rgb: 'E2E8F0' } }
        }
      };

      // Header row styling
      if (rIdx === headerRowIndex) {
        style.fill = { fgColor: { rgb: '1E3A8A' }, patternType: 'solid' };
        style.font = { name: 'Calibri', sz: 11, bold: true, color: { rgb: 'FFFFFF' } };
        style.alignment = { vertical: 'center', horizontal: 'center' };
      } 
      // Title rows (rows before header)
      else if (rIdx < headerRowIndex) {
        style.font = { name: 'Calibri', sz: 12, bold: true, color: { rgb: '0F172A' } };
      } 
      // Data rows: check status column / row highlighting
      else {
        const valStr = String(cellVal || '').toLowerCase();

        // Highlight based on Green / Red text indicators in cell or row status
        if (
          valStr.includes('green') ||
          valStr.includes('matched') ||
          valStr.includes('verified') ||
          valStr.includes('completed') ||
          valStr.includes('fully updated')
        ) {
          if (cIdx === statusColIndex || statusColIndex === null) {
            style.fill = { fgColor: { rgb: 'C6EFCE' }, patternType: 'solid' };
            style.font = { name: 'Calibri', sz: 11, bold: true, color: { rgb: '006100' } };
          }
        } else if (
          valStr.includes('red') ||
          valStr.includes('unmatched') ||
          valStr.includes('pending') ||
          valStr.includes('no remarks') ||
          valStr.includes('partially updated')
        ) {
          if (cIdx === statusColIndex || statusColIndex === null) {
            style.fill = { fgColor: { rgb: 'FFC7CE' }, patternType: 'solid' };
            style.font = { name: 'Calibri', sz: 11, bold: true, color: { rgb: '9C0006' } };
          }
        }
      }

      ws[cellRef].s = style;
    });
  });
};

/**
 * Auto-fits worksheet column widths based on cell content.
 * @param {Array<Array<any>>} wsData - 2D array of data passed to aoa_to_sheet
 * @param {number} [headerRowIndex] - Optional index of the header row (defaults to auto-detecting row with most columns)
 * @returns {Array<{ wch: number }>} Array of column width objects for worksheet['!cols']
 */
export const autoFitColumns = (wsData, headerRowIndex) => {
  if (!Array.isArray(wsData) || wsData.length === 0) return [];

  // If headerRowIndex is not explicitly passed, find the row with the most columns as the column definition row
  let hIdx = typeof headerRowIndex === 'number' ? headerRowIndex : 0;
  if (typeof headerRowIndex !== 'number') {
    let maxCols = 0;
    wsData.forEach((row, idx) => {
      if (Array.isArray(row) && row.length > maxCols) {
        maxCols = row.length;
        hIdx = idx;
      }
    });
  }

  const colWidths = [];

  // Measure all cells from header row downwards
  for (let r = hIdx; r < wsData.length; r++) {
    const row = wsData[r];
    if (!Array.isArray(row)) continue;

    row.forEach((cell, c) => {
      if (cell === null || cell === undefined) return;
      const str = String(cell).trim();
      if (!str) return;

      // Handle multiline strings: measure longest line
      const lines = str.split('\n');
      const maxLineLen = Math.max(...lines.map(l => l.length));

      colWidths[c] = Math.max(colWidths[c] || 0, maxLineLen);
    });
  }

  // Map to SheetJS col specs with generous padding and reasonable minimum/maximum bounds
  return colWidths.map(width => {
    const baseWidth = width || 10;
    // Add + 4 character padding so nothing touches the border or gets truncated
    const padded = baseWidth + 4;
    // Minimum 14 characters, maximum 70 characters so super long URLs don't stretch indefinitely
    return { wch: Math.min(Math.max(padded, 14), 70) };
  });
};
