const https = require('https');
const KEY = 'sb_publishable_cENpbfjZbysfKIjFKxTFWg_YziNteq1';

function packFactMetadata(f) {
  const meta = {
    cb: 'buffl_import',
    cbn: 'Lena R. (Buffl)',
    cr: 'moderator'
  };
  const cleanRef = (f.reference || '').trim();
  return `${cleanRef} <!--RT_META:${JSON.stringify(meta)}-->`.trim();
}

const rawCards = [
  {
    num: 1,
    title: 'Abstoßen',
    content: 'Abstoßen ist das Bewegen geschobener, nicht mit einem arbeitenden Triebfahrzeug gekuppelter Fahrzeuge durch Beschleunigen, so dass die Fahrzeuge allein weiterfahren, nachdem das Triebfahrzeug angehalten hat.',
    reference: 'Ril 408.4811',
    imageUrl: null
  },
  {
    num: 2,
    title: 'Verschieben',
    content: 'Verschieben ist das Bewegen von Fahrzeugen durch Menschenkraft oder durch einen Antrieb, der nicht von einem Triebfahrzeug ausgeht.',
    reference: 'Ril 408.4811',
    imageUrl: null
  },
  {
    num: 3,
    title: 'Was ist bei Rangierfahrten zu beachten?',
    content: 'Beim Rangieren wird grundsätzlich „nach Sichtverhältnissen gefahren“ (Fahren auf Sicht).',
    reference: 'Ril 408.4814',
    imageUrl: null
  },
  {
    num: 4,
    title: 'Was ist eine Rangierfahrt?',
    content: 'Eine Rangierfahrt ist eine Fahrzeugbewegung beim Rangieren, bei der:\n• einzeln arbeitende Triebfahrzeuge oder\n• eine Gruppe gekuppelter Fahrzeuge, von denen mindestens ein Fahrzeug ein arbeitendes Triebfahrzeug ist,\nbewegt werden.',
    reference: 'Ril 408.4811',
    imageUrl: null
  },
  {
    num: 5,
    title: 'Abdrücken / Ablaufen',
    content: 'Abdrücken von Fahrzeugen über einen Ablaufberg, von dem sie durch eigene Schwerkraft ablaufen.',
    reference: 'Ril 408.4811',
    imageUrl: null
  },
  {
    num: 6,
    title: 'Was ist Bahnbetrieb?',
    content: 'Bahnbetrieb ist das Bewegen von Fahrzeugen.\nZum Bahnbetrieb gehören:\n• das Fahren von Zügen (Zugfahrten)\n• das Rangieren (Rangierfahrten / Rangierbewegungen)',
    reference: 'EBO § 14 / Ril 408.0101',
    imageUrl: null
  },
  {
    num: 7,
    title: 'Aufdrücken',
    content: 'Aufdrücken ist das Bewegen von Fahrzeugen zum Entkuppeln oder von kuppelreif stehenden Fahrzeugen zum Kuppeln.',
    reference: 'Ril 408.4811',
    imageUrl: null
  },
  {
    num: 8,
    title: 'Beidrücken',
    content: 'Beidrücken ist das Bewegen getrennt stehender Fahrzeuge zum Kuppeln.',
    reference: 'Ril 408.4811',
    imageUrl: null
  },
  {
    num: 9,
    title: 'Grundsatz zur Zustimmung des Weichenwärters bei einer Rangierfahrt',
    content: '• Grundsatz: Keine Rangierfahrt ohne Zustimmung des Weichenwärters (Ww).\n• Ausnahme: Verzicht auf Zustimmung des Ww unter bestimmten, festgelegten Voraussetzungen (z. B. wiederkehrende Rangierbewegungen, örtliche Zusätze).',
    reference: 'Ril 408.4814',
    imageUrl: null
  },
  {
    num: 10,
    title: 'Beteiligte einer Rangierfahrt können sein?',
    content: 'Beteiligte einer Rangierfahrt können sein:\n• Triebfahrzeugführer (Tf) und Weichenwärter (Ww)\n• Triebfahrzeugführer (Tf), Rangierbegleiter (Rb) und Weichenwärter (Ww)',
    reference: 'Ril 408.4812',
    imageUrl: null
  },
  {
    num: 11,
    title: 'Was ist die Rangiervereinbarung?',
    content: 'Die Rangiervereinbarung findet zwischen den Beteiligten einer Rangierfahrt statt.\n\nInhalt ist die ZZB-Formel:\n• Ziel: Von wo nach wo gefahren wird\n• Zweck: z. B. Bereitstellen von Zug (mit Zugnummer)\n• Besonderheit: abweichende Länge, Ladeübermaß (Lü), V- oder E-Traktion, Baugleis etc.\n\nAufträge und Meldungen sind stets durch den Empfänger zu wiederholen!',
    reference: 'Ril 408.4812',
    imageUrl: null
  },
  {
    num: 12,
    title: 'Zulässige Rangiergeschwindigkeiten',
    content: 'Zulässige Höchstgeschwindigkeiten beim Rangieren:\n• Grundsätzlich: Vmax 25 km/h\n• Bei Ansage des freien Fahrwegs: Vmax 40 km/h\n• Im Baugleis: Vmax 20 km/h\n\nStets Streckenbuch, örtliche Zusätze und EVU-Richtlinien beachten!',
    reference: 'Ril 408.4814',
    imageUrl: null
  },
  {
    num: 13,
    title: 'Geschwindigkeitsregelung durch den Tf beim Rangieren',
    content: 'Beim Rangieren muss der Triebfahrzeugführer die Geschwindigkeit so regeln, dass er:\n• vor Halt gebietenden Signalen,\n• vor Fahrzeugen,\n• vor Gefahrenstellen, die einen Halt erfordern (laut örtlichen Zusätzen oder Betra),\n• an der beabsichtigten Stelle\nsicher anhalten kann (Fahren auf Sicht, max. 25 km/h).',
    reference: 'Ril 408.4814',
    imageUrl: null
  },
  {
    num: 14,
    title: 'Definition Rangieren',
    content: 'Rangieren ist das Bewegen von Fahrzeugen im Bahnbetrieb, ausgenommen das Fahren der Züge.\nDas Bewegen von Fahrzeugen im Baugleis ist stets Rangieren.',
    reference: 'EBO § 14 / Ril 408.4811',
    imageUrl: null
  },
  {
    num: 15,
    title: 'Zusammenarbeit der Beteiligten mit Rangierbegleiter',
    content: '• Der Tf kann alle Aufgaben beim Rangieren (außer das Bedienen/Steuern des Triebfahrzeugs selbst) auf den Rangierbegleiter (Rb) übertragen.\n• Die Verständigung des Tf mit dem Ww ist in diesem Fall nicht erforderlich, da dies der Rb übernimmt.',
    reference: 'Ril 408.4812',
    imageUrl: null
  },
  {
    num: 16,
    title: 'Sonderfall Signal Sh 1 am Gleissperrensignal',
    content: '⚠️ Keine Zustimmung des Weichenwärters zur Rangierfahrt!\n\nSignal Sh 1 an einer formbedienten Gleissperre signalisiert lediglich, dass die Gleissperre abgelegt (ausgegleist) ist. Es beinhaltet KEINE Zustimmung zur Fahrt durch den Weichenwärter.\nDie Zustimmung zur Fahrt muss gesondert erteilt werden (z.B. durch Lichtsignal oder mündlich). Neuere Bezeichnung: Signal Wn 7.',
    reference: 'Ril 301 / Ril 408.4814',
    imageUrl: 'https://img.buffl.co/bc7faba0-3254-11ef-b3cc-d9c93705d25b.jpg'
  },
  {
    num: 17,
    title: 'Zusammenarbeit der Beteiligten ohne Rangierbegleiter',
    content: 'Aufgabenverteilung, wenn kein Rangierbegleiter eingesetzt ist:\n\nTriebfahrzeugführer (Tf):\n• Feststellen der Fahrbereitschaft\n• Fahrwegbeobachtung\n• Festlegen von Fahrzeugen (Sichern gegen Entlaufen)\n\nWeichenwärter (Ww):\n• Einstellen des Fahrwegs\n• Erteilung der Zustimmung zur Rangierfahrt (Signale Ra 12/Sh 1, mündlich, Handzeichen/Handlampe)',
    reference: 'Ril 408.4812 / Ril 408.4814',
    imageUrl: null
  },
  {
    num: 18,
    title: 'Möglichkeiten der Zustimmung des Weichenwärters',
    content: 'Die Zustimmung des Weichenwärters zur Rangierfahrt erfolgt durch:\n1. Signal Sh 1 (DS/DV) oder Ra 12 (DV)\n2. Mündliche Zustimmung\n3. Hochhalten eines Armes (bei Dunkelheit weiße Handlampe), wenn nicht durch Signal oder mündlich möglich',
    reference: 'Ril 408.4814 / Ril 301',
    imageUrl: null
  },
  {
    num: 19,
    title: 'Kennzeichnung der Umstellgewichte ortsbedienter Weichen und Gleissperren',
    content: 'Umstellgewichte ortsbedienter Weichen und Gleissperren:\n• Schwarze Seite oben / weiße Seite unten: Weiche bzw. Gleissperre besitzt eine Grundstellung (in Grundstellung verschlossen bzw. festgelegt)\n• Gelbe Seite oben / weiße Seite unten: Rückfallweiche\n• Weiße Seite oben / schwarze Seite unten: Weiche ohne Grundstellung (beliebig umstellbar)',
    reference: 'Ril 301 / Ril 408.4813',
    imageUrl: 'https://img.buffl.co/dbe8f250-3441-11ef-9e0e-4da30afc7be0.jpg'
  },
  {
    num: 20,
    title: 'Vorschrift zum Verwenden des Luftbremskopfes',
    content: 'Rangierfahrten, bei denen sich der Triebfahrzeugführer nicht auf dem Fahrzeug an der Spitze der Rangierfahrt befindet oder das Triebfahrzeug nicht steuert, müssen einen Luftbremskopf an der Spitze verwenden, wenn:\n• mit Wagen rangiert wird, die mit Reisenden besetzt sind,\n• an Wagen herangefahren wird, die mit Reisenden besetzt sind.',
    reference: 'Ril 408.4814 / VDV 757',
    imageUrl: null
  },
  {
    num: 21,
    title: 'Verhalten zur Gefahrenabwehr und Schadensminderung',
    content: 'Konkrete Maßnahmen bei Gefahr:\n• Eigenverantwortlich, vorsichtig und entschlossen handeln, um die Gefahr abzuwenden oder zu mindern.\n• Bei Gefahr müssen Züge und Rangierfahrten sofort angehalten werden, sofern dadurch nicht die Gefahr vergrößert wird.\n• Kommt bei Gefahr eine Fahrt zum Halten, so ist die Gefahr vorsorglich auch für das Nachbargleis anzunehmen.',
    reference: 'Ril 408.0102 / Ril 408.4814',
    imageUrl: null
  },
  {
    num: 22,
    title: 'Wo endet der Zustimmungsbereich des Weichenwärters?',
    content: 'Die Zustimmung des Ww endet an der Grenze vom Fernstellbereich zum Nahstellbereich.\n\n• Die Grenze kann eine Weiche sein; genaue Angaben findet der Tf im Streckenbuch bzw. den örtlichen Zusätzen.\n• Im Nahstellbereich befinden sich ortsgestellte und elektrisch ortsgestellte Weichen (EOW).',
    reference: 'Ril 408.4814',
    imageUrl: null
  },
  {
    num: 23,
    title: 'Verzicht auf Zustimmung des Weichenwärters beim Rangieren',
    content: 'Auf die Zustimmung des Weichenwärters kann verzichtet werden bei:\n• Regelmäßig wiederkehrenden Rangierbewegungen (laut örtlichen Zusätzen)\n• Einfahrt eines ankommenden Zuges (einzeln oder zu zweien fahrende Tfz) in ein Stumpfgleis, wenn dieser später dem ausfahrenden Zug oder der Rangierfahrt nachfährt\n• Vorziehen zum Kuppeln oder Entkuppeln\n• Beidrücken mit Förderanlagen oder durch ablaufrechnergestützte Lokomotiven\n• Beim Be- oder Entladen von Wagen (örtliche Zusätze beachten)\n• Rangieren im Baugleis (gemäß Betra)',
    reference: 'Ril 408.4814',
    imageUrl: null
  },
  {
    num: 24,
    title: 'Möglichkeiten des Tf zum Nothalt bei Gefahr',
    content: 'Möglichkeiten des Triebfahrzeugführers, in einer Gefahrensituation Züge und Rangierfahrten sofort anzuhalten:\n• Nothaltauftrag über Zugfunk (GSM-R Notruf)\n• Notsignal Sh 3: Kreisbewegung mit einer roten Flagge, einem roten Licht oder einem sonstigen roten Gegenstand\n• Signal Sh 5 (Hörsignal): Mehrmals drei kurze Töne nacheinander mit Signalhorn oder Lokpfeife',
    reference: 'Ril 301 / Ril 408.0456',
    imageUrl: null
  },
  {
    num: 25,
    title: 'Ablauf einer Rangierfahrt',
    content: 'Der Ablauf einer Rangierfahrt gliedert sich in folgende 5 Schritte:\n1. Verständigung (Rangiervereinbarung nach ZZB)\n2. Feststellen der Fahrbereitschaft\n3. Zustimmung des Weichenwärters (Signale Sh 1 / Ra 12, mündlich oder Handzeichen; ggf. Fahrauftrag durch Rb)\n4. Fahrwegbeobachtung (durch Rb oder Tf)\n5. Festlegen der Fahrzeuge (Sichern gegen Entlaufen – Aufgabe des Tf, übertragbar an Rb)',
    reference: 'Ril 408.4814',
    imageUrl: null
  },
  {
    num: 26,
    title: 'Was ist beim Abgeben eines Nothaltauftrags über Funk zu beachten?',
    content: 'Zur Abgabe des Nothaltauftrags muss immer dauerhaft die Sprechtaste (PTT-Taste) am Funkgerät gedrückt gehalten werden, solange der Auftrag gesprochen wird!',
    reference: 'Ril 408.0456 / GSM-R',
    imageUrl: null
  },
  {
    num: 27,
    title: 'Wortlaut eines Nothaltauftrags bei Oberleitungsschaden',
    content: 'Beispiel: Oberleitungsschaden im Bf Singen mit herabhängendem Quertragwerk:\n\n„Betriebsgefahr, alle Fahrten im Bahnhof Singen sofort anhalten!\nIch wiederhole:\nBetriebsgefahr, alle Fahrten im Bahnhof Singen sofort anhalten!\nHier Rangierfahrt im Bahnhof Singen, Oberleitungsschaden.“',
    reference: 'Ril 408.0456 / GSM-R',
    imageUrl: null
  },
  {
    num: 28,
    title: 'Signal zum Ermäßigen der Geschwindigkeit beim Rangieren',
    content: 'Das Rangiersignal zur Mäßigung der Geschwindigkeit wird gegeben durch:\n• Den Arm – bei Dunkelheit mit weiß leuchtender Laterne – senkrecht hochhalten und\n• gleichzeitig mit der Mundpfeife oder dem Horn einen langen Ton abgeben.',
    reference: 'Ril 301 / Ril 408.4814',
    imageUrl: null
  },
  {
    num: 29,
    title: 'Verhalten bei unvollständigem Notruf über Zugfunk',
    content: 'Situation: Sirenenartiger Notrufton über Zugfunk ertönt, Piktogramm auf dem Display erscheint, aber keine Sprachdurchsage ist zu hören.\n\nMaßnahmen:\n• Es liegt ein unvollständiger Notruf vor!\n• Sofort Weiterfahrt auf Sicht bis zur Klärung der Situation.\n• Aufmerksam auf Gefahren für die eigene Fahrt sowie andere Zug- und Rangierfahrten achten.\n• Unverzüglich Verbindung mit Fahrdienstleiter (Fdl) oder Weichenwärter (Ww) aufnehmen.\n• Ursache und Grund des Notrufs klären.',
    reference: 'Ril 408.0456 / GSM-R',
    imageUrl: 'https://img.buffl.co/c27f7660-33c2-11ef-9e0e-4da30afc7be0.jpg'
  },
  {
    num: 30,
    title: 'Aufbau und Bauteile des Luftbremskopfes',
    content: 'Bestandteile des Luftbremskopfes:\n1. Kupplungskopf für die Hauptluftleitung (HLL, 5,0 bar)\n2. Absperrhahn / Schnellentlüftungsventil (für Betriebs- oder Notbremsung von der Spitze)\n3. Manometer (zur kontinuierlichen Überwachung des Hauptluftleitungsdrucks an der Spitze)\n4. Signalpfeife / Warneinrichtung (zur Abgabe des Warnsignals Zp 1 bei Annäherung an Gefahrenstellen und Bahnübergänge)',
    reference: 'Ril 408 / VDV 757',
    imageUrl: 'https://img.buffl.co/a4d41fb0-33bf-11ef-9e0e-4da30afc7be0.jpg'
  },
  {
    num: 31,
    title: 'Bedeutung des Signals: Geschwindigkeit ermäßigen',
    content: 'Wird beim Rangieren der Arm – bei Dunkelheit mit der Laterne – hochgehalten und gleichzeitig mit der Mundpfeife oder dem Horn ein langer Ton gegeben, so bedeutet dies Mäßigung der Geschwindigkeit.',
    reference: 'Ril 301 / Ril 408.4814',
    imageUrl: null
  },
  {
    num: 32,
    title: 'Reichweite eines Nothaltauftrags über GSM-R Zugfunk',
    content: 'Wenn ein Nothaltauftrag über den GSM-R Notruf abgegeben wird, hören diesen alle Teilnehmer, die in der jeweiligen GSM-R Funkzelle eingebucht sind (Triebfahrzeugführer aller Züge und Rangierfahrten sowie zuständige Fahrdienstleiter / Disponenten).',
    reference: 'Ril 408.0456 / GSM-R',
    imageUrl: null
  },
  {
    num: 33,
    title: 'Verhalten bei Notruf mit Verdacht auf Zugtrennung',
    content: 'Situation: Notruf mit Durchsage „Betriebsgefahr, alle Fahrten im Bf Freiburg sofort anhalten... Verdacht auf Zugtrennung!“\n\nMaßnahmen:\n• Sofortige Schnellbremsung einleiten!\n• Umfeld beobachten und auf Gefährdungen für die eigene sowie benachbarte Fahrten achten.\n• Verbindung zum Fahrdienstleiter (Fdl) bzw. Weichenwärter (Ww) herstellen.\n• Ursache und Gefahrenbereich verbindlich klären.',
    reference: 'Ril 408.0456 / GSM-R',
    imageUrl: 'https://img.buffl.co/c27f7660-33c2-11ef-9e0e-4da30afc7be0.jpg'
  },
  {
    num: 34,
    title: 'Fahrauftrag durch den Rangierbegleiter',
    content: 'Der Fahrauftrag durch den Rangierbegleiter erfolgt:\n\n1. Durch Rangiersignale (Ril 301):\n• Signal Ra 1: Wegfahren (vom Signalgebenden weg)\n• Signal Ra 2: Herkommen (auf den Signalgebenden zu)\n• Signal Ra 3: Aufdrücken\n• Signal Ra 4: Abstoßen\n• Signal Ra 5: Rangierhalt\n\n2. Mündlich (z.B. per Rangierfunk)',
    reference: 'Ril 301 / Ril 408.4814',
    imageUrl: null
  },
  {
    num: 35,
    title: 'Welches Rangiersignal gilt bereits, wenn es nur hörend ODER sehend wahrgenommen wird?',
    content: 'Signal Ra 5 – Rangierhalt!\n\nEs gilt aus Sicherheitsgründen sofort, sobald es entweder nur akustisch gehört oder nur optisch gesehen wird.',
    reference: 'Ril 301',
    imageUrl: null
  },
  {
    num: 36,
    title: 'Besonderheiten und Gefahren beim Rangieren in Ladegleisen',
    content: 'Beim Rangieren in Ladegleisen ist mit erhöhter Vorsicht zu rangieren, weil:\n• sich Personen im oder am Gleis aufhalten können,\n• Personen mit Arbeiten an den Fahrzeugen beschäftigt sein können,\n• das lichte Raumprofil nach oben durch schwebende Lasten (Kräne) eingeschränkt sein kann,\n• Fahrzeuge nahe am Gleis stehen (Grenzzeichen / lichter Raum nicht frei),\n• an Fahrzeugen ein- oder ausgeladen wird,\n• Beschäftigte oft nicht mit den Gefahren des Bahnbetriebs vertraut sind,\n• die Oberleitung ggf. ausgeschaltet ist.\n\nWichtig: Vorab immer mit den örtlichen Zusätzen und Bedienungsanleitungen der Ladeanlage vertraut machen!',
    reference: 'Ril 408.4814 / UVV',
    imageUrl: null
  },
  {
    num: 37,
    title: 'Verhalten, wenn die Durchsage bei einem Nothaltauftrag abbricht',
    content: 'Bricht die Durchsage eines Nothaltauftrags unvollständig ab:\n• Gilt als unvollständiger Nothaltauftrag!\n• Sofort anhalten!\n• Über Funk Verbindung mit dem Fahrdienstleiter (Fdl) bzw. Weichenwärter (Ww) aufnehmen und Ursache klären.',
    reference: 'Ril 408.0456 / GSM-R',
    imageUrl: null
  },
  {
    num: 38,
    title: 'Befahren von technisch gesicherten Bahnübergängen beim Rangieren',
    content: 'Verhalten an technisch gesicherten Bahnübergängen (BÜ) beim Rangieren:\n\nWenn technische Sicherung in Ordnung ist:\n• Befahren gemäß örtlichen Richtlinien (ÖRil).\n\nWenn technische Sicherung gestört / nicht in Ordnung ist:\n• Tfz-gesteuert oder mit Rangierbegleiter: Halt vor dem BÜ! Sicherung durch Posten erforderlich.\n• Tf allein: Halt vor dem BÜ! Weiterfahrt mit Signal Zp 1 (Achtungspfiff):\n  1. Anhalten vor dem BÜ\n  2. Pfeifen (Signal Zp 1)\n  3. Straßenverkehr beobachten\n  4. Vorsichtig anfahren, ab BÜ-Mitte zügig räumen.',
    reference: 'Ril 408.4814 / Ril 408.0471',
    imageUrl: null
  },
  {
    num: 39,
    title: 'Vorrangig beim Rangieren zu verwendende Gleise',
    content: 'Beim Rangieren werden Gleise in folgender Priorität genutzt:\n• Ausziehgleise (vorrangig zu nutzen)\n• Ausfahrgleise: Soweit wie möglich, maximal bis zum nächsten Hauptsignal\n• Einfahrgleise: Bis zum Signal Ra 10 (Rangierhalttafel) bzw. bis zur Einfahrweiche',
    reference: 'Ril 408.4814',
    imageUrl: null
  },
  {
    num: 40,
    title: 'Voraussetzungen für den Übergang einer Rangierfahrt in eine Zugfahrt',
    content: 'Bedingungen für den Übergang:\n• Am nächsten Hauptsignal (bei Gruppensignalen am zugehörigen Sperrsignal) muss nicht angehalten werden, wenn alle Voraussetzungen für eine Zugfahrt erfüllt sind!\n• Nicht zugelassen bei Gruppensignalen ohne Sperrsignal oder hohem Formsperrsignal.\n• Rangierfahrten aus einem Baugleis müssen grundsätzlich anhalten (Betra beachten)!\n• Die Zugfahrt beginnt mit Vorbeifahrt der Fahrzeugspitze am Signal.',
    reference: 'Ril 408.4814 / Ril 408.0211',
    imageUrl: null
  },
  {
    num: 41,
    title: 'Übergang einer Zugfahrt in eine Rangierfahrt',
    content: 'Übergang mit Halt:\n• Halt am gewöhnlichen Halteplatz im Bahnhof\n• Halt am Halt zeigenden Signal im Bahnhof\n• Halt am Halt zeigenden Signal bei Einfahrt in ein Baugleis\n• Auf dem Gegengleis bei Einfahrt in ein Baugleis: Halt am Signal Ne 1 oder auf Höhe des Block-/Einfahrsignals\n• Halt an einer Anschlussweiche auf freier Strecke (Bedienung einer Ausweichanschlussstelle / Awanst ohne Hauptsignal)\n\nÜbergang ohne Halt:\n• In Bahnhöfen am gewöhnlichen Halteplatz ohne Halt, wenn im Streckenbuch die Zugnummer genannt ist und der Weichenwärter der Weiterfahrt als Rangierfahrt am Halt zeigenden Hauptsignal zustimmt (durch Signal Sh 1 oder Signal Ra 12).\n\nDie Rangierfahrt beginnt mit Vorbeifahrt der Spitze am Signal.',
    reference: 'Ril 408.4814 / Ril 408.0211',
    imageUrl: null
  }
];

const formattedCards = rawCards.map(c => {
  return {
    id: `fact_rang_buffl_${String(c.num).padStart(2, '0')}`,
    category: 'Rangieren',
    title: c.title,
    content: c.content,
    reference: packFactMetadata(c),
    image_url: c.imageUrl,
    is_verified: false
  };
});

console.log(`Prepared ${formattedCards.length} cards for upload.`);
console.log('Sample card:', JSON.stringify(formattedCards[0], null, 2));

const payload = JSON.stringify(formattedCards);

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
  console.log('UPLOAD HTTP STATUS:', res.statusCode);
  let respData = '';
  res.on('data', chunk => respData += chunk);
  res.on('end', () => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      console.log('UPLOAD SUCCESSFUL!');
      
      // Verify count in Supabase
      https.get({
        hostname: 'ahmcoyfmdrgpmclaxgfj.supabase.co',
        path: '/rest/v1/flashcards?category=eq.Rangieren&select=id,title,is_verified',
        headers: { 'apikey': KEY, 'Authorization': 'Bearer ' + KEY }
      }, res2 => {
        let d = '';
        res2.on('data', c => d += c);
        res2.on('end', () => {
          const rows = JSON.parse(d);
          console.log(`TOTAL RANGIEREN CARDS IN SUPABASE: ${rows.length}`);
          const unverified = rows.filter(r => !r.is_verified);
          const verified = rows.filter(r => r.is_verified);
          console.log(`- Geprüft: ${verified.length}`);
          console.log(`- Ungeprüft: ${unverified.length}`);
        });
      });
    } else {
      console.error('Upload failed with response:', respData);
    }
  });
});

req.on('error', err => {
  console.error('Request error:', err);
});

req.write(payload);
req.end();
