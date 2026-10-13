const https = require('https');
const KEY = 'sb_publishable_cENpbfjZbysfKIjFKxTFWg_YziNteq1';

const facts = [
  {
    id: 'f_wm_1',
    category: 'Wagenmeister',
    title: 'Aufgaben und Verantwortung des Wagenprüfers Stufe 4 im Kombinierten Verkehr',
    content: 'Der Wagenprüfer Stufe 4 führt die wagentechnische Untersuchung von Zügen des Kombinierten Verkehrs (KV) und Gefahrgutzügen durch. Zu den Kernaufgaben gehören:\n1. Prüfung der Ladeeinheiten (Container, Wechselbehälter, Sattelanhänger) auf Zustand, Beschädigung und Verriegelung.\n2. Prüfung der Trägerfahrzeuge (Taschenwagen, Tragwagen) inkl. Klappriegel, Stützböcke, Zapfenschlösser und Radmulden.\n3. Abgleich der Kodifizierung (Profilnummern C/P) mit der Streckenfreigabe nach UIC 596-6.\n4. Gefahrgutprüfung nach RID (Großzettel, UN-Tafeln, Beförderungspapiere).',
    reference: 'VDV-Schrift 758 / VDV-Schrift 753 / UIC 596-6',
    is_verified: true
  },
  {
    id: 'f_wm_2',
    category: 'Wagenmeister',
    title: 'Verriegelung des Königszapfens (Kingpin) im Stützbock',
    content: 'Beim Verladen eines Sattelanhängers (Trailers) in die Tasche eines Taschenwagens (z.B. T2000, T3000e) greift der Königszapfen (2 Zoll oder 3,5 Zoll) in die Verriegelungsklaue des Stützbocks. Prüfpunkte:\n1. Der Sperrhebel / die Verriegelungsanzeige muss vollständig in verriegelter Position eingerastet sein (oft Farbmarkierung grün sichtbar).\n2. Das Zapfenschloss muss spielfrei anliegen.\n3. Die Stützbockhöhe muss passend zur Codierung eingestellt und arretiert sein (Bockhöhe H1 bis H4).',
    reference: 'VDV 758 / UIC 571-4 / Bedienungsanleitung Tragwagen T3000e',
    is_verified: true
  },
  {
    id: 'f_wm_3',
    category: 'Wagenmeister',
    title: 'Vorschriftsmäßige Vorbereitung eines Trailers für den Bahntransport',
    content: 'Bevor ein Sattelanhänger im Taschenwagen transportiert werden darf, müssen folgende Punkte geprüft sein:\n1. Luftfederung des Trailers muss vollständig entlüftet / abgesenkt sein (Schalter auf "Fahrt/Bahnverladung" oder manuelle Entlüftung).\n2. Feststellbremse (Federspeicher) des Trailers muss eingelegt sein.\n3. Stützbeine des Trailers müssen ganz eingekurbelt und gesichert sein (Bodenfreiheit!).\n4. Planen, Spriegel und Hecktüren müssen geschlossen und ordnungsgemäß verriegelt/verzurrt sein.\n5. Unterfahrschutz muss ggf. hochgeklappt bzw. in Bahnposition verriegelt sein.',
    reference: 'VDV-Schrift 758 / UIC 596-5 / ILU-Code Richtlinien',
    is_verified: true
  },
  {
    id: 'f_wm_4',
    category: 'Wagenmeister',
    title: 'Prüfung und Grenzmaße von Klappriegeln für ISO-Container und WAB',
    content: 'Tragwagen besitzen feste und umklappbare Riegelbolzen (Klappriegel / Twistlocks) zur formschlüssigen Aufnahme der Eckbeschläge (Corner Castings):\n1. Nicht benötigte Riegelbolzen müssen vollständig umgelegt und unter die Ladeebene versenkt sein, damit Containerböden nicht aufliegen oder beschädigt werden.\n2. Genutzte Klappriegel müssen senkrecht stehen und die Sicherungsklinke muss gegen selbsttätiges Umklappen gesichert sein.\n3. Riegelzapfen dürfen keine Risse, Verbiegungen oder Abscherungen aufweisen.',
    reference: 'AVV / GCU Anhang 9, Ziffer 4.2 / UIC 571-4',
    is_verified: true
  },
  {
    id: 'f_wm_5',
    category: 'Wagenmeister',
    title: 'Bedeutung und Aufbau der Codenummerntafel (P- und C-Nummern)',
    content: 'Die gelbe Codenummerntafel an Ladeeinheiten kennzeichnet das Profilmaß:\n• C-Code (Container/Wechselbehälter): z.B. C 45, C 70 – gibt die zulässige Eckhöhe bzw. Profilkontur an.\n• P-Code (Pocket / Sattelanhänger): z.B. P 400 – gibt die Gesamthöhe des Trailers auf Standard-Taschenwagen (Stützbockhöhe 33 cm) an (z.B. P 400 = 4,00 m Eckhöhe über SO).\nDas Profil der Ladeeinheit darf die für die befahrbare Eisenbahnstrecke freigegebene Streckenkodierung nicht überschreiten!',
    reference: 'UIC-Merkblatt 596-6 / VDV 758',
    is_verified: true
  },
  {
    id: 'f_wm_6',
    category: 'Wagenmeister',
    title: 'Greifkantenmarkierungen und Hubpunkte nach UIC 596-5',
    content: 'Nur kranbare Trailer dürfen mit Portalkran / Reachstacker umgeschlagen werden. Erkennungsmerkmale:\n1. Gelbe Warndreiecke / Markierungen an den 4 Greifkantenbereichen am Fahrgestell.\n2. Keine Beschädigung oder Verformung der Greifkantentaschen und Unterzugträger.\n3. ILU-Code (Intermodal Loading Unit) bzw. BIC-Code an den Außenwänden zur eindeutigen Identifikation im europäischen KV-Netz.',
    reference: 'UIC 596-5 / DIN EN 13044 (ILU-Code)',
    is_verified: true
  },
  {
    id: 'f_wm_7',
    category: 'Wagenmeister',
    title: 'Prüfkriterien für Wechselbehälter (WAB) nach EN 284 / EN 452',
    content: 'Bei Wechselbehältern (Wechselbrücken) auf Tragwagen ist zwingend zu kontrollieren:\n1. Die 4 Stützbeine müssen vollständig eingeklappt, an den Fahrzeugunterbau herangeschwenkt und mit den Sicherungsbolzen formschlüssig arretiert sein.\n2. Eckbeschläge müssen sauber auf den Klappriegeln aufsitzen (kein Verkanten, Riegelzapfen greift vollständig ein).\n3. Aufbauwände, Rollos und Flügeltüren müssen intakt und gegen Aufspringen gesichert sein.',
    reference: 'VDV 758 / AVV Anhang 9 / DIN EN 284',
    is_verified: true
  },
  {
    id: 'f_wm_8',
    category: 'Wagenmeister',
    title: 'Grenzmaße am Radsatz: qR-Maß, Spurkranzdicke und -höhe',
    content: 'Kritische Grenzmaße zur Entgleisungssicherheit bei der Wagenprüfung:\n• qR-Maß (Spurkranzflankensteile): Grenzwert: qR <= 6,5 mm (Messung mit qR-Lehre). Bei qR <= 6,5 mm besteht akute Entgleisungsgefahr an Weichen (Aufklettern der Spurkranzflanke)!\n• Spurkranzdicke (Sd): Grenzwert: Sd <= 22 mm (bzw. nach Wagenraster).\n• Spurkranzhöhe (Sh): Grenzwert: Sh > 36 mm (Gefahr des Aufsetzens auf Schienenbefestigungen).\n• Gratbildung: Grat am Spurkranz >= 5 mm ist unzulässig.',
    reference: 'AVV / GCU Anhang 9, Ziffer 1.2 / VDV-Schrift 758 / Ril 936',
    is_verified: true
  },
  {
    id: 'f_wm_9',
    category: 'Wagenmeister',
    title: 'Beurteilung von Flachstellen und Materialaufschweißungen am Rad',
    content: 'Grenzwerte nach AVV / GCU Anhang 9:\n• Flachstelle / Materialaufschweißung: Zulässig bis maximal 60 mm Länge (bei Raddurchmesser >= 840 mm). Über 60 mm: Wagen ist nicht lauffähig (Ausreihung erforderlich).\n• Ausbröckelungen / Schälungen: Bis max. 60 mm Länge zulässig, sofern keine Rissbildung in die Radfelge vorliegt.\n• Rissbildung: Jeder Riss in Radscheibe, Radkranz, Nabe oder Radwelle führt zum sofortigen Stillstand (Betriebsgefahr / Radbruchgefahr!).',
    reference: 'AVV Anhang 9, Ziffer 1.3 / VDV 758',
    is_verified: true
  },
  {
    id: 'f_wm_10',
    category: 'Wagenmeister',
    title: 'Schadensbeurteilung an Blattfedern, Parabelfedern und Schaken',
    content: 'Bei der Wagenprüfung gelten folgende Mängel an der Federung als betriebsgefährdend:\n1. Federhauptblatt (1. Lage) gebrochen oder gerissen: Sofortige Betriebsunfähigkeit.\n2. Mehr als ein Zwischenblatt gebrochen: Wagen aussetzen.\n3. Federbundverschiebung um mehr als 10 mm.\n4. Federschaken / Schakenbolzen gebrochen, ausgeschlagen, Sicherungssplint fehlt oder Bolzen wandert heraus.\n5. Schiefe Lage des Wagenkastens durch Federbruch oder Federüberlastung.',
    reference: 'AVV Anhang 9, Ziffer 2.1 / Ril 936',
    is_verified: true
  },
  {
    id: 'f_wm_11',
    category: 'Wagenmeister',
    title: 'Besondere Prüfpunkte am Standard-Güterwagendrehgestell Y25',
    content: 'Das Drehgestell Bauart Y25 ist das Standard-Drehgestell in Europa. Wichtige Prüfpunkte:\n1. Gleitstückspiel: Das Spiel zwischen Gleitstück und Wagenkasten muss gleichmäßig vorhanden sein (Sollmaß typisch 3–5 mm pro Seite bzw. nach Wagenanschrift). Fest aufliegende Gleitstücke behindern das Ausdrehen des Drehgestells im Bogen (Entgleisungsgefahr!).\n2. Lenkerbolzen & Schaken: Verschleiß und Sicherungen prüfen.\n3. Bremsdreieck & Bremsquerhaupt: Fangschlaufen müssen intakt und unbeschädigt sein (verhindert das Herabfallen ins Gleisbett).',
    reference: 'VDV-Schrift 758 / GCU Anhang 9 / UIC 510-1',
    is_verified: true
  },
  {
    id: 'f_wm_12',
    category: 'Wagenmeister',
    title: 'Prüfkriterien an Puffern und Schraubenkupplungen',
    content: 'Mängel an Zug- und Stoßeinrichtungen:\n• Puffer: Mindesthub beachten; Pufferteller darf keine Risse oder Ausbrüche aufweisen; Pufferstößel muss gefedert sein (kein Blockstand / Durchfedern ohne Rückstellung). Höhenunterschied zwischen Puffermitten gekuppelter Fahrzeuge max. 125 mm.\n• Schraubenkupplung: Zughakenmaul auf Risse und Aufweitung prüfen; Spindelgewinde muss leichtgängig sein; Kupplungslasche und Zugbügel dürfen keine Risse oder unzulässige Schweißungen aufweisen. Die unbenutzte Kupplung muss zwingend im Kupplungshaken aufgehängt sein.',
    reference: 'AVV Anhang 9, Ziffer 3 / VDV 758 / Ril 936',
    is_verified: true
  },
  {
    id: 'f_wm_13',
    category: 'Wagenmeister',
    title: 'Bedeutung der Schadwagenzettel (Muster I, K, M, R1, U)',
    content: 'Die Kennzeichnung von Schadwagen nach AVV Anhang 9 / 11:\n• Muster I (blau): Wagen ist betriebsunfähig / nicht lauffähig (Darf nicht bewegt werden bzw. nur auf Hilfsdrehgestell).\n• Muster K (rot): Wagen ist schadhaft, aber lauffähig unter Auflagen (z.B. nur leer zur nächsten Werkstatt, Vmax begrenzt).\n• Muster M (weiß mit rotem Rand): Wagen hat Mängel, ist voll betriebsfähig und lauffähig, Reparatur bei nächster Revision/Gelegenheit.\n• Muster R1 (grün): Druckluftbremse ist ausgeschaltet / unwirksam.\n• Muster U (gelb): Wagen zur Nachprüfung / Überwachungsfrist abgelaufen.',
    reference: 'AVV / GCU Anhang 9 & Anhang 11 / VDV 758',
    is_verified: true
  },
  {
    id: 'f_wm_14',
    category: 'Wagenmeister',
    title: 'Mindestdicken und Verschleißkriterien von Bremsklotzsohlen',
    content: 'Bei der Wagenprüfung der Bremsausrüstung gilt:\n• Verbundstoffbremssohlen (K- / LL-Sohlen / Flüsterbremse): Mindestbelagdicke an der dünnsten Stelle beträgt 10 mm (oder bis zur Verschleißmarkierungsnut im Belag). Keine Ausbrüche bis auf das Trägerblech.\n• Graugusssohlen (P10): Mindestdicke 10 mm an der dünnsten Stelle.\n• Scheibenbremsen: Bremsbelagdicke min. 5 mm (bzw. Restbelagnut sichtbar), Bremsscheibe auf Heißrisse und Riefen prüfen.',
    reference: 'AVV Anhang 9, Ziffer 5 / VDV 757 & 758 / Ril 915',
    is_verified: true
  },
  {
    id: 'f_wm_15',
    category: 'Wagenmeister',
    title: 'Das Lastgrenzenraster am Güterwagen verstehen und anwenden',
    content: 'Das Lastgrenzenraster gibt das maximale Ladegewicht in Tonnen abhängig von Streckenklasse und Geschwindigkeit an:\n• Streckenklasse A: 16,0 t Achslast / 4,8 t/m Meterlast\n• Streckenklasse B: 18,0 t Achslast / 5,0 t (B1) bzw. 6,4 t/m (B2)\n• Streckenklasse C: 20,0 t Achslast / bis 7,2 t/m Meterlast\n• Streckenklasse D: 22,5 t Achslast / 8,0 t/m Meterlast.\nSpalten "S" (100 km/h) und "SS" (120 km/h) geben die Zuladung bei erhöhter Geschwindigkeit an. Eine Überschreitung der Rasterwerte führt zu unzulässiger Überladung!',
    reference: 'UIC 570 / Ril 936 / AVV Anhang 9',
    is_verified: true
  },
  {
    id: 'f_wm_16',
    category: 'Wagenmeister',
    title: 'Ladungsverteilung: Längs- und Querschwerpunkt bei Güterwagen',
    content: 'Falsche Beladung führt zu Entgleisungsgefahr im Bogen:\n1. Querschwerpunkt: Das Verhältnis der Radlasten einer Achse darf maximal 1,25 : 1 (bzw. Raddruckdifferenz nach UIC) betragen.\n2. Längsschwerpunkt: Das Verhältnis der Radsatzlasten zwischen den Achsen bzw. Drehgestellen darf in der Regel 3 : 1 nicht überschreiten.\n3. Ladungssicherung: Formschluss, Verkeilung und Zurrgurte nach CTU-Code müssen die Trägheitskräfte bei Anfahren (1,0 g), Bremsen (1,0 g) und Rangierstößen (bis zu 4,0 g beim Auflaufen) sicher aufnehmen.',
    reference: 'CTU-Code / UIC-Verladerichtlinien Band 1 & 2 / Ril 936',
    is_verified: true
  },
  {
    id: 'f_wm_17',
    category: 'Wagenmeister',
    title: 'Gefahrgutkennzeichnung an Ladeeinheiten und Tragwagen nach RID',
    content: 'Beim Transport von Gefahrgut im Kombinierten Verkehr müssen folgende Kennzeichnungen übereinstimmen:\n1. Großzettel (Placards, 250 × 250 mm): Müssen an allen 4 Seiten von Tankcontainern und WAB sowie an beiden Längsseiten des Tragwagens angebracht sein.\n2. Orangefarbene Warntafeln (300 × 400 mm): Müssen oben die Gefahrnummer (Kemler-Zahl, z.B. 33 = leicht entzündbar) und unten die UN-Nummer (z.B. 1203 = Benzin) tragen.\n3. Umweltgefährdende Stoffe: Fisch-und-Baum-Symbol.\n4. Warntafeln und Zettel müssen sauber, lesbar und unbeschädigt sein.',
    reference: 'RID Teil 5 / VDV 758',
    is_verified: true
  },
  {
    id: 'f_wm_18',
    category: 'Wagenmeister',
    title: 'Schutzabstände und Reihungsvorschriften für Gefahrgutwagen',
    content: 'Nach RID und betrieblichen Regelwerken (Ril 408 / VDV 758):\n1. Zwischen Triebfahrzeugen / besetzten Personenwagen und Wagen mit explosionsgefährlichen Stoffen (Klasse 1) oder giftigen Gasen (Klasse 2.3) müssen Schutzwagen bzw. Schutzabstände (z.B. mindestens 18 Meter / 2 zweiachsige bzw. 1 vierachsiger Schutzwagen) eingehalten werden.\n2. Gefahrgutwagen dürfen nicht neben brennbaren Flüssigkeiten oder Stoffen mit Selbsterhitzungsgefahr gereiht werden, wenn ein Zusammenladeverbot besteht.',
    reference: 'RID Kapitel 7.5 / VDV-Schrift 758 / Ril 408',
    is_verified: true
  },
  {
    id: 'f_wm_19',
    category: 'Wagenmeister',
    title: 'Funktionsprüfung von automatischen und manuellen Lastwechseln',
    content: 'Güterwagen verfügen über manuelle oder automatische Lastabbremsung:\n• Manueller Lastwechsel (Umstellhebel Leer/Beladen): Der Hebel muss auf "Beladen" umgestellt werden, sobald das Gesamtgewicht des Wagens das am Wechsel angeschriebene Umschaltgewicht (z.B. 24 t) erreicht oder überschreitet.\n• Automatischer Lastwechsel (z.B. über Wiegeventil am Drehgestell): Erfasst den Einfederungsweg und steuert den Bremszylinderdruck stufenlos proportional zur Zuladung aus. Der Druckanzeiger / das Wiegeventil muss dicht und unbeschädigt sein.',
    reference: 'VDV-Schrift 757 & 758 / Ril 915.0102',
    is_verified: true
  },
  {
    id: 'f_wm_20',
    category: 'Wagenmeister',
    title: 'Außergewöhnliche Sendungen und Überschreitung des Lademaßes',
    content: 'Eine Ladung gilt als "Außergewöhnliche Sendung" (Beförderung mit besonderer Genehmigung / Lü-Sendung), wenn:\n1. Die Abmessungen das Regel-Lademaß (z.B. G1, G2, GA, GB, GC) überschreiten (Lü = Lademaßüberschreitung).\n2. Das zulässige Metergewicht oder die Achslast überschritten wird (Schwerkleinwagen/Tieflader).\n3. Besondere Fahrbedingungen erforderlich sind (z.B. Geschwindigkeitsbeschränkung, Fahrten nur im gesperrten Nachbargleis, ausgeschaltete Oberleitung).\nDer Wagenmeister prüft die Einhaltung aller in der Fahrordnung / Lü-Genehmigung vorgeschriebenen Auflagen!',
    reference: 'Ril 458 (Außergewöhnliche Sendungen) / UIC 502 / VDV 758',
    is_verified: true
  },
  {
    id: 'f_wm_21',
    category: 'Wagenmeister',
    title: 'Aufbau der 12-stelligen UIC-Wagennummer',
    content: 'Jedes europäische Eisenbahnfahrzeug trägt eine 12-stellige Wagennummer:\n• Ziffern 1–2: Austauschcode (Interoperabilitätsfähigkeit, z.B. 31/33 TEN-RIV Drehgestellwagen).\n• Ziffern 3–4: Ländercode (z.B. 80 = Deutschland, 85 = Schweiz, 81 = Österreich).\n• Ziffern 5–8: Haupt- und Nebengattungsmerkmale (z.B. Sdggmrss für Gelenktragwagen KV).\n• Ziffern 9–11: Fortlaufende Ordnungsnummer.\n• Ziffer 12: Selbstkontrollziffer (berechnet nach dem Luhn-Algorithmus / Gewichtung 2-1-2-1).',
    reference: 'TSI WAG / UIC 438-2 / AVV Anhang 6',
    is_verified: true
  },
  {
    id: 'f_wm_22',
    category: 'Wagenmeister',
    title: 'Sichern von Güterwagen mit Feststellbremsen und Hemmschuhen',
    content: 'Vorschriften zur Abstellsicherung nach VDV 758 / VDV 757 / Ril 408:\n1. Jeder abzustellende Zug / Wagengruppe muss gegen Entlaufen gesichert werden.\n2. Bodenbedienbare Handbremsen / Feststellbremsen (gelbes Handrad): Müssen mit voller Körperkraft fest angezogen werden. Das angeschriebene Handbremsgewicht (z.B. Feststellbremse 20 t) muss zur Deckung der erforderlichen Festhaltekraft ausreichen.\n3. Bei unzureichendem Handbremsgewicht oder geneigten Gleisen müssen zusätzlich doppelseitig wirkende Hemmschuhe formschlüssig unter die talseitigen Räder gelegt werden.',
    reference: 'VDV 757 / VDV 758 / Ril 408.0551',
    is_verified: true
  }
];

const payload = JSON.stringify(facts);

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
  console.log('INSERT STATUS:', res.statusCode);
  https.get({
    hostname: 'ahmcoyfmdrgpmclaxgfj.supabase.co',
    path: '/rest/v1/flashcards?category=eq.Wagenmeister&select=*',
    headers: { 'apikey': KEY, 'Authorization': 'Bearer ' + KEY }
  }, res2 => {
    let d = '';
    res2.on('data', c => d += c);
    res2.on('end', () => {
      const rows = JSON.parse(d);
      console.log('SUCCESS! TOTAL WAGENMEISTER FLASHCARDS IN SUPABASE:', rows.length);
    });
  });
});
req.write(payload);
req.end();
