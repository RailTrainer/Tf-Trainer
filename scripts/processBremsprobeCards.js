const fs = require('fs');
const path = require('path');
const https = require('https');

const ALL_FLASHCARDS_PATH = path.join(__dirname, '..', 'data', 'generated', 'all_flashcards.json');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const KEY = 'sb_publishable_cENpbfjZbysfKIjFKxTFWg_YziNteq1';
const SUPABASE_URL = 'https://ahmcoyfmdrgpmclaxgfj.supabase.co';

const cardData = [
  {
    title: 'Grundformen der Eisenbahnbremsen',
    content: 'Die Grundformen der Bremsen im Eisenbahnbetrieb:\n\n1. Radbremsen: Wirken mechanisch über Reibung auf das Rad (Klotzbremse, Scheibenbremse, Trommelbremse).\n2. Schienenbremsen: Wirken berührend direkt auf die Schiene (Magnetschienenbremse / Mg).\n3. Triebwerksbremsen (dynamische Bremsen): Nutzen das Triebwerk zur Verzögerung (elektrodynamische Bremse, hydrodynamische Bremse).',
    reference: 'VDV-Schrift 757 / Ril 915'
  },
  {
    title: 'Funktionsweise der elektrodynamischen Bremse (ED-Bremse)',
    content: 'Bei der elektrodynamischen Bremse (E-Bremse / Nutzbremse):\n\n• Die Fahrmotoren des Triebfahrzeugs werden nach dem Abschalten der Zugkraft als Generatoren geschaltet.\n• Die erzeugte Bremsenergie wird entweder über Bremswiderstände in Wärme umgewandelt (Widerstandsbremse) oder zurück in die Oberleitung eingespeist (Netzbremse / Rekuperation).\n• Arbeitet verschleißfrei.',
    reference: 'VDV 757, Bremstechnik'
  },
  {
    title: 'Funktionsweise der hydrodynamischen Bremse (H-Bremse)',
    content: 'Bei dieselhydraulischen Triebfahrzeugen:\n\n• Die Bremswirkung wird durch hydrodynamischen Öldruck in einem Strömungsgetriebe (Retarder / Bremswandler) erzeugt.\n• Das Getriebeöl wird zwischen Schaufelrädern verwirbelt; die Bremswärme wird über den Kühlkreislauf abgeführt.\n• Verschleißfreie Verzögerung bei höheren Geschwindigkeiten.',
    reference: 'VDV 757, Bremstechnik'
  },
  {
    title: 'Übersicht der Bremsungsarten im Bahnbetrieb',
    content: 'Im Eisenbahnbetrieb werden folgende Bremsungsarten unterschieden:\n\n1. Betriebsbremsung (dosierbar zur Geschwindigkeitsregelung)\n2. Vollbremsung (maximale Stufe der Betriebsbremse)\n3. Schnellbremsung (schnellstmögliche Entlüftung der HL auf 0 bar)\n4. Zwangsbremsung (automatisch durch Zugsicherung / Sifa / Zugtrennung)\n5. Zwangsbetriebsbremsung (z.B. durch LZB / ETCS zur Geschwindigkeitsreduktion)\n6. Notbremsung (über Notbremseinrichtung durch Personal oder Reisende)',
    reference: 'VDV-Schrift 757, Abschnitt 2 / Ril 915'
  },
  {
    title: 'Definition: Betriebsbremsung',
    content: 'Die Betriebsbremsung:\n\n• Dient der planmäßigen Regulierung der Fahrgeschwindigkeit sowie dem fahrplanmäßigen Halten des Zuges an Bahnsteigen oder vor Signalen.\n• Wird feinfühlig und stufenweise über das Führerbremsventil geregelt (Druckabsenkung in der HL zwischen 0,4 bar und maximal ca. 1,5 bar).',
    reference: 'VDV-Schrift 757'
  },
  {
    title: 'Definition: Vollbremsung',
    content: 'Die Vollbremsung:\n\n• Ist die größtmögliche Betriebsbremsstufe.\n• Wird durch eine Druckabsenkung in der Hauptluftleitung (HL) von 5,0 bar auf ca. 3,5 bar erreicht.\n• Bei 3,5 bar HL-Druck ist der maximale Bremszylinderdruck (C-Druck) der Betriebsbremse vollständig ausgesteuert (ca. 3,8 bar). Eine weitere Druckabsenkung vergrößert die Bremskraft nicht mehr.',
    reference: 'VDV-Schrift 757 / Ril 915'
  },
  {
    title: 'Definition: Schnellbremsung',
    content: 'Die Schnellbremsung:\n\n• Erzeugt die maximale Bremskraft in der kürzestmöglichen Zeit.\n• Die Hauptluftleitung (HL) wird schlagartig über einen großen Querschnitt im Führerbremsventil vollständig auf 0 bar entlüftet.\n• Bei Fahrzeugen mit Schnellbremsbeschleunigern sprechen diese an und beschleunigen die Druckwelle im gesamten Zugverband.',
    reference: 'VDV-Schrift 757 / Ril 915'
  },
  {
    title: 'Definition: Zwangsbremsung',
    content: 'Die Zwangsbremsung:\n\n• Ist eine selbsttätig und unabhängig vom Willen des Triebfahrzeugführers eingeleitete Schnellbremsung.\n• Ursachen: Ansprechen der Zugsicherung (PZB 2000 Hz / Wachsamkeit versäumt / Überwachungsgeschwindigkeit überschritten), Sifa-Zwangsbremsung oder unbeabsichtigte Zugtrennung (HL-Abreißen).',
    reference: 'Ril 483 / Ril 492 / VDV 757'
  },
  {
    title: 'Definition: Zwangsbetriebsbremsung',
    content: 'Die Zwangsbetriebsbremsung:\n\n• Wird durch moderne Zugsicherungssysteme (z.B. LZB oder ETCS) automatisch eingeleitet, wenn der Zug eine Bremskurve oder Sollgeschwindigkeit überschreitet.\n• Regelt die Geschwindigkeit sanft durch kontrollierte Betriebsbremsung herunter, ohne sofort eine Voll- oder Schnellbremsung auszulösen.',
    reference: 'Ril 483 / TSI Zugsicherung'
  },
  {
    title: 'Definition: Notbremsung',
    content: 'Die Notbremsung:\n\n• Ist eine beabsichtigte Schnellbremsung, die bei einer akuten Gefahrensituation (z.B. Personen im Gleis, Hindernis, Entgleisung) eingeleitet wird.\n• Kann durch den Triebfahrzeugführer, Zugbegleiter oder durch Reisende (Notbremsgriff) ausgelöst werden.',
    reference: 'VDV-Schrift 757'
  },
  {
    title: 'Aufgaben der Eisenbahnbremsen',
    content: 'Die Bremsanlagen erfüllen im Bahnbetrieb folgende Grundaufgaben:\n\n1. Geschwindigkeitsregulierung (Anpassung an Fahrplan, Gefälle und Langsamfahrstellen)\n2. Sicheres Anhalten des Zuges an vorgesehenen Halteplätzen und vor Halt zeigenden Signalen\n3. Festhalten und Sichern von stehenden Fahrzeugen gegen unbeabsichtigtes Entlaufen / Wegrollen\n4. Stillstand bei Gefahrensituationen im kürzestmöglichen Bremsweg herbeiführen',
    reference: 'VDV-Schrift 757'
  },
  {
    title: 'Bremsungen, die der Triebfahrzeugführer tätigt',
    content: 'Vom Führerraum aus kann der Triebfahrzeugführer folgende Bremsungen aktiv einleiten:\n\n• Betriebsbremsung (stufenweise)\n• Vollbremsung\n• Schnellbremsung\n• Lokzusatzbremsung (direkte Bremse)\n• Dynamische Bremsung (E-Bremse / H-Bremse über Fahrschalter)',
    reference: 'VDV 757 / Ril 915'
  },
  {
    title: 'Bremsungen durch Zugbeeinflussungssysteme',
    content: 'Zugbeeinflussungs- und Zugsicherungsanlagen leiten selbsttätig ein:\n\n• Zwangsbremsung (PZB / LZB / ETCS bei Signalverfehlung oder Prüfzeitablauf)\n• Zwangsbetriebsbremsung (LZB / ETCS zur Geschwindigkeitsführung)',
    reference: 'Ril 483'
  },
  {
    title: 'Bremsung durch Fahrgäste',
    content: 'Fahrgäste können im Notfall eingreifen durch:\n\n• Betätigung der Notbremse (Notbremshebel / Fahrgast-Notbremseinrichtung im Reisezugwagen).\n• Bei modernen Reisezügen kann die Notbremsüberbrückung (NBÜ) aktiv werden, um den Zug z.B. aus einem Tunnel oder von einer Brücke herauszuführen.',
    reference: 'Ril 408 / Ril 915'
  },
  {
    title: 'Eigenschaften der Selbsttätigkeit von Druckluftbremsen',
    content: 'Gesetzliche Anforderung nach EBO § 35:\n\n• Züge mit einer Geschwindigkeit von mehr als 50 km/h müssen durchgehende, selbsttätige Bremsen besitzen.\n• „Selbsttätig“ bedeutet: Bei jeder unbeabsichtigten Unterbrechung oder Trennung der Hauptluftleitung (z.B. Zugtrennung, Schlauchabriss) tritt im gesamten Zugverband sofort die volle Bremswirkung selbsttätig ein.',
    reference: 'EBO § 35 / VDV-Schrift 757'
  },
  {
    title: 'Wirkungsweise und Bedingungen der Magnetschienenbremse (Mg)',
    content: 'Die Magnetschienenbremse:\n\n• Wirkt bei Schnell-, Not- und Zwangsbremsungen.\n• Voraussetzung: Geschwindigkeit V > 50 km/h (bei Unterschreitung schaltet sie meist unterhalb ca. 50 km/h ab, um Schienen und Weichen zu schonen).\n• Ein Elektromagnet wird bestromt und senkt sich pneumatisch auf den Schienenkopf ab; erzeugt reibungsabhängige Bremskraft unabhängig von Rad/Schiene-Haftung.',
    reference: 'VDV-Schrift 757 / Ril 915'
  },
  {
    title: 'Erkennungsmerkmale für Schnellbremsbeschleuniger',
    content: 'Schnellbremsbeschleuniger an Reisezugwagen:\n\n• Bremsanschrift: Bremsstellung „R“ mit zwei Werten angeschrieben (z.B. R 135 t / rot angeschrieben).\n• Das zusätzliche rote Bremsgewicht darf nur angerechnet werden, wenn der Schnellbremsbeschleuniger voll wirksam ist.',
    reference: 'VDV-Schrift 757'
  },
  {
    title: 'Bedeutung gängiger Bremsanschriften',
    content: 'Kürzel an Schienenfahrzeugen:\n\n• KB: Knorr-Bremse\n• GM: Gleitschutz mit Mikroprozessorsteuerung\n• C: Kompaktbremse / Scheibenbremse\n• E: Einlösige Bremse\n• M: Mehrlösige Bremse\n• R, P, G: Umstellbare Bremsstellungen',
    reference: 'VDV 757 / UIC 545'
  },
  {
    title: 'Definition: Anhalteweg',
    content: 'Der Anhalteweg ist der Gesamtweg, den ein Fahrzeug vom Moment des Erkennens einer Gefahr oder eines Signals bis zum vollständigen Stillstand zurücklegt.\n\nAnhalteweg = Reaktionsweg + Bremsweg.',
    reference: 'Ril 408 / VDV 757'
  },
  {
    title: 'Definition: Bremsweg',
    content: 'Der Bremsweg ist der Weg, den das Fahrzeug vom Betätigen des Führerbremsventils / der Bremseinrichtung bis zum vollständigen Stillstand zurücklegt.',
    reference: 'VDV-Schrift 757'
  },
  {
    title: 'Funktion und Stellungen des Luftabsperrhahns',
    content: 'Luftabsperrhähne an den Wagenstirnseiten:\n\n• Gewährleisten die durchgehende Verbindung der Bremsleitung im Zug.\n• Griffstellung waagerecht: Hahn GEÖFFNET (Durchgang frei).\n• Griffstellung senkrecht: Hahn GESCHLOSSEN.\n• Am Zugschluss muss der letzte Hahn geschlossen und der Kupplungskopf in der Leerkupplung eingehängt sein.',
    reference: 'VDV-Schrift 757'
  },
  {
    title: 'Funktion des Bremsabsperrhahns',
    content: 'Der Bremsabsperrhahn am Steuerventil:\n\n• Dient dem Ein- und Ausschalten der Druckluftbremse des einzelnen Fahrzeugs.\n• Bei Störung (z.B. feste Bremse, Leckage) wird der Hahn geschlossen (Schlaufengriff quer) und die Bremse am Lösezug vollständig entlüftet.',
    reference: 'VDV-Schrift 757'
  },
  {
    title: 'Aufgabe des Bremsgestängestellers',
    content: 'Der Bremsgestängesteller (mechanisches oder pneumatisches Bauteil):\n\n• Gleicht den natürlichen Verschleiß der Bremsklötze und Bremssohlen automatisch aus.\n• Hält das Klotzspiel (Lüftspiel) und den Kolbenhub des Bremszylinders konstant im zulässigen Toleranzbereich.',
    reference: 'VDV-Schrift 758 / VDV 757'
  },
  {
    title: 'Aufgabe der Bremszugstange',
    content: 'Die Bremszugstange:\n\n• Überträgt die mechanische Kraft vom Bremszylinderkolben über die Hebelübersetzung auf die Bremsklötze oder Bremsbacken.\n• Ist zentraler Bestandteil des Bremsgestänges.',
    reference: 'VDV 757 / VDV 758'
  },
  {
    title: 'Drücke im Bremssystem: HBL, HL und C-Druck',
    content: 'Die drei Hauptdruckwerte der Druckluftbremse:\n\n1. HBL-Druck: Hauptluftbehälterleitung mit 8,5 bis 10,0 bar (Speisedruck).\n2. HL-Druck: Hauptluftleitung mit konstant 5,0 bar im gelösten Regelzustand (Steuerdruck).\n3. C-Druck: Bremszylinderdruck; beträgt im gelösten Zustand 0 bar, bei Vollbremsung ca. 3,8 bar (je nach Bauart).',
    reference: 'VDV-Schrift 757'
  },
  {
    title: 'Eigenschaften der direkten Bremse (Zusatzbremse)',
    content: 'Die direkte Bremse (Lokzusatzbremse):\n\n• Ist weder durchgehend noch selbsttätig.\n• Wirkt ausschließlich auf die Achsen des Triebfahrzeugs.\n• Speist Druckluft aus dem Hauptluftbehälter direkt ohne Steuerventil in die Bremszylinder der Lok ein.',
    reference: 'VDV 757 / UIC 540'
  },
  {
    title: 'Ablauf beim Anlegen der direkten Bremse',
    content: 'Beim Betätigen des Zusatzbremsventils in Bremsstellung:\n\n• Druckluft strömt aus der Hauptluftbehälterleitung (HBL) über das Zusatzbremsventil direkt in die Bremszylinder des Triebfahrzeugs.\n• Die Bremswirkung setzt sofort und ohne Zeitverzögerung ein.',
    reference: 'VDV-Schrift 757'
  },
  {
    title: 'Ablauf beim Lösen der direkten Bremse',
    content: 'Beim Verlegen des Zusatzbremsventils in Lösestellung:\n\n• Die Bremszylinder des Triebfahrzeugs werden direkt ins Freie entlüftet.\n• Die Bremsbacken / Bremsklötze lösen sich unverzüglich von den Rädern.',
    reference: 'VDV-Schrift 757'
  },
  {
    title: 'Zulässige Situationen für die Zusatzbremse',
    content: 'Die direkte Bremse darf eingesetzt werden bei:\n\n• Rangierfahrten von Einzelfahrzeugen oder kleinen Rangierabteilungen.\n• Festhalten von Zügen im Stillstand oder in Steigungen/Gefällen.\n• Vermeidung von Auflaufstößen beim Kuppeln.',
    reference: 'VDV 757 / Ril 915'
  },
  {
    title: 'Unzulässige gleichzeitige Bedienung der Zusatzbremse',
    content: 'Die Zusatzbremse darf nicht gleichzeitig angewendet werden mit:\n\n• Der dynamischen Bremse (E-Bremse / H-Bremse), da sonst die Gefahr der Überbremsung und des Blockierens der Treibradsätze besteht.\n• Der selbsttätigen Druckluftbremse (sofern keine automatische Druckbegrenzung / Vorrangschaltung vorhanden ist).',
    reference: 'VDV 757'
  },
  {
    title: 'Stellungen des Führerbremsventils (Fbrv)',
    content: 'Die wesentlichen Raststellungen moderner Führerbremsventile:\n\n1. Füllstellung: Schnelles Füllen der HL mit hohem Luftstrom.\n2. Fahrtstellung: Hält die HL konstant auf 5,0 bar Regeldruck.\n3. Mittelstellung (Abschlussstellung): Sperrt die Nachspeisung; dient der Dichtheitsprüfung.\n4. Betriebsbremsstellung: Stufenweises Absenken des HL-Drucks (5,0 bis ca. 3,5 bar).\n5. Vollbremsstellung: Absenken auf 3,5 bar.\n6. Schnellbremsstellung: Vollständige Entleerung der HL auf 0 bar.',
    reference: 'VDV-Schrift 757 / UIC 540'
  },
  {
    title: 'Ablauf beim Anlegen der indirekten Bremse',
    content: 'Vorgang beim Anlegen:\n\n1. Das Führerbremsventil wird in eine Bremsstellung verlegt.\n2. Druckluft entweicht aus der Hauptluftleitung (HL) ins Freie (Druck sinkt unter 5,0 bar).\n3. Das Steuerventil an jedem Wagen spürt den Druckabfall und leitet Druckluft aus dem Vorratsluftbehälter (R-Behälter) in den Bremszylinder.\n4. Die Bremsklötze legen an den Rädern an.',
    reference: 'VDV-Schrift 757'
  },
  {
    title: 'Ablauf beim Lösen der indirekten Bremse',
    content: 'Vorgang beim Lösen:\n\n1. Das Führerbremsventil wird in Fahrtstellung verlegt.\n2. Die HL wird wieder auf den Regeldruck von 5,0 bar aufgefüllt.\n3. Das Steuerventil schaltet um, entlüftet den Bremszylinder ins Freie und füllt den Vorratsluftbehälter wieder auf.\n4. Die Rückholfedern drücken das Bremsgestänge in Lösestellung zurück.',
    reference: 'VDV-Schrift 757'
  },
  {
    title: 'Eigenschaften der einlösigen Druckluftbremse',
    content: 'Die einlösige Bremse:\n\n• Lässt sich stufenweise anlegen, aber NICHT stufenweise lösen!\n• Sobald der Druck in der HL leicht ansteigt, löst die Bremse vollständig aus (erschöpfliche Bremse).\n• Wiederholtes kurzes Bremsen und Lösen ohne vollständiges Nachfüllen führt zum Erschöpfen der Bremswirkung.',
    reference: 'VDV-Schrift 757 / UIC 540'
  },
  {
    title: 'Eigenschaften der mehrlösigen Druckluftbremse',
    content: 'Die moderne mehrlösige Bremse:\n\n• Lässt sich stufenweise anlegen UND stufenweise lösen.\n• Arbeitet nach dem 3-Druck-Prinzip (A-Kammer, HL-Druck, C-Druck).\n• Ist nahezu unerschöpflich, da der Referenzdruck in der Steuerkammer (A-Kammer) konstant gehalten wird.',
    reference: 'VDV-Schrift 757'
  },
  {
    title: 'Wirkungsweise des mehrlösigen Steuerventils',
    content: 'Kräftevergleich im mehrlösigen Steuerventil (3-Druck-Prinzip):\n\n• A-Kammer (konstant 5,0 bar Referenzdruck)\n• L-Kammer (Hauptluftleitungsdruck)\n• C-Kammer (Bremszylinderdruck)\nSinkt L unter A, öffnet das Ventil und füllt C proportional zur Druckdifferenz. Steigt L wieder an, wird C proportional wieder entlüftet.',
    reference: 'VDV 757 / UIC 540'
  },
  {
    title: 'Wirkungsweise des einlösigen Steuerventils',
    content: 'Im einlösigen Steuerventil (2-Druck-Prinzip):\n\n• Es erfolgt lediglich ein Kräftevergleich zwischen HL-Druck und Vorratsluftbehälterdruck.\n• Ein Druckanstieg in der HL bewegt den Steuerkolben sofort in die vollständige Lösestellung.',
    reference: 'VDV 757'
  },
  {
    title: 'Größte Wirkung von Radbremsen (Haftgrenze)',
    content: 'Die maximale Bremswirkung von Radbremsen wird erreicht:\n\n• Wenn die Räder gerade noch rollen (Mikroschlupf an der Kraftschlussgrenze zwischen Rad und Schiene).\n• Blockieren die Räder (Gleiten), sinkt der Reibwert drastisch (Gleitreibung < Haftreibung) und es entstehen schwere Flachstellen am Radreifen.',
    reference: 'VDV-Schrift 757'
  },
  {
    title: 'Grundsatz beim Verlassen des Triebfahrzeugs',
    content: 'Wird der Führerraum bzw. das Triebfahrzeug verlassen:\n\n1. Vollbremsung mit dem Führerbremsventil ausführen.\n2. Führerbremsventil absperren.\n3. Handbremse / Federspeicherbremse fest anlegen.\n4. Richtungswahlschalter in Nullstellung und verriegeln, Schlüssel abziehen.',
    reference: 'Ril 408 / VDV 757'
  },
  {
    title: 'Definition: Sicherheitsschleife',
    content: 'Die Sicherheitsschleife:\n\n• Ist eine elektrische, drahtgebundene oder elektronische Überwachungsschleife durch den gesamten Zugverband.\n• Wird sie unterbrochen (z.B. durch Nothalt, Zugtrennung oder Türöffnung während der Fahrt), wird automatisch eine Zwangsbremsung eingeleitet.',
    reference: 'Ril 492'
  },
  {
    title: 'Zusätzliche Bremsausrüstungen von Schienenfahrzeugen',
    content: 'Zu den zusätzlichen Bremseinrichtungen gehören:\n\n• Direkte Zusatzbremse (Lokbremse)\n• Dynamische Bremse (E-Bremse / H-Bremse)\n• Magnetschienenbremse (Mg-Bremse)\n• Wirbelstrombremse (WB)\n• Gleitschutzanlage\n• Notbremsüberbrückung (NBÜ)',
    reference: 'VDV 757 / Ril 915'
  },
  {
    title: 'Verhalten bei Ausfall des Drucklufterzeugers (Kompressor)',
    content: 'Fällt der Luftpresser auf der Fahrt aus:\n\n• Die Weiterfahrt darf nur bis zum nächsten geeigneten Bahnhof erfolgen.\n• Spätestens wenn der Druck in der Hauptluftbehälterleitung (HBL) unter 6,0 bar absinkt (bzw. Mindestbetriebsdruck der HL gefährdet ist), muss der Zug sofort angehalten werden.',
    reference: 'VDV 757 / Ril 915'
  },
  {
    title: 'Voraussetzungen zur Anrechnung der dynamischen Bremse',
    content: 'Die dynamische Bremse des Triebfahrzeugs darf im Bremszettel angerechnet werden, wenn:\n\n• Der Zug aus mindestens einem Tfz und 4 Wagen besteht.\n• Alle Fahrzeuge durchgehend an die Hauptluftleitung gekuppelt sind.\n• Die dynamische Bremse uneingeschränkt funktionsfähig ist.',
    reference: 'Ril 915.0102 / VDV 757'
  },
  {
    title: 'Funktionsweise der Federspeicherbremse',
    content: 'Die Federspeicherbremse:\n\n• Bremszustand: Starke mechanische Schraubenfedern drücken die Bremsklötze fest an das Rad (Bremse ist federbelastet fest).\n• Lösezustand: Durch Beaufschlagen des Federspeicherzylinders mit Druckluft (mind. 5,0 bar) wird die Feder zusammengedrückt und die Bremse gelöst.',
    reference: 'VDV-Schrift 757'
  },
  {
    title: 'Bremstechnisch abgestellter Zustand eines Zuges',
    content: 'Ein Zug gilt als bremstechnisch abgestellt, wenn:\n\n• Das Führerbremsventil abgesperrt ist.\n• Das Triebfahrzeug vom Wagenzug abgekuppelt wurde oder die Stromversorgung/Kompressoren abgestellt sind.\n• Die vorgeschriebenen Handbremsen / Feststellbremsen fest angelegt sind.',
    reference: 'VDV-Schrift 757 / Ril 408'
  },
  {
    title: 'Funktion des Angleichers (Niederdrucküberlader)',
    content: 'Der Angleicher am Führerbremsventil:\n\n• Erhöht den Regeldruck der Hauptluftleitung vorübergehend leicht auf ca. 5,3 bis 5,5 bar.\n• Baut diesen Überdruck extrem langsam und unmerklich ab (unterhalb der Ansprechschwelle der Steuerventile), um Überladungen der Bremsen zu beseitigen, ohne dass die Bremsen anlegen.',
    reference: 'VDV-Schrift 757'
  },
  {
    title: 'Längenabzüge beim Bremsgewicht in Bremsstellung R/P',
    content: 'Bei langen Zügen in Bremsstellung P/R gelten folgende Längenabzüge vom Gesamtbremsgewicht:\n\n• Bis 500 m Zuglänge: Keine Abzüge\n• Über 500 m bis 600 m: 5 % Abzug\n• Über 600 m bis 700 m: 10 % Abzug\n• Über 700 m: 25 % Abzug (oder Umstellung auf Bremsstellung G)',
    reference: 'Ril 915.0102 / VDV 757'
  },
  {
    title: 'Zuggewicht und Bremsstellungswahl bei Güterzügen',
    content: 'Regelungen nach Zuggesamtgewicht:\n\n• Bis 800 t: Alle Fahrzeuge in Bremsstellung P zulässig.\n• 801 bis 1.200 t: Arbeitende Triebfahrzeuge in Bremsstellung G, Wagen in P.\n• Über 1.200 t: Besondere Bremsvorschriften nach Bremszettel.',
    reference: 'Ril 915 / VDV 757'
  },
  {
    title: 'Verhalten bei Zügen zwischen 1.600 t und 5.000 t Gesamtgewicht',
    content: 'Bei schweren Güterzügen (1.600 t bis 5.000 t):\n\n• Der gesamte Zugverband muss grundsätzlich in Bremsstellung G gefahren werden.\n• Es ist ein Fahrplan für Bremsstellung G anzufordern, um unzulässige Längszerrungen und Zugtrennungen zu verhindern.',
    reference: 'Ril 915.0102 / VDV 757'
  },
  {
    title: 'Verhalten, wenn Bremsstellung R/P laut Fahrplan nicht möglich ist',
    content: 'Kann die im Fahrplan vorgeschriebene Bremsstellung R oder P an einem Fahrzeug nicht eingestellt werden:\n\n• Bremsstellung R darf nicht verwendet werden.\n• Die Bremse muss ggf. ausgeschaltet und bezettelt werden, und die Mindestbremshundertstel (Mbrh) müssen neu berechnet werden.',
    reference: 'VDV-Schrift 757'
  },
  {
    title: 'Längenabzüge in Bremsstellung G',
    content: 'Abzüge in Bremsstellung G bei Güterzügen:\n\n• Bis 700 m Zuglänge: Keine Abzüge.\n• Über 700 m bis 815 m: 5 % Abzug vom Bremsgewicht; Bremsstellung R darf keinesfalls eingestellt werden.',
    reference: 'Ril 915.0102 / VDV 757'
  },
  {
    title: 'Bremsstellungsvorschriften bei Reisezügen (R/P)',
    content: 'Für Reisezüge gilt grundsätzlich:\n\n• Bremsstellung G darf grundsätzlich nicht eingestellt werden.\n• Alle Reisezugwagen müssen in Bremsstellung R oder P eingestellt sein.',
    reference: 'VDV-Schrift 757'
  },
  {
    title: 'Reisezüge in Bremsstellung R/P mit mehr als 80 Achsen',
    content: 'Führt ein Reisezugverband mehr als 80 Achsen:\n\n• Das an der Zugspitze arbeitende Triebfahrzeug muss in Bremsstellung G eingestellt werden, um das Anlegeverhalten der Bremse zu dämpfen und Stoßkräfte zu reduzieren.',
    reference: 'Ril 915.0102 / VDV 757'
  },
  {
    title: 'Defekt an der Luftfederung eines Reisezugwagens',
    content: 'Fällt die Luftfederung an einem Reisezugwagen aus:\n\n• Vom Bremsgewicht des betroffenen Wagens müssen pauschal 25 Tonnen abgezogen werden.\n• Die vorhandenen Bremshundertstel müssen unverzüglich neu berechnet werden.',
    reference: 'Ril 915 / VDV 757'
  },
  {
    title: 'Fehlende Bremshundertstel am Anfangsbahnhof',
    content: 'Werden die erforderlichen Mindestbremshundertstel (Mbrh) am Anfangsbahnhof nicht erreicht:\n\n• Der Zug darf die Fahrt nicht antreten!\n• Es ist zu prüfen, für welche Fahrplangeschwindigkeit die vorhandenen Bremshundertstel ausreichen; ggf. muss ein neuer Fahrplan / Fahrplananordnung eingeholt werden.',
    reference: 'Ril 408 / VDV 757'
  },
  {
    title: 'Fehlende Bremshundertstel auf freier Strecke',
    content: 'Fallen Bremsen während der Fahrt aus und werden die Mbrh unterschritten:\n\n• Unverzüglich der Betriebszentrale / dem Fahrdienstleiter melden.\n• Die Betriebszentrale erteilt Weisung zur Weiterfahrt mit reduzierter Geschwindigkeit nach Bremstafel.',
    reference: 'Ril 408.0611 / VDV 757'
  },
  {
    title: 'Fahrzeuge ohne wirkende Bremse am Zugschluss',
    content: 'Darf ein Fahrzeug ohne wirkende Bremse als letztes Fahrzeug im Zug laufen?\n\n• Grundsätzlich muss das letzte Fahrzeug eine wirksame Bremse haben.\n• Ausnahme: Wenn das Fahrzeug wegen eines Mangels oder bauartbedingt keine wirksame Bremse haben kann, darf es am Zugschluss befördert werden, sofern das vorletzte Fahrzeug eine voll wirksame Druckluftbremse besitzt (VDV 757).',
    reference: 'VDV-Schrift 757, Abschnitt 4'
  },
  {
    title: 'Unregelmäßigkeiten an Bremseinrichtungen während der Fahrt',
    content: 'Zu den betrieblichen Bremsunregelmäßigkeiten zählen:\n\n• Ungenügende oder ausbleibende Bremswirkung\n• Druckluftbremse setzt selbsttätig an (ungewollter Druckabfall)\n• Kompressorausfall oder Leckagen in HL/HBL\n• Feste oder rauchende Bremsen im Zugverband',
    reference: 'VDV-Schrift 757 / Ril 915'
  },
  {
    title: 'Maßnahmen bei ungenügender Bremswirkung',
    content: 'Stellt der Triebfahrzeugführer ungenügende Bremswirkung fest:\n\n1. Sofort Schnellbremsung ausführen.\n2. Notbremsung / Zusatzbremsen und dynamische Bremsen hinzuschalten.\n3. Notsignal Zp 5 („Mehrmals drei kurze Töne nacheinander“) abgeben, um Zugbegleiter zur Notbremsung aufzufordern.\n4. Sanden zur Kraftschlusserhöhung.',
    reference: 'Ril 408.0611 / VDV 757'
  },
  {
    title: 'Verhalten bei Ausfall der Sandstreueinrichtung',
    content: 'Ist die Sandstreueinrichtung am führenden Tfz gestört:\n\n• Bei Signalstellung „Halt erwarten“ oder vor Langsamfahrstellen muss der Bremsvorgang besonders frühzeitig eingeleitet werden.\n• Die Höchstgeschwindigkeit ist bei ungünstigen Schienenverhältnissen um 10 km/h zu reduzieren.',
    reference: 'Ril 915.0102 / VDV 757'
  },
  {
    title: 'Druckluftbremse an der Zugspitze nicht bedienbar',
    content: 'Kann die Druckluftbremse vom führenden Fahrzeug aus nicht bedient werden:\n\n• Läuft an der Zugspitze ein zweites arbeitendes Triebfahrzeug mit besetztem Führerraum, muss die Bremse von diesem bedient werden.\n• Die Verständigung erfolgt über Sprechfunk oder akustische Signale.',
    reference: 'Ril 408 / VDV 757'
  },
  {
    title: 'Hauptluftleitung (HL) unterbrochen',
    content: 'Wird die Hauptluftleitung unterwegs unterbrochen:\n\n• Der Zug darf nur bis zum nächsten Bahnhof weiterfahren.\n• Höchstgeschwindigkeit maximal 20 km/h.\n• Das EIU teilt die maßgebenden Bremshundertstel mit.',
    reference: 'Ril 408 / VDV 757'
  },
  {
    title: 'Vorgehen bei einer festen / ungelösten Bremse',
    content: 'Stellt das Personal eine feste Bremse fest:\n\n1. Der Tf versucht zunächst, die Bremse durch kurzes Angleichen (Überladen) zu lösen.\n2. Löst die Bremse nicht: Zug anhalten, Bremsabsperrhahn des betroffenen Wagens schließen und Lösezug ziehen, bis Bremszylinder vollständig entlüftet ist.\n3. Lauffläche auf Flachstellen untersuchen und Muster K bezetteln.',
    reference: 'VDV-Schrift 757 / VDV 758'
  },
  {
    title: 'Verhalten bei starkem Frost',
    content: 'Vor Beginn der Fahrt bei Frost:\n\n• Vor Abfahrt ist eine Schnellbremsung durchzuführen, um eventuell vereiste Gestängeteile und Bremssohlen zu lösen.\n• Entwässerung der Luftbehälter und Abscheider kontrollieren.',
    reference: 'VDV 757 / Ril 915'
  },
  {
    title: 'Verhalten bei Flugschnee',
    content: 'Bei starkem Schneefall oder Flugschnee:\n\n• Alle 20 Minuten sollte eine kurze Druckabsenkung in der HL um ca. 0,5 bar für 10 Sekunden vorgenommen werden (Trockenbremsung), um Bremsklötze und Scheiben schneefrei und betriebsbereit zu halten.',
    reference: 'VDV-Schrift 757'
  },
  {
    title: 'Bremsenverhalten vor Rangierfahrten',
    content: 'Vor Beginn einer Rangierfahrt:\n\n• Alle Bremsen müssen gelöst sein; überladene Bremsen sind von Hand durch Ziehen des Lösezugs zu lösen.\n• Festlegemittel (Hemmschuhe, Radvorleger) sind vollständig zu entfernen.',
    reference: 'VDV 757 / Ril 408'
  },
  {
    title: 'Geschwindigkeitsreduzierung bei vermindertem Reibwert',
    content: 'Bei nassen Schienen, Laubfall oder Vereisung:\n\n• Die zulässige Höchstgeschwindigkeit nach Fahrplan ist um 10 km/h zu vermindern.\n• Vor Signalen mit Signalbegriff „Halt erwarten“ darf im Bremswegabstand mit maximal 60 km/h gefahren werden.',
    reference: 'Ril 915.0102 / VDV 757'
  },
  {
    title: 'Einlösige Bremse im mehrlösigen Zugverband',
    content: 'Befindet sich eine einlösige Bremse im Zugverband:\n\n• Bei der Bremsprobe müssen neben der einlösigen Bremse auch zwingend der Wagen davor und der Wagen danach auf ordnungsgemäßes Lösen kontrolliert werden.',
    reference: 'VDV-Schrift 757, Abschnitt 4'
  },
  {
    title: 'Bedienung von Lastwechseln (Leer / Beladen / S-Wechsel)',
    content: 'Vorschriften für manuelle Lastwechsel an Güterwagen:\n\n• Der Lastwechselhebel darf nur im vollständig GELÖSTEN Zustand der Bremse umgestellt werden!\n• Erreicht das Gesamtgewicht des Wagens das angeschriebene Umstellgewicht, ist auf „Beladen“ umzustellen.',
    reference: 'VDV-Schrift 757 / VDV 758'
  },
  {
    title: 'Ausfall der dynamischen Bremse während der Fahrt',
    content: 'Fällt die dynamische Bremse (E-Bremse) aus:\n\n• Bei signalgeführten Zügen: Die Geschwindigkeit ist um 10 km/h gegenüber der zulässigen Höchstgeschwindigkeit zu reduzieren, bis die Bremsverhältnisse angepasst sind.',
    reference: 'Ril 915 / VDV 757'
  },
  {
    title: 'Vorgehen beim Ausschalten einer gestörten Wagenbremse',
    content: 'Reihenfolge beim Ausschalten:\n\n1. Bremsabsperrhahn am Steuerventil schließen (Schlaufengriff quer).\n2. Lösezug ziehen, bis Vorratsluftbehälter und Steuerkammern vollständig entleert sind.\n3. Mechanischen Lösezustand prüfen (Klotzspiel vorhanden, Schauzeichen grün).\n4. Wagen beidseitig mit Muster K bezetteln.',
    reference: 'VDV-Schrift 757 / VDV 758'
  },
  {
    title: 'Aufgaben des bedienenden Bremsprobenberechtigten',
    content: 'Der bedienende Bremsprobenberechtigte:\n\n• Bedient das Führerbremsventil des Triebfahrzeugs oder das Fernsteuerbediengerät bzw. die ortsfeste Prüfanlage.\n• Führt die Druckabsenkungen und Angleichvorgänge nach Weisung des Prüfenden aus.',
    reference: 'VDV-Schrift 757, Abschnitt 3'
  },
  {
    title: 'Aufgaben des prüfenden Bremsprobenberechtigten',
    content: 'Der prüfende Bremsprobenberechtigte:\n\n• Untersucht die Bremseinrichtungen am Wagenzug (Anlege- und Lösezustand, Bremszylinderkolbenhub, Bremsklotzanlage).\n• Erteilt die Aufträge („Bremse anlegen“, „Bremse lösen“, „Bremse in Ordnung“).',
    reference: 'VDV-Schrift 757, Abschnitt 3'
  },
  {
    title: 'Voraussetzungen für die Allein-Bremsprobe',
    content: 'Eine Bremsprobe darf von einer Person allein durchgeführt werden, wenn:\n\n• Die Neigung des Gleises nicht mehr als 2,5 ‰ beträgt.\n• Ein ortsfestes oder mobiles Prüfgerät / Funkfernsteuerung verwendet wird oder der Zug gegen Wegrollen gesichert ist.',
    reference: 'VDV-Schrift 757, Abschnitt 3.4'
  },
  {
    title: 'Zweck der vollen Bremsprobe',
    content: 'Die volle Bremsprobe dient der Feststellung des ordnungsgemäßen Zustands und der einwandfreien Funktion der Druckluftbremsen ALLER Fahrzeuge im gesamten Zugverband vor der Abfahrt.',
    reference: 'VDV-Schrift 757, Abschnitt 4.1'
  },
  {
    title: 'Zweck der vereinfachten Bremsprobe',
    content: 'Die vereinfachte Bremsprobe dient der Feststellung der Durchgängigkeit der Steuer- und Bremsleitung (HL) bis zum letzten Fahrzeug sowie der Wirksamkeit der Bremsen an den vorgeschriebenen Prüfstellen.',
    reference: 'VDV-Schrift 757, Abschnitt 4.3'
  },
  {
    title: 'Zweck der Führerraumbremsprobe',
    content: 'Die Führerraumbremsprobe dient der Feststellung, dass das Führerbremsventil im führenden Fahrzeug ordnungsgemäß arbeitet und die Hauptluftleitung absperr- und steuerbar ist.',
    reference: 'VDV-Schrift 757, Abschnitt 4.4'
  },
  {
    title: 'Fälligkeiten der vollen Bremsprobe',
    content: 'Eine volle Bremsprobe ist fällig:\n\n1. Am neu gebildeten Zug (frühestens 24 Stunden vor der Abfahrt).\n2. Wenn ein Zug länger als 24 Stunden abgestellt war.\n3. Bei Unregelmäßigkeiten an den Bremsanlagen, wenn der Zustand der Bremsen unklar ist.',
    reference: 'VDV-Schrift 757, Abschnitt 4.1'
  },
  {
    title: 'Fälligkeiten der vereinfachten Bremsprobe',
    content: 'Eine vereinfachte Bremsprobe ist fällig:\n\n1. Wenn die volle Bremsprobe nicht mit dem während der Fahrt führenden Triebfahrzeug ausgeführt wurde.\n2. Wenn der Zugverband getrennt oder Teile beigestellt/abgesetzt wurden.\n3. Wenn ein Zug bis zu 24 Stunden unverändert abgestellt war.',
    reference: 'VDV-Schrift 757, Abschnitt 4.3'
  },
  {
    title: 'Fälligkeiten der Führerraumbremsprobe',
    content: 'Eine Führerraumbremsprobe ist fällig:\n\n1. Nach jedem Führerraum- oder Führerbremsventilwechsel.\n2. Wenn das Führerbremsventil für die Fahrt abgesperrt wurde (bis zu 1 Stunde).\n3. Nach Abkuppeln eines führenden Tfz bei Mehrfachtraktion.',
    reference: 'VDV-Schrift 757, Abschnitt 4.4'
  },
  {
    title: 'Prüfpunkte beim Zustandsgang',
    content: 'Beim separaten Zustandsgang vor der Bremsprobe wird kontrolliert:\n\n• Alle Kupplungen ordnungsgemäß verbunden und festgedreht.\n• Alle Luftschläuche gekuppelt und Luftabsperrhähne zwischen den Fahrzeugen geöffnet.\n• Keine mechanischen Beschädigungen am Bremsgestänge.\n• Hand- und Feststellbremsen vollständig gelöst.',
    reference: 'VDV-Schrift 757, Abschnitt 4.1'
  },
  {
    title: 'Voraussetzungen für die volle Bremsprobe MIT Zustandsgang',
    content: 'Ein separater Zustandsgang ist erforderlich:\n\n• Wenn die Voraussetzungen für eine Bremsprobe ohne separaten Zustandsgang (3G-Regel) nicht erfüllt sind.\n• Bei neu zusammengestellten Zügen ohne vorherige technische Untersuchung.',
    reference: 'VDV-Schrift 757'
  },
  {
    title: 'Ablauf der vollen Bremsprobe mit Zustandsgang',
    content: 'Die Schritte der vollen Bremsprobe mit Zustandsgang:\n\n1. Zustandsgang entlang des Zuges (Kupplungen, Schläuche, Hähne prüfen).\n2. Bremse auf 5,0 bar auffüllen und Dichtheit prüfen.\n3. Auftrag „Bremse anlegen“ (Zp 6) -> Anlegegang entlang aller Fahrzeuge.\n4. Auftrag „Bremse lösen“ (Zp 7) -> Lösegang entlang aller Fahrzeuge.\n5. Meldung „Bremse in Ordnung“ (Zp 8).',
    reference: 'VDV-Schrift 757, Abschnitt 4.1'
  },
  {
    title: 'Unregelmäßigkeiten bei der Bremsprobe mit Zustandsgang',
    content: 'Wird bei der Bremsprobe eine Unregelmäßigkeit festgestellt:\n\n• Die Ursache muss behoben werden.\n• Nach Behebung müssen das Anlegen und Lösen an allen betroffenen Fahrzeugen erneut überprüft werden.',
    reference: 'VDV-Schrift 757'
  },
  {
    title: 'Voraussetzungen für den Verzicht auf den Zustandsgang (3G-Regel)',
    content: 'Auf einen separaten Zustandsgang darf verzichtet werden, wenn die 3G-Regel erfüllt ist:\n\n1. Gekuppelt: Alle Fahrzeuge ordnungsgemäß mechanisch gekuppelt.\n2. Geschlaucht: Alle Luftleitungen verbunden und Zwischenhähne geöffnet.\n3. Gefüllt: Hauptluftleitung durchgehend auf 5,0 bar gefüllt.',
    reference: 'VDV-Schrift 757, Abschnitt 4.1'
  },
  {
    title: 'Ablauf der vollen Bremsprobe OHNE separaten Zustandsgang',
    content: 'Ablauf nach 3G-Regel:\n\n1. Lösezustand nach dem Füllen an einer Bremse hinter der letzten Kuppelstelle feststellen.\n2. Dichtheitsprüfung durchführen.\n3. Bremse anlegen -> Anlegegang an allen Fahrzeugen.\n4. Bremse lösen -> Lösegang an allen Fahrzeugen.\n5. Bremse in Ordnung melden.',
    reference: 'VDV-Schrift 757, Abschnitt 4.1'
  },
  {
    title: 'Abbruchkriterien bei der Bremsprobe ohne Zustandsgang',
    content: 'Die Bremsprobe ohne Zustandsgang muss abgebrochen und mit separatem Zustandsgang wiederholt werden, wenn:\n\n• Ein Luftabsperrhahn geschlossen war.\n• Ein Lösezug von Hand gezogen werden musste.\n• Eine Bremse nicht ordnungsgemäß gelöst war.',
    reference: 'VDV-Schrift 757'
  },
  {
    title: 'Vereinfachte Bremsprobe vor der Zugfahrt',
    content: 'Ablauf vor Zugfahrt:\n\n1. Bremse auf 5,0 bar füllen und kurz mit dem Angleicher lösen.\n2. Lösezustand am letzten Fahrzeug feststellen.\n3. Bremse anlegen -> Anlegen am letzten Fahrzeug prüfen.\n4. Bremse lösen -> Lösen am letzten Fahrzeug prüfen.\n5. Bremse in Ordnung melden.',
    reference: 'VDV-Schrift 757, Abschnitt 4.3'
  },
  {
    title: 'Vereinfachte Bremsprobe mit vorgeprüften Wagengruppen',
    content: 'Werden vorgeprüfte Wagengruppen beigestellt:\n\n• Bremse füllen und mit Angleicher angleichen.\n• Dichtheitsprüfung durchführen.\n• Anlegen und Lösen am ersten und letzten Fahrzeug der beigestellten Gruppe prüfen.',
    reference: 'VDV-Schrift 757, Abschnitt 4.3'
  },
  {
    title: 'Voraussetzungen: Vereinfachte Bremsprobe hinter der Trennstelle',
    content: 'Gilt bei vorübergehendem Abkuppeln des Tfz:\n\n• Dasselbe Triebfahrzeug wird wieder angekuppelt.\n• Die Unterbrechung zwischen Ankunft und Wiederankuppeln betrug nicht mehr als 1 Stunde.',
    reference: 'VDV-Schrift 757, Abschnitt 4.3'
  },
  {
    title: 'Ablauf der vereinfachten Bremsprobe hinter der Kuppelstelle',
    content: 'Ablauf:\n\n1. Hauptluftleitung füllen.\n2. Bremse anlegen -> Bremszustand an einem Fahrzeug hinter der Trennstelle und am letzten Fahrzeug prüfen.\n3. Bremse lösen -> Lösezustand prüfen.\n4. Bremse in Ordnung melden.',
    reference: 'VDV-Schrift 757, Abschnitt 4.3'
  },
  {
    title: 'Vereinfachte Bremsprobe vor Rangierfahrten',
    content: 'Vor Rangierfahrten mit luftgebremsten Fahrzeugen:\n\n• Hauptluftleitung füllen.\n• Lösezustand nach dem Füllen an einem Fahrzeug hinter dem Tfz und am letzten luftgebremsten Fahrzeug feststellen.',
    reference: 'VDV-Schrift 757, Abschnitt 4.5'
  },
  {
    title: 'Ablauf der Führerraumbremsprobe',
    content: 'Ablauf im Detail:\n\n1. Im verlassenen Führerraum Vollbremsung ausführen und Führerbremsventil absperren.\n2. Im neuen Führerraum Führerbremsventil aufschließen und Bremse lösen (HL füllt sich auf 5,0 bar).\n3. Bremse um 0,5 bar absenken (Bremse muss anlegen).\n4. Wieder in Fahrtstellung verlegen und HL angleichen.',
    reference: 'VDV-Schrift 757, Abschnitt 4.4'
  },
  {
    title: 'Grenzwerte der Dichtheitsprüfung (Dichteprüfung)',
    content: 'Zulässiger Druckabfall bei abgesperrter HL in 1 Minute:\n\n• Reisezüge: Maximal 0,3 bar pro Minute.\n• Güterzüge: Maximal 0,5 bar pro Minute.\nBei Überschreitung der Werte ist die Undichtigkeit vor Abfahrt zu beseitigen.',
    reference: 'VDV-Schrift 757, Abschnitt 4.1'
  },
  {
    title: 'Füllzustandskontrolle der Hauptluftleitung',
    content: 'Ablauf der Füllzustandskontrolle:\n\n• Die Hauptluftleitung wird vollständig auf 5,0 bar gefüllt.\n• Das Führerbremsventil wird in Mittelstellung verlegt; der HL-Druck darf nicht absinken (Beweis für vollen Füllzustand im Zugverband).',
    reference: 'VDV-Schrift 757'
  },
  {
    title: 'Nachspeisekontrolle am Führerbremsventil',
    content: 'Zweck der Nachspeisekontrolle:\n\n• Feststellen, ob ein weiteres, unbemerkt aktives Führerbremsventil im Zugverband vorhanden ist.\n• Nach Druckabsenkung darf der Druck in der HL nicht wieder selbsttätig ansteigen.',
    reference: 'VDV-Schrift 757'
  },
  {
    title: 'Bedeutung und Funktion der Sägelinie',
    content: 'Die Sägelinie im Gleisplan:\n\n• Dient der Kennzeichnung von Gleisabschnitten mit Gefälle.\n• Schreibt vor, wie viele Handbremsen bzw. Radvorleger/Hemmschuhe zur Sicherung abgestellter Fahrzeuge gegen Entlaufen anzubringen sind.',
    reference: 'Ril 408.0551 / VDV 757'
  },
  {
    title: 'Gesetzliche Definition der Selbsttätigkeit von Bremsen',
    content: 'Nach den anerkannten Regeln der Technik:\n\n• Eine Druckluftbremse gilt als selbsttätig, wenn bei jeder unbeabsichtigten Trennung der Hauptluftleitung oder bei starkem Druckverlust sofort die Bremswirkung im gesamten Zugverband eintritt.',
    reference: 'EBO § 35'
  },
  {
    title: 'Fahrzeuge, die die Wirksamkeit der Zugbremse beeinträchtigen',
    content: 'Als bremsbeeinträchtigende Fahrzeuge im Zugverband gelten:\n\n• Fahrzeuge ohne wirksame Druckluftbremse (Leitungswagen).\n• Wagen ohne Schnellbremsbeschleuniger in schnellfahrenden Zügen.\n• Fahrzeuge mit einlösigen Bremsen im mehrlösigen Zugverband.',
    reference: 'VDV-Schrift 757'
  },
  {
    title: 'Prüfung der Hauptluftleitung auf freien Durchgang',
    content: 'Ablauf:\n\n• Führerbremsventil in Fahrtstellung verlegen, HL auf 5,0 bar auffüllen.\n• Am Zugschluss Luftabsperrhahn kurz kräftig öffnen; ein starker Luftstrom muss austreten und das Führerbremsventil muss deutlich hörbar nachspeisen.',
    reference: 'VDV-Schrift 757'
  },
  {
    title: 'Verständigungsarten bei der Bremsprobe',
    content: 'Die Signale zwischen Bedienendem und Prüfendem:\n\n1. Optisch: Signal Zp 6 (Arme heben), Signal Zp 7 (Arme senken), Signal Zp 8 (Arm senkrecht).\n2. Akustisch: Zp 6 (–), Zp 7 (– –), Zp 8 (– – ·).\n3. Mündlich / Fernmündlich: Über Sprechfunk (GSM-R) mit eindeutigen Wortlauten.',
    reference: 'Ril 301 / VDV 757'
  },
  {
    title: 'Sicherheitsregeln für Luftabsperrhähne',
    content: 'Für Luftabsperrhähne gilt:\n\n• Waagerecht = Geöffnet, Senkrecht = Geschlossen.\n• Beim Trennen der Kupplungsschläuche müssen IMMER zuerst beide Absperrhähne geschlossen werden, bevor die Kupplungsköpfe entkuppelt werden (Schlaggefahr durch Druckluft!).',
    reference: 'DGUV Vorschrift 73 / VDV 757'
  },
  {
    title: 'Sicherheitsregeln für Bremsabsperrhähne',
    content: 'Für Bremsabsperrhähne gilt:\n\n• Dürfen nur bedient werden, um gestörte oder schadhafte Bremsen an einzelnen Fahrzeugen abzuschalten.\n• Nach dem Absperren muss die Bremse zwingend durch Ziehen des Lösezugs drucklos gemacht und der Lösezustand kontrolliert werden.',
    reference: 'VDV-Schrift 757'
  }
];

async function run() {
  console.log(`Processing ${cardData.length} cards for #Bremsprobe...`);
  
  const results = cardData.map((item, idx) => {
    const cardId = 'f_bp_' + String(idx + 1).padStart(3, '0');
    return {
      id: cardId,
      category: 'Bremsprobe',
      title: item.title,
      content: item.content,
      reference: item.reference,
      isVerified: true
    };
  });

  fs.writeFileSync('src/database/bremsprobe_cards.json', JSON.stringify(results, null, 2));
  console.log('Saved src/database/bremsprobe_cards.json with', results.length, 'cards');

  // 1. Upload to Supabase in batches of 15
  console.log('Uploading cards to Supabase...');
  for (let b = 0; b < results.length; b += 15) {
    const batch = results.slice(b, b + 15).map(c => ({
      id: c.id,
      category: c.category,
      title: c.title,
      content: c.content,
      reference: c.reference,
      image_url: null,
      is_verified: true
    }));
    
    await new Promise((resolve) => {
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
            console.log(`Supabase batch ${Math.floor(b / 15) + 1} (${batch.length} cards) uploaded successfully`);
            resolve();
          } else {
            console.error(`Supabase batch error ${res.statusCode}:`, resp);
            resolve();
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
  if (fs.existsSync(ALL_FLASHCARDS_PATH)) {
    const all = JSON.parse(fs.readFileSync(ALL_FLASHCARDS_PATH, 'utf8'));
    const idMap = new Map();
    all.forEach(c => idMap.set(c.id, c));
    results.forEach(c => {
      idMap.set(c.id, {
        id: c.id,
        category: c.category,
        title: c.title,
        content: c.content,
        reference: c.reference,
        image_url: null,
        created_at: new Date().toISOString(),
        is_verified: true
      });
    });
    const merged = Array.from(idMap.values());
    fs.writeFileSync(ALL_FLASHCARDS_PATH, JSON.stringify(merged, null, 2));
    console.log('all_flashcards.json updated, total cards:', merged.length);
  }

  console.log('Done!');
}

run();
