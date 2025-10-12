// Q21 KI_HUB Workshop Registration - DEBUG VERSION
// ==================================================
// Diese Version enthält umfangreiches Logging zur Fehlersuche

// KONFIGURATION
const SHEET_NAME = 'Anmeldungen';
const EMAIL_FROM_NAME = 'Q21 KI_HUB';

// Hauptfunktion für POST-Requests (Anmeldungen)
function doPost(e) {
  try {
    Logger.log('=== POST REQUEST EMPFANGEN ===');
    Logger.log('POST Data: ' + e.postData.contents);
    
    const data = JSON.parse(e.postData.contents);
    Logger.log('Parsed data: ' + JSON.stringify(data));
    
    // Validierung
    if (!data.email || !data.date || !data.attendees) {
      Logger.log('FEHLER: Fehlende Pflichtfelder');
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'Fehlende Pflichtfelder'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // In Sheet speichern
    const sheet = getOrCreateSheet();
    const timestamp = new Date();
    
    const rowData = [
      timestamp,
      data.email,
      parseInt(data.attendees),    // Spalte C = Anzahl Teilnehmer
      data.date,                    // Spalte D = Datum (ISO)
      formatDate(data.date)         // Spalte E = Status/Datum (Formatiert)
    ];
    
    Logger.log('Füge Zeile hinzu: ' + JSON.stringify(rowData));
    sheet.appendRow(rowData);
    Logger.log('Zeile erfolgreich hinzugefügt');
    
    // Bestätigungs-Email senden
    try {
      sendConfirmationEmail(data.email, data.date, data.attendees);
      Logger.log('Email erfolgreich versendet');
    } catch (emailError) {
      Logger.log('Email-Fehler: ' + emailError.toString());
      // Fortfahren, auch wenn Email fehlschlägt
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: 'Anmeldung erfolgreich gespeichert'
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    Logger.log('FEHLER bei doPost: ' + error.toString());
    Logger.log('Stack: ' + error.stack);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Hauptfunktion für GET-Requests (Statistiken)
function doGet(e) {
  try {
    Logger.log('=== GET REQUEST EMPFANGEN ===');
    Logger.log('Parameter: ' + JSON.stringify(e.parameter));
    
    const action = e.parameter.action;
    const callback = e.parameter.callback;
    
    if (action === 'getStats') {
      Logger.log('Statistiken werden abgerufen...');
      const stats = getStatistics();
      Logger.log('Statistiken berechnet: ' + JSON.stringify(stats));
      
      const response = {
        success: true,
        data: stats
      };
      
      // JSONP Response
      if (callback) {
        Logger.log('JSONP Response mit callback: ' + callback);
        return ContentService.createTextOutput(
          callback + '(' + JSON.stringify(response) + ')'
        ).setMimeType(ContentService.MimeType.JAVASCRIPT);
      }
      
      // Normale JSON Response
      Logger.log('JSON Response');
      return ContentService.createTextOutput(JSON.stringify(response))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    Logger.log('Unbekannte Aktion: ' + action);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: 'Unbekannte Aktion'
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    Logger.log('FEHLER bei doGet: ' + error.toString());
    Logger.log('Stack: ' + error.stack);
    
    const response = { 
      success: false, 
      error: error.toString(),
      stack: error.stack
    };
    
    if (e.parameter.callback) {
      return ContentService.createTextOutput(
        e.parameter.callback + '(' + JSON.stringify(response) + ')'
      ).setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    
    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Sheet erstellen oder abrufen
function getOrCreateSheet() {
  Logger.log('getOrCreateSheet aufgerufen');
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Logger.log('Spreadsheet ID: ' + ss.getId());
  
  let sheet = ss.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    Logger.log('Sheet existiert nicht, erstelle neues Sheet: ' + SHEET_NAME);
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(['Zeitstempel', 'Email', 'Anzahl Teilnehmer', 'Datum', 'Status']);
    sheet.getRange(1, 1, 1, 5).setFontWeight('bold');
    Logger.log('Neues Sheet erstellt mit Headern');
  } else {
    Logger.log('Sheet gefunden: ' + SHEET_NAME);
  }
  
  return sheet;
}

// Statistiken berechnen
function getStatistics() {
  Logger.log('=== STATISTIKEN BERECHNEN ===');
  
  const sheet = getOrCreateSheet();
  const data = sheet.getDataRange().getValues();
  
  Logger.log('Sheet hat ' + data.length + ' Zeilen (inkl. Header)');
  
  // Zeige erste paar Zeilen zur Überprüfung
  for (let i = 0; i < Math.min(5, data.length); i++) {
    Logger.log('Zeile ' + i + ': ' + JSON.stringify(data[i]));
  }
  
  const stats = {
    '2025-11-11': { anmeldungen: 0, teilnehmer: 0 },
    '2025-11-13': { anmeldungen: 0, teilnehmer: 0 },
    '2025-11-18': { anmeldungen: 0, teilnehmer: 0 }
  };
  
  // Überspringe Header-Zeile (Index 0)
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    
    // KORRIGIERTE SPALTEN-INDIZES
    const attendees = row[2]; // Spalte C = Anzahl Teilnehmer (Index 2)
    const date = row[3];      // Spalte D = Datum (Index 3)
    
    Logger.log('Zeile ' + i + ' - Rohdaten:');
    Logger.log('  Spalte C (Index 2, Teilnehmer): "' + attendees + '" (Typ: ' + typeof attendees + ')');
    Logger.log('  Spalte D (Index 3, Datum): "' + date + '" (Typ: ' + typeof date + ')');
    
    // Datum-Konvertierung wenn nötig
    let dateStr = date;
    if (date instanceof Date) {
      // Wenn es ein Date-Objekt ist, in ISO-String konvertieren
      dateStr = Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd');
      Logger.log('  Datum konvertiert zu: ' + dateStr);
    } else if (typeof date === 'string') {
      dateStr = date.trim();
      Logger.log('  Datum als String: "' + dateStr + '"');
    }
    
    // Teilnehmer-Konvertierung
    const attendeesNum = parseInt(attendees);
    Logger.log('  Teilnehmer als Zahl: ' + attendeesNum);
    
    // Prüfe ob das Datum in unserem Stats-Objekt existiert
    if (stats[dateStr] !== undefined) {
      if (!isNaN(attendeesNum) && attendeesNum > 0) {
        stats[dateStr].anmeldungen++;
        stats[dateStr].teilnehmer += attendeesNum;
        Logger.log('  ✅ Zeile ' + i + ' hinzugefügt zu Stats für ' + dateStr);
      } else {
        Logger.log('  ⚠️ Zeile ' + i + ' ignoriert: Teilnehmer ungültig');
      }
    } else {
      Logger.log('  ⚠️ Zeile ' + i + ' ignoriert: Datum "' + dateStr + '" nicht in Stats-Objekt');
      Logger.log('  Verfügbare Daten: ' + Object.keys(stats).join(', '));
    }
  }
  
  Logger.log('=== FINALE STATISTIKEN ===');
  Logger.log(JSON.stringify(stats, null, 2));
  
  return stats;
}

// Bestätigungs-Email senden
function sendConfirmationEmail(email, selectedDate, attendees) {
  const dateFormatted = formatDate(selectedDate);
  
  const subject = '🎉 Wir haben Deine Anmeldung erhalten!';
  
  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      text-align: center;
      border-radius: 10px 10px 0 0;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
    }
    .content {
      background: #f8f9fa;
      padding: 30px;
      border-radius: 0 0 10px 10px;
    }
    .info-box {
      background: white;
      border-left: 4px solid #667eea;
      padding: 20px;
      margin: 20px 0;
      border-radius: 5px;
    }
    .info-box h2 {
      margin-top: 0;
      color: #2c3e50;
      font-size: 18px;
    }
    .info-box p {
      margin: 10px 0;
      color: #666;
    }
    .info-box strong {
      color: #667eea;
    }
    .highlight {
      background: #e3f2fd;
      padding: 15px;
      border-radius: 5px;
      margin: 15px 0;
      border-left: 3px solid #2196F3;
    }
    .button {
      display: inline-block;
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      padding: 12px 30px;
      text-decoration: none;
      border-radius: 50px;
      margin: 15px 0;
      font-weight: bold;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      color: #666;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🚀 Wir haben Deine Anmeldung erhalten!</h1>
  </div>
  
  <div class="content">
    <p>Hallo!</p>
    
    <p>Vielen Dank für Deine Anmeldung zum <strong>Q21 KI_HUB Workshop</strong>!</p>
    
    <div class="info-box">
      <h2>📋 Deine Anmeldedaten:</h2>
      <p><strong>Dein bevorzugtes Datum:</strong> ${dateFormatted}</p>
      <p><strong>Anzahl Teilnehmer:</strong> ${attendees}</p>
    </div>
    
    <div class="info-box">
      <h2>🎯 Workshop-Details: KI - WAS ist aktuell möglich?</h2>
      <p><strong>Warum es die Geschäftswelt wirklich radikalisiert!</strong></p>
      <p>TOP-Insights von brandaktuellen KI-Modellen. WIE lege ich los? WAS brauche ich? Hype & Realität.</p>
      <p><strong>📍 Lokation:</strong> wird noch evaluiert, je nach Anmeldungen (wenn jemand Idee hat, bitte melden!)</p>
      <p><strong>⏱️ Dauer:</strong> 2h+</p>
    </div>
    
    <div class="highlight">
      <p><strong>ℹ️ Wichtiger Hinweis:</strong></p>
      <p>Die finale Terminentscheidung erfolgt in Kürze auf Basis der Abstimmungsergebnisse. Wir wählen den Termin, für den die meisten Teilnehmer gestimmt haben.</p>
      <p>Du erhältst automatisch eine weitere Email mit der finalen Terminbestätigung und allen weiteren Details (Lokation, Agenda, etc.).</p>
    </div>
    
    <p style="text-align: center;">
      <a href="https://q21.ctopilot.de/workshop.html" class="button">
        📊 Aktuelle Abstimmungsergebnisse anzeigen
      </a>
    </p>
    
    <p>Bei Fragen oder Anregungen kannst Du dich jederzeit bei uns melden:</p>
    <p><strong>Email:</strong> <a href="mailto:gf@zerohat.net">gf@zerohat.net</a></p>
    
    <p>Wir freuen uns auf den gemeinsamen Workshop mit Dir! 🎉</p>
  </div>
  
  <div class="footer">
    <p>Q21 KI_HUB - Nachbarschafts-KI-Community</p>
    <p><a href="https://q21.ctopilot.de">https://q21.ctopilot.de</a></p>
  </div>
</body>
</html>
  `;
  
  const plainBody = `
🎉 Wir haben Deine Anmeldung erhalten!

Hallo!

Vielen Dank für Deine Anmeldung zum Q21 KI_HUB Workshop!

📋 DEINE ANMELDEDATEN:
Dein bevorzugtes Datum: ${dateFormatted}
Anzahl Teilnehmer: ${attendees}

🎯 WORKSHOP-DETAILS: KI - WAS ist aktuell möglich?

Warum es die Geschäftswelt wirklich radikalisiert!

TOP-Insights von brandaktuellen KI-Modellen. WIE lege ich los? WAS brauche ich? Hype & Realität.

📍 Lokation: wird noch evaluiert, je nach Anmeldungen (wenn jemand Idee hat, bitte melden!)
⏱️ Dauer: 2h+

ℹ️ WICHTIGER HINWEIS:
Die finale Terminentscheidung erfolgt in Kürze auf Basis der Abstimmungsergebnisse. Wir wählen den Termin, für den die meisten Teilnehmer gestimmt haben.

Du erhältst automatisch eine weitere Email mit der finalen Terminbestätigung und allen weiteren Details (Lokation, Agenda, etc.).

📊 Aktuelle Abstimmungsergebnisse: https://q21.ctopilot.de/workshop.html

Bei Fragen oder Anregungen kannst Du dich jederzeit bei uns melden:
Email: gf@zerohat.net

Wir freuen uns auf den gemeinsamen Workshop mit Dir! 🎉

---
Q21 KI_HUB - Nachbarschafts-KI-Community
https://q21.ctopilot.de
  `;
  
  try {
    MailApp.sendEmail({
      to: email,
      subject: subject,
      body: plainBody,
      htmlBody: htmlBody,
      name: EMAIL_FROM_NAME
    });
    Logger.log('Email erfolgreich gesendet an: ' + email);
  } catch (error) {
    Logger.log('Fehler beim Email-Versand: ' + error.toString());
    throw error; // Werfe Fehler weiter, damit er in doPost geloggt wird
  }
}

// Datum formatieren
function formatDate(isoDate) {
  const dateMap = {
    '2025-11-11': '11. November 2025 (Dienstag, 19:00 Uhr)',
    '2025-11-13': '13. November 2025 (Donnerstag, 19:00 Uhr)',
    '2025-11-18': '18. November 2025 (Dienstag, 19:00 Uhr)'
  };
  
  return dateMap[isoDate] || isoDate;
}

// Test-Funktion für manuelle Ausführung
function testEmailSend() {
  Logger.log('=== EMAIL TEST START ===');
  try {
    sendConfirmationEmail('test@example.com', '2025-11-13', 2);
    Logger.log('✅ Test-Email erfolgreich versendet');
  } catch (error) {
    Logger.log('❌ Email-Test fehlgeschlagen: ' + error.toString());
  }
}

// Test-Funktion für Statistiken - SEHR WICHTIG FÜR DEBUG!
function testStatistics() {
  Logger.log('=== STATISTIK TEST START ===');
  try {
    const stats = getStatistics();
    Logger.log('✅ Statistiken erfolgreich berechnet');
    Logger.log('Ergebnis:');
    Logger.log(JSON.stringify(stats, null, 2));
    
    // Zusammenfassung
    let total = 0;
    Object.keys(stats).forEach(date => {
      total += stats[date].teilnehmer;
      Logger.log(`${date}: ${stats[date].anmeldungen} Anmeldungen, ${stats[date].teilnehmer} Teilnehmer`);
    });
    Logger.log(`GESAMT: ${total} Teilnehmer`);
    
    if (total === 0) {
      Logger.log('⚠️⚠️⚠️ WARNUNG: Keine Teilnehmer gefunden! ⚠️⚠️⚠️');
      Logger.log('Mögliche Probleme:');
      Logger.log('1. Datum im Sheet nicht im Format "2025-11-18"');
      Logger.log('2. Teilnehmerzahl nicht als Zahl gespeichert');
      Logger.log('3. Daten in falschen Spalten (C=Teilnehmer, D=Datum)');
      Logger.log('Prüfe die Logs oben für Details zu jeder Zeile!');
    }
    
  } catch (error) {
    Logger.log('❌ Statistik-Test fehlgeschlagen: ' + error.toString());
    Logger.log('Stack: ' + error.stack);
  }
  Logger.log('=== STATISTIK TEST ENDE ===');
}

// Test-Funktion um Sheet-Struktur zu überprüfen
function debugSheetStructure() {
  Logger.log('=== DEBUG SHEET STRUKTUR ===');
  
  const sheet = getOrCreateSheet();
  const data = sheet.getDataRange().getValues();
  
  Logger.log('Sheet Name: ' + sheet.getName());
  Logger.log('Anzahl Zeilen: ' + data.length);
  Logger.log('Anzahl Spalten: ' + (data[0] ? data[0].length : 0));
  
  // Header
  Logger.log('Header (Zeile 1): ' + JSON.stringify(data[0]));
  
  // Erste Datenzeile
  if (data.length > 1) {
    Logger.log('Erste Datenzeile (Zeile 2): ' + JSON.stringify(data[1]));
    Logger.log('  A (Index 0): ' + data[1][0] + ' (Typ: ' + typeof data[1][0] + ')');
    Logger.log('  B (Index 1): ' + data[1][1] + ' (Typ: ' + typeof data[1][1] + ')');
    Logger.log('  C (Index 2): ' + data[1][2] + ' (Typ: ' + typeof data[1][2] + ')');
    Logger.log('  D (Index 3): ' + data[1][3] + ' (Typ: ' + typeof data[1][3] + ')');
    Logger.log('  E (Index 4): ' + data[1][4] + ' (Typ: ' + typeof data[1][4] + ')');
  }
  
  Logger.log('=== DEBUG ENDE ===');
}
