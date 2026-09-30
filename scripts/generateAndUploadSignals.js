const fs = require('fs');
const https = require('https');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const KEY = 'sb_publishable_cENpbfjZbysfKIjFKxTFWg_YziNteq1';
const SUPABASE_URL = 'https://ahmcoyfmdrgpmclaxgfj.supabase.co';

const raw = JSON.parse(fs.readFileSync('quizlet_365462652_raw.json', 'utf8'));
const rawItems = raw.responses[0]?.models?.studiableItem || [];

async function downloadBase64(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      if (res.statusCode !== 200) return reject(new Error('Status ' + res.statusCode));
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        resolve('data:image/jpeg;base64,' + buf.toString('base64'));
      });
    }).on('error', reject);
  });
}

const signalDefs = [
  {
    title: 'Signal Zs 8 – Gegengleisfahrt-Ersatzsignal',
    content: 'Bedeutung:\nAm Halt zeigenden oder gestörten Hauptsignal ohne schriftlichen Befehl vorbeifahren. Der Fahrweg führt in das Streckengleis entgegen der gewöhnlichen Fahrtrichtung (Gegengleis).\n\nSignalbild:\nDrei blinkende weiße Lichter in Form eines nach links steigenden Winkels oder ein weißblinkender Lichtstreifen von rechts nach links steigend.\n\nPZB-Bedienung:\nMuss mit Befehl 40 (B40) am 2000-Hz-Magneten bestätigt werden.',
    reference: 'Ril 301.0301 Abschnitt 9'
  },
  {
    title: 'Signal Hp 0 – Halt (Lichtsignal)',
    content: 'Bedeutung:\nHalt.\n\nGeltung:\nGilt für Zug- und Rangierfahrten.\n\nSignalbild:\nEin rotes Licht oder zwei rote Lichter waagerecht nebeneinander.',
    reference: 'Ril 301.0101 Abschnitt 2'
  },
  {
    title: 'Signal Hp 0 – Halt (Formsignal)',
    content: 'Bedeutung:\nHalt.\n\nGeltung:\nGilt für Zug- und Rangierfahrten.\n\nSignalbild:\nEin Signalflügel zeigt waagerecht nach rechts (bei zweiflügligen Signalen der obere Flügel). Nachtzeichen: Ein rotes Licht.',
    reference: 'Ril 301.0101 Abschnitt 2'
  },
  {
    title: 'Signal Hp 1 – Fahrt (Formsignal)',
    content: 'Bedeutung:\nFahrt mit Streckenhöchstgeschwindigkeit.\n\nGeltung:\nGilt nur für Zugfahrten.\n\nSignalbild:\nEin Signalflügel zeigt schräg nach rechts aufwärts. Nachtzeichen: Ein grünes Licht.',
    reference: 'Ril 301.0101 Abschnitt 3'
  },
  {
    title: 'Signal Hp 1 – Fahrt (Lichtsignal)',
    content: 'Bedeutung:\nFahrt mit Streckenhöchstgeschwindigkeit.\n\nGeltung:\nGilt nur für Zugfahrten.\n\nSignalbild:\nEin grünes Licht.',
    reference: 'Ril 301.0101 Abschnitt 3'
  },
  {
    title: 'Signal Hp 2 – Langsamfahrt (Lichtsignal)',
    content: 'Bedeutung:\nLangsamfahrt (40 km/h, sofern nicht durch Signal Zs 3 abweichend vorgegeben).\n\nGeltung:\nGilt für Zugfahrten vom Hauptsignal ab im anschließenden Weichenbereich.\n\nSignalbild:\nEin grünes und senkrecht darunter ein gelbes Licht.',
    reference: 'Ril 301.0101 Abschnitt 4'
  },
  {
    title: 'Signal Hp 2 – Langsamfahrt (Formsignal)',
    content: 'Bedeutung:\nLangsamfahrt (40 km/h, sofern nicht durch Signal Zs 3 abweichend vorgegeben).\n\nGeltung:\nGilt für Zugfahrten vom Hauptsignal ab im anschließenden Weichenbereich.\n\nSignalbild:\nZwei Signalflügel zeigen schräg nach rechts aufwärts. Nachtzeichen: Ein grünes und senkrecht darunter ein gelbes Licht.',
    reference: 'Ril 301.0101 Abschnitt 4'
  },
  {
    title: 'Signal Ks 1 – Fahrt',
    content: 'Bedeutung:\nFahrt mit der im Fahrplan zugelassenen Höchstgeschwindigkeit.\n\nSignalbild:\n• Grünes Standlicht: Fahrt frei.\n• Grünes Blinklicht: Kündigt eine Geschwindigkeitsreduzierung am nächsten Signal an (in Verbindung mit Zs 3v).\n\nGeltung:\nKs-Signale gelten nur für Zugfahrten.',
    reference: 'Ril 301.0102 Abschnitt 2'
  },
  {
    title: 'Signal Ks 2 – Halt erwarten',
    content: 'Bedeutung:\nHalt am nächsten Signal (Haupt- oder Sperrsignal) erwarten.\n\nSignalbild:\nEin gelbes Standlicht.\n\nPZB-Bedienung:\nMuss innerhalb von 2,5 Sekunden nach Überfahren des 1000-Hz-Magneten mit der Wachsamkeitstaste (WT) bestätigt werden.',
    reference: 'Ril 301.0102 Abschnitt 3'
  },
  {
    title: 'Signal Zs 8 – Gegengleisfahrt-Ersatzsignal (Lichtstreifen)',
    content: 'Bedeutung:\nAm Halt zeigenden oder gestörten Hauptsignal ohne schriftlichen Befehl vorbeifahren, der Fahrweg führt in das Streckengleis entgegen der gewöhnlichen Fahrtrichtung.\n\nPZB-Bedienung:\nMuss mit Befehl 40 (B40) bestätigt werden.',
    reference: 'Ril 301.0301 Abschnitt 9'
  },
  {
    title: 'Signal Zs 7 – Vorsichtsignal',
    content: 'Bedeutung:\nAm Signal Hp 0 oder gestörten Lichthauptsignal ohne schriftlichen Befehl vorbeifahren; Weiterfahrt auf Sicht.\n\nSignalbild:\nDrei gelbe Lichter in Form eines V.\n\nPZB-Bedienung:\nMuss mit Befehl 40 (B40) bestätigt werden. Weiterfahrt auf Sicht bis 400 m nach dem folgenden Hauptsignal.',
    reference: 'Ril 301.0301 Abschnitt 8'
  },
  {
    title: 'Signal Zs 6 – Gegengleisanzeiger (Lichtsignal)',
    content: 'Bedeutung:\nDer Fahrweg führt in das Streckengleis entgegen der gewöhnlichen Fahrtrichtung (Gegengleis).\n\nSignalbild:\nEin weißleuchtender Schrägstrich von rechts nach links steigend.',
    reference: 'Ril 301.0301 Abschnitt 7'
  },
  {
    title: 'Signal Zs 6 – Gegengleisanzeiger (Formsignal)',
    content: 'Bedeutung:\nDer Fahrweg führt in das Streckengleis entgegen der gewöhnlichen Fahrtrichtung (Gegengleis).\n\nSignalbild:\nEine rechteckige schwarze Tafel mit weißem Schrägstreifen von rechts nach links steigend.',
    reference: 'Ril 301.0301 Abschnitt 7'
  },
  {
    title: 'Signal Zs 3v – Geschwindigkeitsvoranzeiger (Lichtsignal)',
    content: 'Bedeutung:\nGeschwindigkeitsanzeiger Zs 3 wird am folgenden Signal erwartet.\n\nSignalbild:\nEine gelbleuchtende Kennziffer (mal 10 in km/h).\n\nPZB-Bedienung:\nBei Kennziffern bis einschließlich Kz 9 (≤ 90 km/h) muss mit der Wachsamkeitstaste (WT) bestätigt werden.',
    reference: 'Ril 301.0301 Abschnitt 4'
  },
  {
    title: 'Signal Zs 3 – Geschwindigkeitsanzeiger (Lichtsignal)',
    content: 'Bedeutung:\nDie durch die Kennziffer mal 10 angezeigte Geschwindigkeit darf vom Signal ab im anschließenden Weichenbereich nicht überschritten werden.\n\nSignalbild:\nEine weißleuchtende Kennziffer auf schwarzem Signalschirm.',
    reference: 'Ril 301.0301 Abschnitt 3'
  },
  {
    title: 'Signal Zs 3v – Geschwindigkeitsvoranzeiger (Formsignal)',
    content: 'Bedeutung:\nGeschwindigkeitsanzeiger Zs 3 wird erwartet.\n\nSignalbild:\nEine gelbe dreieckige Tafel mit schwarzem Rand und schwarzer Kennziffer (Spitze nach unten).\n\nPZB-Bedienung:\nBis Kennziffer 9 mit Wachsamkeitstaste (WT) zu bestätigen.',
    reference: 'Ril 301.0301 Abschnitt 4'
  },
  {
    title: 'Signal Zs 3 – Geschwindigkeitsanzeiger (Formsignal)',
    content: 'Bedeutung:\nDie durch die Kennziffer angezeigte Geschwindigkeit (mal 10) darf ab dem Signal im Weichenbereich nicht überschritten werden.\n\nSignalbild:\nEine dreieckige schwarze Tafel mit weißem Rand und weißer Kennziffer (Spitze nach oben).',
    reference: 'Ril 301.0301 Abschnitt 3'
  },
  {
    title: 'Signal Zs 1 – Ersatzsignal (Ein weißes Blinklicht)',
    content: 'Bedeutung:\nAm Signal Hp 0 oder gestörten Lichthauptsignal ohne schriftlichen Befehl vorbeifahren.\n\nSignalbild:\nEin weißes Blinklicht.\n\nPZB-Bedienung:\nMuss mit Befehl 40 (B40) am 2000-Hz-Gleismagneten bestätigt werden. Vmax 40 km/h im anschließenden Weichenbereich.',
    reference: 'Ril 301.0301 Abschnitt 2'
  },
  {
    title: 'Signal Zs 1 – Ersatzsignal (Drei weiße Lichter)',
    content: 'Bedeutung:\nAm Signal Hp 0 oder gestörten Lichthauptsignal ohne schriftlichen Befehl vorbeifahren.\n\nSignalbild:\nDrei weiße Lichter in Form eines A.\n\nPZB-Bedienung:\nMuss mit Befehl 40 (B40) bestätigt werden.',
    reference: 'Ril 301.0301 Abschnitt 2'
  },
  {
    title: 'Signal Zs 13 – Stumpfgleis- und Frühhaltanzeiger',
    content: 'Bedeutung:\nFahrt in ein Stumpfgleis oder in ein Gleis mit verkürztem Einfahrweg.\n\nSignalbild:\nEin waagerechter weißer Leuchtbalken oder gelbes „S“.\n\nBesonderheit:\nErfordert besondere Aufmerksamkeit und angepasste Einfahrgeschwindigkeit.',
    reference: 'Ril 301.0301 Abschnitt 15'
  },
  {
    title: 'Signal Zs 12 – M-Tafel',
    content: 'Bedeutung:\nAm Halt zeigenden oder gestörten Hauptsignal auf mündlichen oder fernmündlichen Auftrag des Fahrdienstleiters vorbeifahren.\n\nSignalbild:\nEine weiße Tafel mit rotem M in Schreibschrift.\n\nPZB-Bedienung:\nVorbeifahrt muss mit Befehl 40 (B40) bestätigt werden.',
    reference: 'Ril 301.0301 Abschnitt 13'
  },
  {
    title: 'Signal Zs 10 – Endesignal',
    content: 'Bedeutung:\nEnde der durch Signal Hp 2 oder Zs 3 vorgeschriebenen Geschwindigkeitsbeschränkung vor dem Ende des Weichenbereichs.\n\nSignalbild:\nEin weißleuchtender Pfeil nach oben.',
    reference: 'Ril 301.0301 Abschnitt 11'
  },
  {
    title: 'Signal Zp 8 – Bremse in Ordnung',
    content: 'Bedeutung:\nDie Bremse ist in Ordnung. Abschluss der Bremsprobe.\n\nSignalbild (akustisch / Handzeichen):\n• Akustisch: Zwei mäßig lange Töne, ein kurzer Ton (– – ·).\n• Handzeichen: Ein Arm senkrecht nach oben gehoben.',
    reference: 'Ril 301.0701 Abschnitt 4'
  },
  {
    title: 'Signal Zp 7 – Bremse lösen',
    content: 'Bedeutung:\nDie Bremse ist zu lösen.\n\nSignalbild (akustisch / Handzeichen):\n• Akustisch: Zwei mäßig lange Töne (– –).\n• Handzeichen: Beide Arme in Schulterhöhe nach unten senken.',
    reference: 'Ril 301.0701 Abschnitt 3'
  },
  {
    title: 'Signal Zp 6 – Bremse anlegen',
    content: 'Bedeutung:\nDie Bremse ist anzulegen.\n\nSignalbild (akustisch / Handzeichen):\n• Akustisch: Ein mäßig langer Ton (–).\n• Handzeichen: Beide Arme in Schulterhöhe heben und waagerecht ausstrecken.',
    reference: 'Ril 301.0701 Abschnitt 2'
  },
  {
    title: 'Signal Zg 2 – Schlusssignal',
    content: 'Bedeutung:\nKennzeichnung des Zugschlusses.\n\nSignalbild:\n• Tag: Rot-weiße Schlussscheiben (Zg 2).\n• Nacht: Ein oder zwei rote Lichter oder rot-weiße rückstrahlende Schlussscheiben.',
    reference: 'Ril 301.0401 Abschnitt 2'
  },
  {
    title: 'Signal Zg 1 – Spitzensignal',
    content: 'Bedeutung:\nKennzeichnung der Zugspitze bei Tag und Nacht.\n\nSignalbild:\nDrei weiße Lichter in Dreiecksform an der Stirnseite des führenden Fahrzeugs (Dreilicht-Spitzensignal).',
    reference: 'Ril 301.0401 Abschnitt 1'
  },
  {
    title: 'Signal Wn 7 – Die Gleissperre ist abgelegt',
    content: 'Bedeutung:\nDie Gleissperre ist abgelegt (Fahrt frei über die Gleissperre).\n\nSignalbild:\nEin senkrechtes weißes Rechteck auf schwarzem Grund oder ein weißes Licht.',
    reference: 'Ril 301.0901 Abschnitt 7'
  },
  {
    title: 'Signal Wn 6 – Bogen von rechts nach rechts',
    content: 'Bedeutung:\nDie Weiche ist für die Fahrt im Bogen von rechts nach rechts gestellt.\n\nSignalbild:\nEin weißer Pfeil nach rechts auf schwarzem Grund.',
    reference: 'Ril 301.0901 Abschnitt 6'
  },
  {
    title: 'Signal Wn 5 – Bogen von links nach links',
    content: 'Bedeutung:\nDie Weiche ist für die Fahrt im Bogen von links nach links gestellt.\n\nSignalbild:\nEin weißer Pfeil nach links auf schwarzem Grund.',
    reference: 'Ril 301.0901 Abschnitt 5'
  },
  {
    title: 'Signal Wn 4 – Gerade von rechts nach links',
    content: 'Bedeutung:\nDie Weiche ist für die Fahrt im geraden Zweig von rechts nach links gestellt.\n\nSignalbild:\nEin weißer Streifen von rechts oben nach links unten.',
    reference: 'Ril 301.0901 Abschnitt 4'
  },
  {
    title: 'Signal Wn 3 – Gerade von links nach rechts',
    content: 'Bedeutung:\nDie Weiche ist für die Fahrt im geraden Zweig von links nach rechts gestellt.\n\nSignalbild:\nEin weißer Streifen von links oben nach rechts unten.',
    reference: 'Ril 301.0901 Abschnitt 3'
  },
  {
    title: 'Signal Wn 2 – Gebogener Zweig',
    content: 'Bedeutung:\nDie Weiche ist für den gebogenen / abzweigenden Zweig gestellt.\n\nSignalbild:\nEin weißer Pfeil schräg zur Seite auf schwarzem Grund.',
    reference: 'Ril 301.0901 Abschnitt 2'
  },
  {
    title: 'Signal Wn 1 – Gerader Zweig',
    content: 'Bedeutung:\nDie Weiche ist für den geraden Zweig gestellt.\n\nSignalbild:\nEin senkrechtes weißes Rechteck auf schwarzem Grund.',
    reference: 'Ril 301.0901 Abschnitt 1'
  },
  {
    title: 'Vorsignalwiederholer',
    content: 'Bedeutung:\nWiederholt das Signalbild des Vorsignals vor dem Hauptsignal.\n\nSignalbild:\nEin weißes Zusatzlicht (ohne Ne 2-Vorsignaltafel).\n\nBesonderheit:\nZeigt an, dass der Bremsweg bis zum Hauptsignal verkürzt ist; besitzt keinen 1000-Hz-Magneten.',
    reference: 'Ril 301.0101 / Ril 301.0102'
  },
  {
    title: 'Signal Vr 2 – Langsamfahrt erwarten (Lichtsignal)',
    content: 'Bedeutung:\nLangsamfahrt am Hauptsignal erwarten.\n\nSignalbild:\nEin grünes und nach rechts steigend ein gelbes Licht.\n\nPZB-Bedienung:\nMuss innerhalb von 2,5 Sekunden mit der Wachsamkeitstaste (WT) bestätigt werden.',
    reference: 'Ril 301.0101 Abschnitt 8'
  },
  {
    title: 'Signal Vr 2 – Langsamfahrt erwarten (Kompaktschirm)',
    content: 'Bedeutung:\nLangsamfahrt am folgenden Hauptsignal erwarten.\n\nSignalbild:\nEin grünes und ein gelbes Licht auf dem Kompaktsignalschirm.\n\nPZB-Bedienung:\nMuss mit der Wachsamkeitstaste (WT) bestätigt werden.',
    reference: 'Ril 301.0101 Abschnitt 8'
  },
  {
    title: 'Signal Vr 2 – Langsamfahrt erwarten (Formsignal)',
    content: 'Bedeutung:\nLangsamfahrt am Hauptsignal erwarten.\n\nSignalbild:\nEine runde gelbe Scheibe mit grün-gelbem Zusatzflügel schräg nach rechts aufwärts. Nachtzeichen: Grün über Gelb.\n\nPZB-Bedienung:\nMuss mit der Wachsamkeitstaste (WT) bestätigt werden.',
    reference: 'Ril 301.0101 Abschnitt 8'
  },
  {
    title: 'Signal Vr 1 – Fahrt erwarten',
    content: 'Bedeutung:\nFahrt mit Streckengeschwindigkeit am Hauptsignal erwarten.\n\nSignalbild:\n• Lichtsignal: Zwei grüne Lichter nach rechts steigend.\n• Formsignal: Gelbe runde Scheibe waagerecht geklappt.',
    reference: 'Ril 301.0101 Abschnitt 7'
  },
  {
    title: 'Signal Vr 0 – Halt erwarten (Lichtsignal)',
    content: 'Bedeutung:\nHalt am folgenden Hauptsignal erwarten.\n\nSignalbild:\nZwei gelbe Lichter waagerecht nebeneinander.\n\nPZB-Bedienung:\nMuss innerhalb von 2,5 Sekunden mit der Wachsamkeitstaste (WT) am 1000-Hz-Magneten bestätigt werden.',
    reference: 'Ril 301.0101 Abschnitt 6'
  },
  {
    title: 'Signal Vr 0 – Halt erwarten (Kompaktschirm)',
    content: 'Bedeutung:\nHalt am folgenden Hauptsignal erwarten.\n\nSignalbild:\nZwei gelbe Lichter waagerecht nebeneinander auf dem Signalschirm.\n\nPZB-Bedienung:\nMuss mit der Wachsamkeitstaste (WT) bestätigt werden.',
    reference: 'Ril 301.0101 Abschnitt 6'
  },
  {
    title: 'Signal Vr 0 – Halt erwarten (Formsignal)',
    content: 'Bedeutung:\nHalt am folgenden Hauptsignal erwarten.\n\nSignalbild:\nEine runde gelbe Scheibe mit schwarzem und weißem Rand. Nachtzeichen: Zwei gelbe Lichter waagerecht nebeneinander.\n\nPZB-Bedienung:\nMuss mit der Wachsamkeitstaste (WT) bestätigt werden.',
    reference: 'Ril 301.0101 Abschnitt 6'
  },
  {
    title: 'Signal Ts 3 – Weiterfahrt für Schiebelokomotiven',
    content: 'Bedeutung:\nWeiterfahrt für zurückkehrende Schiebelokomotiven und Sperrfahrten.\n\nSignalbild:\nEin weißer Pfeil nach oben auf schwarzem Grund.',
    reference: 'Ril 301.0801 Abschnitt 3'
  },
  {
    title: 'Signal Ts 2 – Halt für Schiebelokomotiven',
    content: 'Bedeutung:\nHalt für zurückkehrende Schiebelokomotiven und Sperrfahrten.\n\nSignalbild:\nEin waagerechter weißer Balken auf schwarzem Grund.',
    reference: 'Ril 301.0801 Abschnitt 2'
  },
  {
    title: 'Signal Ts 1 – Nachschieben einstellen',
    content: 'Bedeutung:\nNachschieben einstellen. Die Schiebelokomotive hat die Kraftübertragung zu beenden.\n\nSignalbild:\nEin weißes T auf blauem Grund.',
    reference: 'Ril 301.0801 Abschnitt 1'
  },
  {
    title: 'Signal Sh 3 – Kreissignal (Sofort halten)',
    content: 'Bedeutung:\nSofort halten! Signal zur unmittelbaren Gefahrenabwendung.\n\nSignalbild:\nEine rot-weiße Fahne, ein Gegenstand oder der Arm im Kreis geschwungen. Nachtzeichen: Ein rotes Licht im Kreis geschwungen.',
    reference: 'Ril 301.0601 Abschnitt 3'
  },
  {
    title: 'Signal Sh 2 – Schutzhalt (Tageszeichen)',
    content: 'Bedeutung:\nHalt! Gilt für alle Zug- und Rangierfahrten.\n\nSignalbild:\nEine rechteckige rote Tafel mit weißem Rand (Sh 2-Wärterhaltscheibe). Nachtzeichen: Ein rotes Licht.',
    reference: 'Ril 301.0601 Abschnitt 2'
  },
  {
    title: 'Signal Sh 1 – Fahrverbot aufgehoben (Lichtsignal)',
    content: 'Bedeutung:\nFahrverbot aufgehoben. Erlaubt Rangierfahrten die Vorbeifahrt.\n\nSignalbild:\nZwei weiße Lichter nach rechts steigend.',
    reference: 'Ril 301.0601 Abschnitt 1'
  },
  {
    title: 'Signal Sh 1 – Fahrverbot aufgehoben (Formsignal)',
    content: 'Bedeutung:\nFahrverbot aufgehoben.\n\nSignalbild:\nEin schwarzer Schrägbalken auf runder weißer Scheibe von links unten nach rechts oben steigend.',
    reference: 'Ril 301.0601 Abschnitt 1'
  },
  {
    title: 'Signal Sh 0 – Halt! Fahrverbot',
    content: 'Bedeutung:\nHalt! Fahrverbot für Zug- und Rangierfahrten.\n\nSignalbild:\n• Formsignal: Ein waagerechter schwarzer Balken auf runder weißer Scheibe.\n• Lichtsignal: Zwei rote Lichter waagerecht nebeneinander.',
    reference: 'Ril 301.0601 Abschnitt 1'
  },
  {
    title: 'Signal Ra 5 – Rangierhalt',
    content: 'Bedeutung:\nRangierhalt! Die Rangierfahrt ist sofort anzuhalten.\n\nSignalbild (akustisch / optisch):\n• Drei kurze Töne (· · ·).\n• Tag: Beide Arme über dem Kopf kreuzend hin- und herbewegen.',
    reference: 'Ril 301.0801 Abschnitt 5'
  },
  {
    title: 'Signal Ra 13 – Isolierzeichen',
    content: 'Bedeutung:\nKennzeichnung der Grenze der Gleisisolierung bzw. Gleisfreimeldeabschnitte.\n\nSignalbild:\nEin blaues Dreieck oder Schienensteg-Markierung.',
    reference: 'Ril 301.0801 Abschnitt 13'
  },
  {
    title: 'Signal Ra 12 – Grenzzeichen',
    content: 'Bedeutung:\nGrenze, bis zu der bei zusammenlaufenden Gleisen ein Gleis besetzt werden darf, ohne dass das Nachbargleis gefährdet wird.\n\nSignalbild:\nEin rot-weiß-rot gestreifter Pflock zwischen den Schienen.',
    reference: 'Ril 301.0801 Abschnitt 12'
  },
  {
    title: 'Signal Ra 11 – Wartezeichen',
    content: 'Bedeutung:\nAuftrag des Wärters zur Rangierfahrt abwarten.\n\nSignalbild:\nEin gelbes W auf schwarzem Grund.',
    reference: 'Ril 301.0801 Abschnitt 11'
  },
  {
    title: 'Signal Ra 10 – Rangierhalttafel',
    content: 'Bedeutung:\nÜber die Tafel hinaus darf nicht rangiert werden (Schutz des Fahrwegs der Gegenrichtung).\n\nSignalbild:\nEine weiße Tafel mit schwarzem Rand und der Aufschrift „Halt für Rangierfahrten“.',
    reference: 'Ril 301.0801 Abschnitt 10'
  },
  {
    title: 'Signal Ne 6 – Haltepunkttafel',
    content: 'Bedeutung:\nEin Haltepunkt ist zu erwarten.\n\nSignalbild:\nEine rechteckige weiße Tafel mit drei schwarzen Schrägstreifen im Bremswegabstand vor einem Reisezug-Haltepunkt.',
    reference: 'Ril 301.1401 Abschnitt 6'
  },
  {
    title: 'Signal Ne 5 – Haltetafel (H-Tafel)',
    content: 'Bedeutung:\nKennzeichnung des Halteplatzes der Zugspitze bei planmäßig haltenden Zügen.\n\nSignalbild:\nEin schwarzes H auf weißer Rechteckscheibe.',
    reference: 'Ril 301.1401 Abschnitt 5'
  },
  {
    title: 'Signal Ne 4 – Schachbretttafel',
    content: 'Bedeutung:\nDas Hauptsignal steht abweichend von der Regel an einem anderen Standort (z.B. links vom Gleis).\n\nSignalbild:\nEine rechteckige schwarz-weiß geschachte Tafel.',
    reference: 'Ril 301.1401 Abschnitt 4'
  },
  {
    title: 'Signal Ne 3 – Vorsignalbaken',
    content: 'Bedeutung:\nEin Vorsignal ist zu erwarten.\n\nSignalbild:\nWeiße Baken mit schwarzen Schrägstreifen. Die Bake mit einem Streifen steht 100 m vor dem Vorsignal, die weiteren im Abstand von je 75 m davor.',
    reference: 'Ril 301.1401 Abschnitt 3'
  },
  {
    title: 'Signal Ne 2 – Vorsignaltafel (Verkürzter Bremswegabstand)',
    content: 'Bedeutung:\nKennzeichnung des Standorts eines Vorsignals, das um mehr als 5 % kürzer als der Bremsweg der Strecke vor dem Hauptsignal steht.\n\nSignalbild:\nNe 2-Tafel mit auf der Spitze stehendem weißen Dreieck mit schwarzem Rand.\n\nPZB-Bedienung:\nMuss mit der Wachsamkeitstaste (WT) bestätigt werden.',
    reference: 'Ril 301.1401 Abschnitt 2'
  },
  {
    title: 'Signal Ne 2 – Vorsignaltafel (Regelabstand)',
    content: 'Bedeutung:\nKennzeichnung des Standorts eines Vorsignals.\n\nSignalbild:\nEine weiße Tafel mit zwei schwarzen Winkeln, die sich mit der Spitze berühren.\n\nPZB-Bedienung:\nBei alleinstehender Tafel oder im Gegengleis mit Wachsamkeitstaste (WT) zu bestätigen.',
    reference: 'Ril 301.1401 Abschnitt 2'
  },
  {
    title: 'Signal Ne 1 – Trapeztafel',
    content: 'Bedeutung:\nKennzeichnung der Stelle, wo bestimmte Züge vor einer Betriebsstelle ohne Einfahrsignal zu halten haben.\n\nSignalbild:\nEine weiße Trapeztafel mit schwarzem Rand an schwarz-weiß gestreiftem Pfahl.',
    reference: 'Ril 301.1401 Abschnitt 1'
  },
  {
    title: 'Mastschild – Weiß-rot-weiß (WRW)',
    content: 'Bedeutung:\nBestimmt das Verhalten bei gestörten oder Halt zeigenden Signalen. An Signalen mit weiß-rot-weißem Mastschild darf bei Halt nur auf Zs 1, Zs 7, Zs 8, Zs 12 oder schriftlichen Befehl vorbeigefahren werden.',
    reference: 'Ril 301.0002'
  },
  {
    title: 'Signal Lf 7 – Geschwindigkeitssignal',
    content: 'Bedeutung:\nDie angezeigte Geschwindigkeit (Kennziffer mal 10 in km/h) darf ab dem Signal nicht überschritten werden.\n\nSignalbild:\nEine weiße Tafel mit schwarzem Rand und schwarzer Kennziffer.',
    reference: 'Ril 301.0501 Abschnitt 7'
  },
  {
    title: 'Signal Lf 6 – Geschwindigkeits-Ankündesignal',
    content: 'Bedeutung:\nEin Geschwindigkeitssignal Lf 7 ist im Bremswegabstand zu erwarten.\n\nSignalbild:\nEine dreieckige weiße Tafel mit schwarzem Rand und schwarzer Kennziffer (Spitze nach unten).\n\nPZB-Bedienung:\nBei Kennziffern bis einschließlich Kz 9 (≤ 90 km/h) muss mit der Wachsamkeitstaste (WT) bestätigt werden.',
    reference: 'Ril 301.0501 Abschnitt 6'
  },
  {
    title: 'Signal Lf 5 – Anfangtafel',
    content: 'Bedeutung:\nDie auf Signal Lf 4 angezeigte Geschwindigkeitsbeschränkung muss an dieser Tafel durchgeführt sein.\n\nSignalbild:\nEine weiße Tafel mit schwarzem Rand und schwarzem A.',
    reference: 'Ril 301.0501 Abschnitt 5'
  },
  {
    title: 'Signal Lf 4 – Geschwindigkeitstafel',
    content: 'Bedeutung:\nEs folgt eine ständige Langsamfahrstelle. Die angezeigte Geschwindigkeit darf ab der Anfangtafel Lf 5 nicht überschritten werden.\n\nSignalbild:\nEine schwarze Tafel mit weißer Kennziffer.\n\nPZB-Bedienung:\nBei Kennziffern bis Kz 9 mit Wachsamkeitstaste (WT) zu bestätigen.',
    reference: 'Ril 301.0501 Abschnitt 4'
  },
  {
    title: 'Signal Lf 3 – Endscheibe',
    content: 'Bedeutung:\nEnde der vorübergehenden Langsamfahrstelle.\n\nSignalbild:\nEine weiße rechteckige Tafel mit schwarzem E.',
    reference: 'Ril 301.0501 Abschnitt 3'
  },
  {
    title: 'Signal Lf 2 – Anfangscheibe',
    content: 'Bedeutung:\nAnfang der vorübergehenden Langsamfahrstelle.\n\nSignalbild:\nEine gelbe rechteckige Tafel mit schwarzem Rand und schwarzem A.',
    reference: 'Ril 301.0501 Abschnitt 2'
  },
  {
    title: 'Signal Lf 1 – Langsamfahrscheibe',
    content: 'Bedeutung:\nEs folgt eine vorübergehende Langsamfahrstelle, auf der die angezeigte Geschwindigkeit (mal 10 in km/h) nicht überschritten werden darf.\n\nSignalbild:\nEine dreieckige gelbe Scheibe mit schwarzem Rand und schwarzer Kennziffer (Spitze nach unten).\n\nPZB-Bedienung:\nMuss mit der Wachsamkeitstaste (WT) bestätigt werden.',
    reference: 'Ril 301.0501 Abschnitt 1'
  },
  {
    title: 'Signal Bü 3 – Merktafel',
    content: 'Bedeutung:\nKennzeichnung des Einschaltpunktes von Blinklichtern oder Lichtzeichen mit Fernüberwachung eines Bahnübergangs.\n\nSignalbild:\nEine weiße Tafel mit schwarzem Blitz.',
    reference: 'Ril 301.1001 Abschnitt 3'
  },
  {
    title: 'Signal Bü 2 – Rautentafel (mit Entfernungsbaken)',
    content: 'Bedeutung:\nEin Überwachungssignal Bü 0 / Bü 1 ist zu erwarten.\n\nSignalbild:\nWeiße Baken mit schwarzer Raute. Die letzte Bake steht 100 m vor dem Überwachungssignal, die weiteren jeweils im Abstand von 75 m davor.',
    reference: 'Ril 301.1001 Abschnitt 2'
  },
  {
    title: 'Signal Bü 2 – Rautentafel',
    content: 'Bedeutung:\nEin Überwachungssignal ist zu erwarten.\n\nSignalbild:\nEine rechteckige weiße Tafel mit schwarzer Raute.',
    reference: 'Ril 301.1001 Abschnitt 2'
  },
  {
    title: 'Signal Bü 1 – Bahnübergang darf befahren werden',
    content: 'Bedeutung:\nDer Bahnübergang darf befahren werden (technische Sicherung wirksam hergestellt).\n\nSignalbild:\nEin blinkendes weißes Licht über einem gelben Licht (oder gelbe Tafel).',
    reference: 'Ril 301.1001 Abschnitt 1'
  },
  {
    title: 'Bü-Überwachungssignal Wiederholer',
    content: 'Bedeutung:\nWiederholt das Signalbild des Überwachungssignals Bü 0 / Bü 1.\n\nSignalbild:\nEin weißes Zusatzlicht auf dem Signalschirm.',
    reference: 'Ril 301.1001'
  },
  {
    title: 'Signal Bü 0 – Halt vor dem BÜ (Verkürzter Bremsweg)',
    content: 'Bedeutung:\nHalt vor dem Bahnübergang! Weiterfahrt erst nach Sicherung des BÜ.\n\nSignalbild:\nEin gelbes Standlicht mit weißem Zusatzlicht (Bremsweg um mehr als 5 % verkürzt).\n\nPZB-Bedienung:\nMuss mit der Wachsamkeitstaste (WT) bestätigt werden.',
    reference: 'Ril 301.1001 Abschnitt 1'
  },
  {
    title: 'Signal Bü 0 – Halt vor dem Bahnübergang',
    content: 'Bedeutung:\nHalt vor dem Bahnübergang! Weiterfahrt nach Sicherung des BÜ.\n\nSignalbild:\nEin gelbes Standlicht.\n\nPZB-Bedienung:\nMuss mit der Wachsamkeitstaste (WT) bestätigt werden.',
    reference: 'Ril 301.1001 Abschnitt 1'
  },
  {
    title: 'Bü-Kette – Mehrere aufeinanderfolgende BÜ',
    content: 'Bedeutung:\nMehrere nacheinander folgende Bahnübergänge in einer gemeinsamen Überwachungsstrecke.\n\nSignalbild / Zusatz:\nZusatztafel unter dem Überwachungssignal mit schwarzer Ziffer für die Anzahl der gesicherten Bahnübergänge.',
    reference: 'Ril 301.1001'
  },
  {
    title: 'Signal Bü 5 – Läutetafel',
    content: 'Bedeutung:\nEs ist zu läuten.\n\nSignalbild:\nEine weiße Tafel mit schwarzem L.',
    reference: 'Ril 301.1001 Abschnitt 5'
  },
  {
    title: 'Signal Bü 4 – Pfeiftafel',
    content: 'Bedeutung:\nEtwa 3 Sekunden lang mäßig laut pfeifen (Achtungssignal Zp 1).\n\nSignalbild:\nEine weiße Tafel mit schwarzem P.',
    reference: 'Ril 301.1001 Abschnitt 4'
  },
  {
    title: 'Hektometerzeichen (Streckenkilometer & NBÜ)',
    content: 'Bedeutung:\n1. Kennzeichnung der Streckenkilometrierung zur exakten Standortbestimmung.\n2. Angabe von Notbremsüberbrückungsbereichen (NBÜ) an Brücken, Tunneln und schwer zugänglichen Streckenabschnitten.',
    reference: 'Ril 301.1501'
  },
  {
    title: 'Fahrtanzeiger (Unterstützung für den Tf)',
    content: 'Bedeutung:\nUnterstützung für den Triebfahrzeugführer bei nicht direkt einsehbaren Ausfahrsignalen (Asig).\nAchtung: Fahrtanzeiger sind betriebliche Anzeigen, keine Hauptsignale!\n• Bei Leuchtbalken: Gilt für die Blickrichtung.\n• Bei Punkten: Gilt für die entgegengesetzte Richtung.',
    reference: 'Ril 301 / Ril 408'
  },
  {
    title: 'Signalbegriffe: Kennlicht vs. Zusatzlicht vs. Zs 1',
    content: 'Bedeutung der Lichtpunkte am Signalschirm:\n1. Kennlicht: Signalisiert dem Tf, dass das Hauptsignal betrieblich abgeschaltet ist (nur ein weißes Licht).\n2. Zusatzlicht: Signalisiert einen um mehr als 5 % verkürzten Bremsweg oder einen Vorsignalwiederholer (ohne Ne 2).\n3. Blinkend: Weißes Blinklicht signalisiert das Ersatzsignal Zs 1.',
    reference: 'Ril 301.0002'
  },
  {
    title: 'Signalbild: Hp 0 mit Zs 1 (Ersatzsignal)',
    content: 'Bedeutung:\nZugfahrt mit besonderem Auftrag: Am Halt zeigenden oder gestörten Lichthauptsignal ohne schriftlichen Befehl vorbeifahren.\n\nSignalbild:\nEin rotes Licht (Hp 0) zusammen mit weißem Blinklicht (Zs 1).',
    reference: 'Ril 301.0101 / Ril 301.0301'
  },
  {
    title: 'Mastschild – Gelbes Dreieck (Ks-Vorsignalfunktion)',
    content: 'Bedeutung:\nKennzeichnet ein Ks-Signal mit Vorsignalfunktion (Hauptsignal mit integrierter Vorsignalfunktion für das nachfolgende Signal).',
    reference: 'Ril 301.0002'
  },
  {
    title: 'Mastschild – Weiß-gelb-weiß-gelb-weiß',
    content: 'Bedeutung:\nSignalisiert dem Tf, dass an einem Halt zeigenden oder gestörten Lichthauptsignal nach Halten eine Weiterfahrt auf Sicht bis zum nächsten Hauptsignal zulässig ist, wenn keine Verbindung zum Fdl möglich ist.',
    reference: 'Ril 301.0002'
  },
  {
    title: 'Signal Zp 6 – Bremse anlegen (Nachtzeichen)',
    content: 'Bedeutung:\nBremse anlegen.\n\nSignalbild bei Nacht:\nEine weiße Lampe in Schulterhöhe mehrmals waagerecht hin- und herbewegen.',
    reference: 'Ril 301.0701 Abschnitt 2'
  },
  {
    title: 'Signal Zp 7 – Bremse lösen (Nachtzeichen)',
    content: 'Bedeutung:\nBremse lösen.\n\nSignalbild bei Nacht:\nEine weiße Lampe mehrmals von der Schulterhöhe nach unten senken.',
    reference: 'Ril 301.0701 Abschnitt 3'
  },
  {
    title: 'Signal Zp 8 – Bremse in Ordnung (Nachtzeichen)',
    content: 'Bedeutung:\nBremse in Ordnung.\n\nSignalbild bei Nacht:\nEine weiße Lampe senkrecht nach oben heben und ruhig halten.',
    reference: 'Ril 301.0701 Abschnitt 4'
  }
];

async function run() {
  console.log('Generating 89 signal cards with base64 images...');
  const results = [];
  
  for (let i = 0; i < rawItems.length; i++) {
    const rawItem = rawItems[i];
    const defData = signalDefs[i];
    const wordSide = rawItem.cardSides.find(s => s.label === 'word') || rawItem.cardSides[0];
    const defSide = rawItem.cardSides.find(s => s.label === 'definition') || rawItem.cardSides[1];
    const imgUrl = wordSide?.media?.find(m => m.type === 2)?.url || defSide?.media?.find(m => m.type === 2)?.url;
    
    let b64 = null;
    if (imgUrl) {
      try {
        b64 = await downloadBase64(imgUrl);
      } catch (e) {
        console.error(`Failed download ${i + 1}: ${imgUrl}`, e.message);
      }
    }
    
    const cardId = 'f_quiz_sig_' + String(i + 1).padStart(2, '0');
    results.push({
      id: cardId,
      category: 'Signale',
      title: defData.title,
      content: defData.content,
      reference: defData.reference,
      image_url: b64,
      imageUrl: b64,
      is_verified: true,
      isVerified: true
    });
    
    if ((i + 1) % 10 === 0 || i === rawItems.length - 1) {
      console.log(`Processed ${i + 1}/${rawItems.length} cards`);
    }
  }
  
  fs.writeFileSync('quizlet_signals_complete.json', JSON.stringify(results, null, 2));
  console.log('Saved quizlet_signals_complete.json with', results.length, 'cards');

  // 1. Upload to Supabase in batches of 10
  console.log('Uploading cards to Supabase...');
  for (let b = 0; b < results.length; b += 10) {
    const batch = results.slice(b, b + 10).map(c => ({
      id: c.id,
      category: c.category,
      title: c.title,
      content: c.content,
      reference: c.reference,
      image_url: c.image_url,
      is_verified: true
    }));
    
    await new Promise((resolve, reject) => {
      const payload = JSON.stringify(batch);
      const req = https.request({
        hostname: 'ahmcoyfmdrgpmclaxgfj.supabase.co',
        path: '/rest/v1/flashcards',
        method: 'POST',
        headers: {
          'apikey': KEY,
          'Authorization': 'Bearer ' + KEY,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates'
        }
      }, res => {
        let resp = '';
        res.on('data', chunk => resp += chunk);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log(`Supabase batch ${Math.floor(b / 10) + 1} (${batch.length} cards) uploaded successfully`);
            resolve();
          } else {
            console.error(`Supabase batch error ${res.statusCode}:`, resp);
            resolve(); // continue
          }
        });
      });
      req.on('error', err => {
        console.error('Supabase req error:', err);
        resolve();
      });
      req.write(payload);
      req.end();
    });
  }

  // 2. Update all_flashcards.json
  console.log('Updating all_flashcards.json...');
  if (fs.existsSync('all_flashcards.json')) {
    const all = JSON.parse(fs.readFileSync('all_flashcards.json', 'utf8'));
    const idMap = new Map();
    all.forEach(c => idMap.set(c.id, c));
    results.forEach(c => {
      idMap.set(c.id, {
        id: c.id,
        category: c.category,
        title: c.title,
        content: c.content,
        reference: c.reference,
        image_url: c.image_url,
        created_at: new Date().toISOString(),
        is_verified: true
      });
    });
    const merged = Array.from(idMap.values());
    fs.writeFileSync('all_flashcards.json', JSON.stringify(merged, null, 2));
    console.log('all_flashcards.json updated, total cards:', merged.length);
  }

  console.log('Done!');
}

run();
