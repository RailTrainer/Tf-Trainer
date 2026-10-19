const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ahmcoyfmdrgpmclaxgfj.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_cENpbfjZbysfKIjFKxTFWg_YziNteq1';

const rewrittenQuestionsMap = {
  q_docx_1: 'Welche Punkte sind beim Kuppeln eines Triebfahrzeugs mit einem Wagenzug zu beachten?',
  q_docx_2: 'Welcher Luftabsperrhahn muss beim Abkuppeln von Wagen von einem Triebfahrzeug zuerst geschlossen werden?',
  q_docx_3: 'Wie ist zu handeln, wenn bei einem fahrtzeigenden Formhauptsignal das Nachtzeichen erloschen ist, das Tageszeichen aber deutlich erkennbar bleibt?',
  q_docx_4: 'In welchen betrieblichen Situationen ist bei Güterzügen eine Anfahrprobe durchzuführen?',
  q_docx_5: 'Welche Prüfungen und Aufgaben umfasst die Fahrwegbeobachtung beim Rangieren?',
  q_docx_6: 'Wie ist eine Rangierfahrt im Bahnbetrieb definiert?',
  q_docx_7: 'Welche Vorgaben gelten für die Ladungssicherung mit Stahldraht beim Niederbinden?',
  q_docx_8: 'Welche Sicherheitsregeln müssen beim Auf- und Absteigen an Triebfahrzeugen eingehalten werden?',
  q_docx_9: 'Welche Bewegungsarten zählen gemäß Fahrdienstvorschrift zum Rangieren?',
  q_docx_10: 'Welche Verhaltens- und Bremsregeln gelten bei der Annäherung an ein Halt zeigendes Signal?',
  q_docx_11: 'Wie werden nach VDV-Schrift 758 die Prüfstufen 2 und 3 bei Güterwagen im Betrieb bezeichnet?',
  q_docx_12: 'Welche Rechtsverordnung regelt in Deutschland verbindlich Bau und Betrieb der regelspurigen Eisenbahnen?',
  q_docx_13: 'Worauf ist bei der Wagenprüfung vor der Zugfahrt (Prüfstufe 2) am vorbereiteten Wagenzug zu achten?',
  q_docx_14: 'Welche Merkmale weisen auf einen thermisch überbeanspruchten Radsatz hin?',
  q_docx_15: 'Welche Mindestwerte für das Tragfederspiel sind bei einem beladenen Güterwagen vorgeschrieben?',
  q_docx_16: 'In welchem Fall muss ein Güterwagen mit dem Wagenzettel Muster K gekennzeichnet werden?',
  q_docx_17: 'Welche Hauptfunktionen erfüllt das Laufwerk eines Eisenbahnwagens?',
  q_docx_18: 'In welchem Teil des betrieblichen Regelwerks finden sich die Bestimmungen zum Unfall- und Arbeitsschutz?',
  q_docx_19: 'Unter welchen Voraussetzungen ist das Betreten des Gleisbereichs nach den Unfallverhütungsvorschriften erlaubt?',
  q_docx_20: 'Wie wird die erstellte Wagenliste während und nach der Zugfahrt gehandhabt?',
  q_docx_21: 'In welcher Form muss die Dienstbesprechung zwischen Triebfahrzeugführer und Arbeitszugführer vor der Fahrt durchgeführt werden?',
  q_docx_22: 'Welche Grundsätze und Fristen gelten für die Vorbereitungsarbeiten der Stufe V1 an Triebfahrzeugen?',
  q_docx_23: 'Wann gilt ein Zug nach Abschluss der Vorbereitungsarbeiten offiziell als abfahrbereit?',
  q_docx_24: 'Auf welche Zeit- und Geschwindigkeitswerte überwacht die PZB 90 nach einer 1000-Hz-Beeinflussung in Zugart M?',
  q_docx_25: 'In welche PZB-Zugart ist ein Zug mit 63 Bremshundertsteln einzuordnen?',
  q_docx_26: 'Wie kann die Zustimmung zur Abfahrt festgestellt werden und wie ist zu fahren, wenn das Ausfahrsignal für das Zugpersonal nicht direkt einsehbar ist?',
  q_docx_27: 'In welchen Fällen muss ein Lokführer mit der Signalisierung von Hp 2 ohne vorherige Ankündigung rechnen?',
  q_docx_28: 'Welche Schritte sind bei einer Fehlleitung des Zuges unverzüglich einzuleiten?',
  q_docx_29: 'Welche Höchstgeschwindigkeiten gelten für geschobene Sperrfahrten?',
  q_docx_30: 'Wie ist bei der Rückfahrt einer Sperrfahrt in den Bahnhof zu verfahren, wenn keine Verbindung zum Fahrdienstleiter hergestellt werden kann?',
  q_docx_31: 'Welche grundlegenden Bestimmungen treffen auf Sperrfahrten zu?',
  q_docx_32: 'Wie ist zu reagieren, wenn ein Nothaltauftrag über Zugfunk nur unvollständig verstanden wurde?',
  q_docx_33: 'Welche Voraussetzungen müssen gegeben sein, damit ein schriftlicher Befehl über Zugfunk diktiert werden darf?',
  q_docx_34: 'An einem Halt zeigenden Ks-Signal blinkt ein weißes Licht (Signal Zs 1). Wie ist die Weiterfahrt geregelt?',
  q_docx_35: 'Welche Bestimmungen gelten für das Fahren auf Sicht im Bahnbetrieb?',
  q_docx_36: 'Wie ist zu handeln, wenn während der Zugfahrt die Luftverdichtung der Lokomotive ausfällt?',
  q_docx_37: 'Was ist vorgeschrieben, wenn auf der Lok alle PZB-Leuchtmelder dunkel werden, ohne dass eine Zwangsbremsung einsetzt?',
  q_docx_38: 'In welchen Situationen ist der Zug unverzüglich anzuhalten und direkt der Fahrdienstleiter zu kontaktieren?',
  q_docx_39: 'Welche Maßnahmen sind zu treffen, wenn Fahrzeuge an der Zugspitze über das Haltsignal hinaus zum Stehen gekommen sind?',
  q_docx_40: 'Welche Regelungen und Kennzeichnungen kennzeichnen das Signalsystem Köln (Sk)?',
  q_docx_41: 'Mit welchem standardisierten Wort werden Dienstgespräche über Wechselsprechverbindung förmlich beendet?',
  q_docx_42: 'Welche Grundsätze gelten für Geschwindigkeitsbegrenzungen, die per schriftlichem Befehl erteilt werden?',
  q_docx_43: 'Welcher Befehl ist erforderlich, um nach Erhalt von Befehl 3 (Stillstand) die Zugfahrt fortsetzen zu dürfen?',
  q_docx_44: 'Welche Zuordnungen entsprechen der aktuellen Buchstabiertafel (DIN 5009) im Eisenbahnbetrieb?',
  q_docx_45: 'Mit welchem Befehl wird der Befehl 3 (Verbleiben im Stillstand) wirksam widerrufen?',
  q_docx_46: 'Mit welcher Legitimation wird die Fahrt nach Diktat des abgebildeten Befehls 2 fortgesetzt?',
  q_docx_47: 'Von welchen Standorten aus ist dem Rangierpersonal eine zulässige Fahrwegbeobachtung gestattet?',
  q_docx_48: 'Welche Merkmale deuten auf eine Beschädigung des Radsatzlagers hin?',
  q_docx_49: 'Welches Schadensbild ist ein typisches Merkmal eines Heißläufers am Radsatzlager?',
  q_docx_50: 'Unter welchen Voraussetzungen darf ein Güterzug über 1600 t Gesamtzuggewicht abweichend in Bremsstellung P verkehren?',
  q_docx_51: 'Welche Meldung muss der Triebfahrzeugführer nach Beendigung einer Sperrfahrt an den Fahrdienstleiter abgeben?',
  q_docx_52: 'Welche Aussage beschreibt das Gleiten eines Triebfahrzeugs beim Bremsvorgang zutreffend?',
  q_docx_53: 'Wann ist die Durchführung einer Vollen Bremsprobe im Bahnbetrieb vorgeschrieben?',
  q_docx_54: 'Welche Vorschriften zur Bremsstellung und zu Bremsgewichtsabzügen gelten bei einem Zuggewicht von 1100 t?',
  q_docx_55: 'Was versteht man unter einer Überwalzung an der Radlauffläche?',
  q_docx_56: 'Welche Aufgaben erfüllt die Drehpfanne bei einem Drehgestellgüterwagen?',
  q_docx_57: 'Welche Funktion übernimmt die Dämpferschake am Drehgestell der Bauart Y25?',
  q_docx_58: 'Darf ein Triebfahrzeug nach Bruch einer Sekundärfeder weiterfahren und welches Tempolimit gilt in diesem Fall?',
  q_docx_59: 'Wie wird die Weiterfahrt geregelt, nachdem ein Zug unberechtigt an einem Halt zeigenden Signal vorbeigefahren ist und eine PZB-Zwangsbremsung erhalten hat?',
  q_docx_60: 'Welche betrieblichen Festlegungen gelten für ein Hauptsignal mit weiß-rot-weißem Mastschild?',
  q_docx_61: 'Welche Maßnahmen sind nach einer PZB-Zwangsbremsung an einem Halt zeigenden Signal vorgeschrieben?',
  q_docx_62: 'Welche Schirmformen besitzen Sk-Vorsignale je nach Fahrtrichtung auf der damaligen Versuchsstrecke?',
  q_docx_63: 'Welche Aussagen treffen auf das abgebildete Einzellastenraster an einem Güterwagen zu?',
  q_docx_64: 'Welche Bedeutung hat das abgebildete Mastschild mit zwei schwarzen Punkten an einem Form- oder Lichtsperrsignal?',
  q_docx_65: 'Um welche Signaltafel handelt es sich bei der dargestellten Ankündigungstafel vor einem Bahnübergang?',
  q_docx_66: 'Welche Vorgaben gelten für das Fahrverhalten bei der Vorbeifahrt an der abgebildeten Geschwindigkeitstafel (Signal Lf 7)?',
  q_docx_67: 'Welche Bedeutung und Vorschriften sind mit dem abgebildeten Merkpfahl (Signal Bü 3) verknüpft?',
  q_docx_68: 'Wie hat sich das Zugpersonal bei Annäherung an die abgebildete Pfeiftafel (Signal Bü 4) vor einem Bahnübergang zu verhalten?',
  q_docx_69: 'Welche Ursache und welche Risiken liegen vor, wenn Radnabe und Radscheibe eines Güterwagens umlaufend mit Schmiermittel verschmutzt sind?',
  q_docx_70: 'Welche Belastungsgrenzwerte werden durch das abgebildete Piktogramm auf dem Güterwagen angegeben?'
};

function cleanExplanationText(exp) {
  if (!exp) return '';
  // Remove (Prüfungsfrage \d+...) and any trailing exam id references
  return exp.replace(/\s*\(Prüfungsfrage\s+\d+[^)]*\)/gi, '').trim();
}

function processExplanationForSupabase(rawExp) {
  let exp = rawExp || '';
  let meta = null;
  const match = exp.match(/<!--RT_META:(.*?)-->/s);
  if (match) {
    try {
      meta = JSON.parse(match[1]);
      exp = exp.replace(/\s*<!--RT_META:.*?-->/gs, '').trim();
    } catch {}
  }
  
  exp = cleanExplanationText(exp);
  
  if (meta) {
    delete meta.vb;
    delete meta.vbn;
    return (exp ? exp + '\n' : '') + `<!--RT_META:${JSON.stringify(meta)}-->`;
  }
  return exp;
}

async function main() {
  console.log('=== 1. Updating src/database/docx_questions.json ===');
  const docxPath = path.join(__dirname, '..', 'src', 'database', 'docx_questions.json');
  const docxList = JSON.parse(fs.readFileSync(docxPath, 'utf8'));
  
  let docxUpdatedCount = 0;
  for (const q of docxList) {
    if (rewrittenQuestionsMap[q.id]) {
      q.text = rewrittenQuestionsMap[q.id];
      q.explanation = cleanExplanationText(q.explanation);
      q.isVerified = false;
      q.is_verified = false;
      docxUpdatedCount++;
    }
  }
  fs.writeFileSync(docxPath, JSON.stringify(docxList, null, 2), 'utf8');
  console.log(`Updated ${docxUpdatedCount} questions in docx_questions.json`);

  console.log('=== 2. Updating RailTrainer_Import_Quizfragen_Ungeprueft.csv ===');
  const csvPath = path.join(__dirname, '..', 'data', 'import', 'RailTrainer_Import_Quizfragen_Ungeprueft.csv');
  if (fs.existsSync(csvPath)) {
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const lines = csvContent.split('\n');
    const newLines = [];
    newLines.push(lines[0]); // Header
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const qId = `q_docx_${i}`;
      const newText = rewrittenQuestionsMap[qId];
      
      // Parse CSV line with quotes
      // Format: "Kategorie";"Fragentext";"Antwort_A";"Antwort_B";"Antwort_C";"Antwort_D";"Index_Richtige_Antwort_0_bis_3";"Erklaerung"
      const parts = line.split('";"').map(p => p.replace(/^"|"$/g, ''));
      if (parts.length >= 8 && newText) {
        parts[1] = newText;
        parts[7] = cleanExplanationText(parts[7]);
        newLines.push('"' + parts.join('";"') + '"');
      } else {
        newLines.push(line);
      }
    }
    fs.writeFileSync(csvPath, newLines.join('\n') + '\n', 'utf8');
    console.log(`Updated CSV file: ${csvPath}`);
  }

  console.log('=== 3. Updating Supabase quiz_questions table ===');
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: dbQuestions, error: fetchErr } = await client
    .from('quiz_questions')
    .select('*')
    .like('id', 'q_docx%');
    
  if (fetchErr) {
    console.error('Error fetching questions from Supabase:', fetchErr);
    return;
  }
  
  console.log(`Found ${dbQuestions.length} docx questions in Supabase.`);
  let dbSuccessCount = 0;
  
  for (const q of dbQuestions) {
    const newText = rewrittenQuestionsMap[q.id];
    if (newText) {
      const newExplanation = processExplanationForSupabase(q.explanation);
      const { error: updateErr } = await client
        .from('quiz_questions')
        .update({
          text: newText,
          explanation: newExplanation,
          is_verified: false
        })
        .eq('id', q.id);
        
      if (updateErr) {
        console.error(`Failed to update ${q.id} in Supabase:`, updateErr);
      } else {
        dbSuccessCount++;
      }
    }
  }
  
  console.log(`Successfully updated ${dbSuccessCount} / ${dbQuestions.length} questions in Supabase to is_verified = false with new wording.`);
  console.log('Done!');
}

main().catch(err => {
  console.error('Fatal error in script:', err);
  process.exit(1);
});
