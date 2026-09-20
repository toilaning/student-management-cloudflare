/**
 * Google Apps Script Database Helper
 * Handles batch read/write, locking, header mapping, and low-level sheet operations.
 */

var Database = (function () {
  /**
   * Get Spreadsheet instance
   */
  function getSpreadsheet() {
    return SpreadsheetApp.getActiveSpreadsheet();
  }

  /**
   * Get Sheet by name, auto-create from schema if not exists
   */
  function getSheet(sheetName) {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      if (typeof SHEETS_SCHEMA !== "undefined" && SHEETS_SCHEMA[sheetName]) {
        sheet = ss.insertSheet(sheetName);
        var headers = SHEETS_SCHEMA[sheetName];
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        sheet.setFrozenRows(1);
      } else {
        throw new Error("Sheet not found: " + sheetName);
      }
    }
    return sheet;
  }

  /**
   * Build header-to-column index mapping (0-based)
   */
  function getHeaderMap(sheet) {
    var lastCol = sheet.getLastColumn();
    if (lastCol === 0) return {};
    var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    var map = {};
    for (var i = 0; i < headers.length; i++) {
      var header = String(headers[i]).trim();
      if (header) {
        map[header] = i;
      }
    }
    return map;
  }

  /**
   * Read all data rows as Array of Objects
   */
  function readAll(sheetName) {
    var sheet = getSheet(sheetName);
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    if (lastRow <= 1 || lastCol === 0) {
      return [];
    }

    var values = sheet.getRange(1, 1, lastRow, lastCol).getValues();
    var headers = values[0];
    var results = [];

    for (var r = 1; r < values.length; r++) {
      var row = values[r];
      // Skip completely empty rows
      var isEmpty = true;
      for (var c = 0; c < row.length; c++) {
        if (row[c] !== "" && row[c] !== null && row[c] !== undefined) {
          isEmpty = false;
          break;
        }
      }
      if (isEmpty) continue;

      var obj = {};
      for (var h = 0; h < headers.length; h++) {
        var key = String(headers[h]).trim();
        if (key) {
          var val = row[h];
          if (val instanceof Date) {
            val = val.toISOString();
          }
          obj[key] = val;
        }
      }
      results.push(obj);
    }
    return results;
  }

  /**
   * Find a single record by field value
   */
  function findOne(sheetName, field, value) {
    var all = readAll(sheetName);
    for (var i = 0; i < all.length; i++) {
      if (String(all[i][field]) === String(value)) {
        return all[i];
      }
    }
    return null;
  }

  /**
   * Find multiple records by field value
   */
  function findWhere(sheetName, predicate) {
    var all = readAll(sheetName);
    return all.filter(predicate);
  }

  /**
   * Insert a single row with LockService
   */
  function insert(sheetName, record) {
    var lock = LockService.getScriptLock();
    try {
      lock.waitLock(10000);
      var sheet = getSheet(sheetName);
      var headerMap = getHeaderMap(sheet);
      var lastCol = sheet.getLastColumn();
      var rowData = new Array(lastCol);

      for (var i = 0; i < lastCol; i++) {
        rowData[i] = "";
      }

      for (var key in record) {
        if (headerMap.hasOwnProperty(key)) {
          var colIdx = headerMap[key];
          var val = record[key];
          if (Array.isArray(val) || (typeof val === "object" && val !== null && !(val instanceof Date))) {
            val = JSON.stringify(val);
          }
          rowData[colIdx] = val !== undefined && val !== null ? val : "";
        }
      }

      sheet.appendRow(rowData);
      return record;
    } finally {
      lock.releaseLock();
    }
  }

  /**
   * Batch insert multiple rows
   */
  function batchInsert(sheetName, records) {
    if (!records || records.length === 0) return [];
    var lock = LockService.getScriptLock();
    try {
      lock.waitLock(30000);
      var sheet = getSheet(sheetName);
      var headerMap = getHeaderMap(sheet);
      var lastCol = sheet.getLastColumn();
      var rowsData = [];

      for (var r = 0; r < records.length; r++) {
        var rec = records[r];
        var row = new Array(lastCol);
        for (var c = 0; c < lastCol; c++) {
          row[c] = "";
        }
        for (var key in rec) {
          if (headerMap.hasOwnProperty(key)) {
            var colIdx = headerMap[key];
            var val = rec[key];
            if (Array.isArray(val) || (typeof val === "object" && val !== null && !(val instanceof Date))) {
              val = JSON.stringify(val);
            }
            row[colIdx] = val !== undefined && val !== null ? val : "";
          }
        }
        rowsData.push(row);
      }

      var startRow = sheet.getLastRow() + 1;
      sheet.getRange(startRow, 1, rowsData.length, lastCol).setValues(rowsData);
      return records;
    } finally {
      lock.releaseLock();
    }
  }

  /**
   * Update a single row identified by id (assuming id is in first col or identified by header)
   */
  function update(sheetName, id, updates) {
    var lock = LockService.getScriptLock();
    try {
      lock.waitLock(10000);
      var sheet = getSheet(sheetName);
      var lastRow = sheet.getLastRow();
      var lastCol = sheet.getLastColumn();
      if (lastRow <= 1 || lastCol === 0) return null;

      var values = sheet.getRange(1, 1, lastRow, lastCol).getValues();
      var headers = values[0];
      var idColIdx = headers.indexOf("id");
      if (idColIdx === -1) idColIdx = 0;

      var targetRow = -1;
      for (var r = 1; r < values.length; r++) {
        if (String(values[r][idColIdx]) === String(id)) {
          targetRow = r + 1; // 1-based index in Sheet
          break;
        }
      }

      if (targetRow === -1) {
        return null; // Not found
      }

      var currentRowData = values[targetRow - 1];
      var headerMap = {};
      for (var h = 0; h < headers.length; h++) {
        headerMap[headers[h]] = h;
      }

      for (var key in updates) {
        if (headerMap.hasOwnProperty(key)) {
          var colIdx = headerMap[key];
          var val = updates[key];
          if (Array.isArray(val) || (typeof val === "object" && val !== null && !(val instanceof Date))) {
            val = JSON.stringify(val);
          }
          currentRowData[colIdx] = val !== undefined && val !== null ? val : "";
        }
      }

      sheet.getRange(targetRow, 1, 1, lastCol).setValues([currentRowData]);

      // Construct return updated object
      var updatedObj = {};
      for (var i = 0; i < headers.length; i++) {
        updatedObj[headers[i]] = currentRowData[i];
      }
      return updatedObj;
    } finally {
      lock.releaseLock();
    }
  }

  /**
   * Batch update rows identified by id
   */
  function batchUpdate(sheetName, items) {
    if (!items || items.length === 0) return [];
    var lock = LockService.getScriptLock();
    try {
      lock.waitLock(30000);
      var sheet = getSheet(sheetName);
      var lastRow = sheet.getLastRow();
      var lastCol = sheet.getLastColumn();
      if (lastRow <= 1 || lastCol === 0) return [];

      var values = sheet.getRange(1, 1, lastRow, lastCol).getValues();
      var headers = values[0];
      var idColIdx = headers.indexOf("id");
      if (idColIdx === -1) idColIdx = 0;

      var headerMap = {};
      for (var h = 0; h < headers.length; h++) {
        headerMap[headers[h]] = h;
      }

      var idToRowIndex = {};
      for (var r = 1; r < values.length; r++) {
        var rowId = String(values[r][idColIdx]);
        if (rowId) {
          idToRowIndex[rowId] = r;
        }
      }

      var updatedCount = 0;
      for (var i = 0; i < items.length; i++) {
        var item = items[i];
        var rIdx = idToRowIndex[String(item.id)];
        if (rIdx !== undefined) {
          for (var key in item) {
            if (headerMap.hasOwnProperty(key)) {
              var cIdx = headerMap[key];
              var val = item[key];
              if (Array.isArray(val) || (typeof val === "object" && val !== null && !(val instanceof Date))) {
                val = JSON.stringify(val);
              }
              values[rIdx][cIdx] = val !== undefined && val !== null ? val : "";
            }
          }
          updatedCount++;
        }
      }

      if (updatedCount > 0) {
        sheet.getRange(1, 1, lastRow, lastCol).setValues(values);
      }

      return items;
    } finally {
      lock.releaseLock();
    }
  }

  /**
   * Delete row by id
   */
  function deleteOne(sheetName, id) {
    var lock = LockService.getScriptLock();
    try {
      lock.waitLock(10000);
      var sheet = getSheet(sheetName);
      var lastRow = sheet.getLastRow();
      var lastCol = sheet.getLastColumn();
      if (lastRow <= 1 || lastCol === 0) return false;

      var values = sheet.getRange(1, 1, lastRow, lastCol).getValues();
      var headers = values[0];
      var idColIdx = headers.indexOf("id");
      if (idColIdx === -1) idColIdx = 0;

      for (var r = 1; r < values.length; r++) {
        if (String(values[r][idColIdx]) === String(id)) {
          sheet.deleteRow(r + 1); // 1-based row index
          return true;
        }
      }
      return false;
    } finally {
      lock.releaseLock();
    }
  }

  /**
   * Clear all content except headers
   */
  function clearData(sheetName) {
    var lock = LockService.getScriptLock();
    try {
      lock.waitLock(10000);
      var sheet = getSheet(sheetName);
      var lastRow = sheet.getLastRow();
      var lastCol = sheet.getLastColumn();
      if (lastRow > 1 && lastCol > 0) {
        sheet.getRange(2, 1, lastRow - 1, lastCol).clearContent();
      }
    } finally {
      lock.releaseLock();
    }
  }

  return {
    getSheet: getSheet,
    getHeaderMap: getHeaderMap,
    readAll: readAll,
    findOne: findOne,
    findWhere: findWhere,
    insert: insert,
    batchInsert: batchInsert,
    update: update,
    batchUpdate: batchUpdate,
    deleteOne: deleteOne,
    clearData: clearData
  };
})();
