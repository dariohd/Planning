/**
 * Pont Google Apps Script pour synchroniser Planning ↔ Google Sheets.
 *
 * 1. Créer un nouveau projet Apps Script lié à un classeur Google Sheets
 * 2. Coller ce code, remplacer SPREADSHEET_ID si besoin
 * 3. Déployer > Nouvelle déploiement > Application Web
 *    - Exécuter en tant que : Moi
 *    - Qui a accès : Toute personne disposant du lien
 * 4. Copier l'URL dans Paramètres > Données > URL Web App GAS
 */

const SPREADSHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();
const TABS = ['Personnel', 'Presences', 'Users', 'CapaReel', 'Config', 'Meta'];

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || 'ping';
  if (action === 'ping') {
    return jsonResponse({ ok: true, message: 'Planning Sheets Bridge actif' });
  }
  if (action === 'export') {
    return jsonResponse(exportSnapshot());
  }
  return jsonResponse({ error: 'Action inconnue' });
}

function doPost(e) {
  const body = e.postData ? JSON.parse(e.postData.contents) : {};
  if (body.action === 'import' && body.data) {
    importSnapshot(body.data);
    return jsonResponse({ success: true });
  }
  return jsonResponse({ error: 'Action invalide' });
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function ensureTabs() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const existing = ss.getSheets().map(function(s) { return s.getName(); });
  TABS.forEach(function(name) {
    if (existing.indexOf(name) === -1) ss.insertSheet(name);
  });
}

function exportSnapshot() {
  ensureTabs();
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var personnel = sheetToObjects(ss.getSheetByName('Personnel'));
  var presences = parsePresences(ss.getSheetByName('Presences'));
  var users = sheetToObjects(ss.getSheetByName('Users'));
  var capaReel = sheetToObjects(ss.getSheetByName('CapaReel'));
  var configSheet = ss.getSheetByName('Config');
  var config = {};
  if (configSheet && configSheet.getLastRow() > 1) {
    try { config = JSON.parse(configSheet.getRange(2, 1).getValue()); } catch (err) {}
  }
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    personnel: personnel,
    presences: presences,
    users: users,
    capaReel: capaReel,
    appMeta: [],
    config: config
  };
}

function sheetToObjects(sheet) {
  if (!sheet || sheet.getLastRow() < 2) return [];
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  return data.slice(1).map(function(row) {
    var obj = {};
    headers.forEach(function(h, i) { obj[h] = row[i] != null ? String(row[i]) : ''; });
    return obj;
  });
}

function parsePresences(sheet) {
  if (!sheet || sheet.getLastRow() < 2) return [];
  var data = sheet.getDataRange().getValues();
  var out = [];
  data.slice(1).forEach(function(row) {
    var personnelId = row[0];
    var year = row[1];
    if (!personnelId || !year) return;
    for (var m = 1; m <= 12; m++) {
      var cell = row[m + 1];
      if (!cell) continue;
      try {
        var monthData = JSON.parse(cell);
        for (var day in monthData) {
          var dayData = monthData[day];
          var status = typeof dayData === 'string' ? dayData : dayData.s;
          if (!status) continue;
          var date = year + '-' + String(m).padStart(2, '0') + '-' + String(day).padStart(2, '0');
          out.push({
            id: personnelId + '-' + date,
            personnelId: personnelId,
            date: date,
            status: status,
            location: dayData.loc || null,
            comment: dayData.c || null,
            hs: dayData.hs != null ? String(dayData.hs) : null
          });
        }
      } catch (err) {}
    }
  });
  return out;
}

function importSnapshot(snapshot) {
  ensureTabs();
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  writeObjects(ss.getSheetByName('Personnel'), snapshot.personnel || []);
  writePresences(ss.getSheetByName('Presences'), snapshot.presences || []);
  writeObjects(ss.getSheetByName('Users'), snapshot.users || []);
  writeObjects(ss.getSheetByName('CapaReel'), snapshot.capaReel || []);

  var configSheet = ss.getSheetByName('Config');
  configSheet.clear();
  configSheet.getRange(1, 1, 2, 1).setValues([['json'], [JSON.stringify(snapshot.config || {})]]);

  var metaSheet = ss.getSheetByName('Meta');
  metaSheet.clear();
  metaSheet.getRange(1, 1, 2, 1).setValues([['exportedAt'], [snapshot.exportedAt || new Date().toISOString()]]);
}

function writeObjects(sheet, rows) {
  sheet.clear();
  if (!rows.length) return;
  var headers = Object.keys(rows[0]);
  var values = [headers].concat(rows.map(function(r) {
    return headers.map(function(h) { return r[h] != null ? r[h] : ''; });
  }));
  sheet.getRange(1, 1, values.length, headers.length).setValues(values);
}

function writePresences(sheet, presences) {
  var byKey = {};
  presences.forEach(function(p) {
    var year = p.date.slice(0, 4);
    var month = parseInt(p.date.slice(5, 7), 10);
    var day = String(parseInt(p.date.slice(8, 10), 10));
    var key = p.personnelId + '|' + year;
    if (!byKey[key]) byKey[key] = { personnelId: p.personnelId, year: year, months: {} };
    if (!byKey[key].months[month]) byKey[key].months[month] = {};
    var dayData = { s: p.status };
    if (p.comment) dayData.c = p.comment;
    if (p.hs) dayData.hs = p.hs;
    if (p.location) dayData.loc = p.location;
    byKey[key].months[month][day] = dayData;
  });

  var header = ['personnelId', 'year'];
  for (var m = 1; m <= 12; m++) header.push('m' + m);
  var values = [header];
  Object.keys(byKey).forEach(function(key) {
    var item = byKey[key];
    var row = [item.personnelId, item.year];
    for (var mi = 1; mi <= 12; mi++) {
      row.push(item.months[mi] ? JSON.stringify(item.months[mi]) : '');
    }
    values.push(row);
  });
  sheet.clear();
  if (values.length) sheet.getRange(1, 1, values.length, header.length).setValues(values);
}
