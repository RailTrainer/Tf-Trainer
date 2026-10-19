const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ahmcoyfmdrgpmclaxgfj.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_cENpbfjZbysfKIjFKxTFWg_YziNteq1';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// All updated options mapped by ID:
const UPDATED_QUESTIONS = {
  "q6": {
    "options": [
      "Durch eine stetige Rauchentwicklung am Radsatzlagergehäuse",
      "Durch ein rhythmisches, geschwindigkeitsabhängiges Klopfen oder Schlagen während der Fahrt",
      "Durch Bauteilschäden wie eine gelockerte Abhebesicherung oder gebrochene Bremsfangschlingen infolge der Stoßbelastung",
      "Durch ein kontinuierliches Zischen an den Luftabsperrhähnen der Hauptluftleitung"
    ],
    "explanation": "Eine Flachstelle entsteht durch das Blockieren der Radsätze beim Bremsen (z. B. durch falsch eingestellte Lastwechsel, ungünstige Reibwertverhältnisse oder eine feste Handbremse). Im Fahrbetrieb führt sie zu einem charakteristischen rhythmischen Klopfen, das Schienen und Fahrzeuge schädigen kann und Stoßbelastungen auf Bauteile wie Abhebesicherungen ausübt."
  },
  "q_wmq_006_nncu5c": {
    "options": [
      "Der Wagen darf ohne Einschränkungen oder Auflagen weiterhin für Neubeladungen im Regelverkehr disponiert werden.",
      "Der Wagen darf nach der Entladung nicht erneut beladen werden, ist beidseitig mit dem Schadwagenzettel Muster K zu bezetteln und der Instandhaltung zuzuführen.",
      "Die Revisionsfrist verlängert sich durch formlose Sichtprüfung des Wagenprüfers automatisch um weitere sechs Monate.",
      "Es genügt, das abgelaufene Revisionsdatum im Anschriftenfeld mit Kreide unleserlich zu machen."
    ],
    "explanation": "Läuft die Revisionsfrist eines Güterwagens in unter 15 Tagen ab, ist der Wagen beidseitig mit einem Zettel „Muster K“ zu kennzeichnen. Nach erfolgter Entladung darf der Wagen keinesfalls wiederbeladen werden, sondern muss zur Revision/Instandhaltung zugeführt werden.\n\nBei Revisionsablauf kleiner als 6 Monate darf die Lauffähigkeitsbescheinigung auch durch einen Wagenprüfer der Stufe 3 erteilt werden.\n\nReferenz: VDV-Schrift 758, Fristen & Bremsverzettelung / AVV Anlage 9"
  },
  "q_docx_13": {
    "options": [
      "Ausschließlich darauf, dass Ladeeinheiten des KV das vorgegebene Streckenprofil einhalten, während sonstige Wagen unberücksichtigt bleiben.",
      "Nur auf das Schließen und Verriegeln von beweglichen Wagenbauteilen wie Schiebewänden und Türen.",
      "Lediglich darauf, dass ausnahmslos alle Druckluftbremsen eingeschaltet sind, unabhängig von Wagengewicht oder Schadenszustand.",
      "Dass der sichere Zustand für die anschließende Zugfahrt gewährleistet ist, die Ladung vorschriftsmäßig verladen wurde und die erforderlichen Begleitpapiere vorliegen.",
      "Dass ausschließlich Schäden aus vorangegangenen Rangierstößen erfasst werden, ohne Kontrolle der Ladungssicherung."
    ],
    "explanation": "Bei der Prüfung der Stufe 3 kontrollieren wir den sicheren Zustand der Güterwagen, Ladungen und Ladeeinheiten für die anschließende Zugfahrt (VDV-Schrift 758)."
  },
  "q_wmq_005_6lcciz": {
    "options": [
      "Ein Güterwagen, der nicht mehr verkehrstauglich ist, darf unter keinen Umständen mehr auf der Schiene befördert werden.",
      "Verkehrstauglich ist ein Wagen, wenn sein Zustand die bestimmungsgemäße und unbeschädigte Beförderung des jeweiligen Ladeguts zulässt.",
      "Betriebssicher ist ein Wagen, wenn sein technischer Gesamtzustand eine gefahrlose Beförderung im Eisenbahnbetrieb gewährleistet.",
      "Ein Wagen gilt als betriebssicher, wenn die vorgeschriebene Revisionsfrist bereits um mehr als sechs Monate überschritten ist."
    ],
    "explanation": "• Verkehrstauglichkeit: Der sichere Zustand des Fahrzeugs und der Ladeeinheit für den bestimmungsgemäßen Verwendungszweck (z.B. Wagenboden heile für Schüttguttransport).\n• Betriebssicherheit: Der Zustand von Wagen und deren Komponenten zur Gewährleistung eines sicheren Bahnbetriebs ohne abwendbare Gefährdung von Personen, Umwelt und Sachen.\n\nReferenz: VDV-Schrift 758, Schutzziele & Grundsätze"
  },
  "q_wmq_012_6smx4n": {
    "options": [
      "Ausschließlich aktive Luftfederbälge mit kontinuierlicher Niveauregelung wie im Hochgeschwindigkeitsverkehr.",
      "Reine hydraulische Teleskopstoßdämpfer ohne zusätzliche mechanische Federelemente.",
      "Hochelastische Gummizugbänder ohne metallische Tragfedern.",
      "Blatttragfedern (Trapez- und Parabelfedern) sowie Schraubendruckfedern (z. B. in Drehgestellen der Bauart Y25)."
    ],
    "explanation": "An Güterwagen kommen vorrangig Blatttragfedern (Trapez- und Parabelfedern) sowie zylindrische Schraubenfedern (z. B. Y25-Drehgestelle) zum Einsatz, ergänzt durch Gummirollenfedern.\n\nReferenz: VDV-Schrift 758"
  },
  "q_wmq_010_if9fxi": {
    "options": [
      "Der Hebel muss ausnahmslos in Stellung „Leer“ stehen, um den Verschleiß der Bremsklotzsohlen zu minimieren.",
      "Der Hebel muss auf „Beladen“ stehen, sobald das Gesamtgewicht des Wagens (Eigenmasse + Ladegewicht) das angeschriebene Umstellgewicht erreicht oder übersteigt.",
      "Die Betätigung des Lastwechselhebels darf ausschließlich durch eine Instandhaltungswerkstatt vorgenommen werden.",
      "Der Hebel muss unabhängig von der tatsächlichen Beladung dauerhaft in der Stellung „Beladen“ eingelegt sein.",
      "Das Umstellen des Lastwechsels darf nur bei vollständig gelöster Druckluftbremse durchgeführt werden.",
      "Vor dem Umstellen des Lastwechselhebels muss auch die Feststellbremse (Handbremse) vollständig gelöst sein."
    ],
    "explanation": "Manueller Lastwechsel (Umstellhebel Leer/Beladen): Der Hebel muss auf „Beladen“ umgestellt werden, sobald das Gesamtgewicht des Wagens das am Wechsel angeschriebene Umschaltgewicht (z.B. 24 t) erreicht oder überschreitet. Das Umstellen darf nur bei vollständig gelöster Druckluft- und Feststellbremse erfolgen.\n\nReferenz: VDV-Schrift 757 & 758 / Ril 915.0102"
  },
  "q_docx_56": {
    "options": [
      "Sie dient als vertikaler Stützpunkt zwischen Wagenkasten und Drehgestell und überträgt Längskräfte beim Anfahren und Bremsen.",
      "Sie fungiert als hydraulischer Stoßdämpfer, um vertikale Gleisstöße aktiv abzufedern und stoßempfindliches Ladegut zu schützen.",
      "Sie dient als mechanische Sperre, die im Stillstand ein seitliches Verschieben des Drehgestells beim Beladen verhindert.",
      "Sie leitet bei Kurvenfahrt durch Zentrifugalkräfte Schmierfett selbsttätig in die Radsatzlager.",
      "Sie bildet die gelenkige Verbindung zwischen Drehgestell und Untergestell, überträgt das Wagengewicht und ermöglicht das Ausdrehen im Gleisbogen.",
      "Sie fängt Oberflächenwasser vom Wagendach auf, um durch Ballastierung den Gesamtschwerpunkt abzusenken."
    ],
    "explanation": "Die Drehpfanne verbindet Drehgestell und Untergestell gelenkig, überträgt Vertikal- und Längskräfte beim Bremsen/Anfahren und ermöglicht das Ausdrehen in Gleisbögen (VDV-Schrift 758)."
  },
  "q_9hvp3z7fc": {
    "options": [
      "Der Fahrzeughalter (bzw. die von ihm benannte verantwortliche Stelle für die Instandhaltung / ECM)",
      "Das jeweilige Eisenbahnverkehrsunternehmen (EVU), das den Wagen aktuell im Zugverband führt",
      "Die den Transportauftrag erteilende Verladerstelle",
      "Der örtliche Fahrdienstleiter des Abgangsbahnhofs"
    ],
    "explanation": "Verantwortlich für die ordnungsgemäße Instandhaltung und Instandsetzung von Güterwagen ist der Fahrzeughalter bzw. die benannte Entity in Charge of Maintenance (ECM) gemäß AEG / VDV 758."
  },
  "q_wmq_002_zv5qez": {
    "options": [
      "Es definiert die erforderlichen Mindestbremshundertstel für Leerfahrten auf Steilstrecken.",
      "Es gibt das maximal zulässige Ladegewicht in Tonnen in Abhängigkeit von der Streckenklasse (Achslast/Meterlast) und der Fahrgeschwindigkeit an.",
      "Es beziffert ausschließlich das Eigengewicht des leeren Wagens ohne Radsätze.",
      "Es gibt das maximal zulässige Gesamtgewicht (Eigenmasse plus Zuladung) für jede Streckenklasse an."
    ],
    "explanation": "Das Lastgrenzenraster gibt das maximale Ladegewicht in Tonnen abhängig von Streckenklasse und Geschwindigkeit an:\n• Streckenklasse A: 16,0 t Achslast / 4,8 t/m Meterlast\n• Streckenklasse B: 18,0 t Achslast / 5,0 t (B1) bzw. 6,4 t/m (B2)\n• Streckenklasse C: 20,0 t Achslast / bis 7,2 t/m Meterlast\n• Streckenklasse D: 22,5 t Achslast / 8,0 t/m Meterlast.\nSpalten „S“ (100 km/h) und „SS“ (120 km/h) geben die Zuladung bei erhöhter Geschwindigkeit an.\n\nReferenz: UIC 570 / Ril 936 / AVV Anhang 9 / VDV 758"
  },
  "q_vmig0340j": {
    "options": [
      "Betriebssicherheit ist der Zustand der Wagen",
      "und deren Komponenten",
      "zur Gewährleistung eines sicheren Bahnbetriebs",
      "ohne abwendbare Gefährdung",
      "für Personen und Sachen"
    ],
    "explanation": "Definition der Betriebssicherheit nach VDV-Schrift 758: Zustand der Wagen und deren Komponenten zur Gewährleistung eines sicheren Bahnbetriebs ohne abwendbare Gefährdung für Personen und Sachen."
  },
  "q_docx_7": {
    "options": [
      "Bei der Verwendung von Stahldraht muss der Nenndurchmesser mindestens 6 mm betragen.",
      "Der verwendete Stahldraht muss einen Durchmesser von mindestens 4 mm aufweisen.",
      "Die Drahtbindung darf mit einer ungeraden Anzahl an Strängen geführt werden.",
      "Freiliegende, ungesicherte Drahtenden dürfen beliebig in das Lichtraumprofil hineinragen.",
      "Der Draht muss aus weichgeglühtem Stahl bestehen, damit er dehnbar ist und unter Spannkräften nicht spröde bricht.",
      "Die Drahtenden dürfen nicht abstehen und die Bindung ist an einer oder mehreren Stellen durch Verdrillen straff zu spannen."
    ],
    "explanation": "Nach den UIC-Verladerichtlinien und VDV 758 muss Bindedraht aus weichgeglühtem Stahldraht mit mindestens 4 mm Durchmesser bestehen, in gerader Strangzahl geführt, durch Verdrillen gespannt werden und Drahtenden dürfen keinesfalls abstehen."
  },
  "q_hdsbloblx": {
    "options": [
      "Versatz oder Unterbrechung der gelben Kontrollstrich-Markierung zwischen Radreifen und Radfelge",
      "Gelockerter, gewanderter oder sichtbare Spalten aufweisender Sprengring (Sicherungsring)",
      "Dumpfer, unreiner oder scheppernder Klang bei der Klangprüfung mit dem Schlosserhammer",
      "Gleichmäßige Flugrostbildung auf den unlackierten Radscheibenflächen",
      "Frischer Fettaustritt an der Labyrinthdichtung des Achslagergehäuses"
    ],
    "explanation": "Merkmale für einen losen Radreifen: 1. Verschiebung der gelben Farbstrichmarkierung, 2. Loser oder gewanderter Sprengring, 3. Unreiner/dumpfer Klang bei der Klangprobe mit dem Prüfhammer (VDV-Schrift 758 / AVV Anlage 9)."
  },
  "q_mxurynn71": {
    "options": [
      "Nach jeder Be- oder Entladung vor dem anschließenden Einsatz im Zugverband",
      "An jedem neu gebildeten Zugverband vor Beginn der Zugfahrt",
      "Grundsätzlich nach genau 24 Stunden Standzeit bei unverändertem Zugverband",
      "Wenn für den Wagenzug nachweislich noch keine gültige Wagenprüfung der Stufe 3 durchgeführt wurde",
      "Durch pauschalen formlosen Eigenverzicht des Eisenbahnverkehrsunternehmens auf die Wagenprüfung",
      "Nach mündlicher Einzelentscheidung des zuständigen Fahrdienstleiters"
    ],
    "explanation": "Fälligkeiten der Wagenprüfung Stufe 3 nach VDV-Schrift 758:\n• Am neu gebildeten Zug\n• Nach jeder Be- oder Entladung\n• Wenn an den Fahrzeugen noch keine Prüfung der Stufe 3 durchgeführt wurde\n• Bei Übernahme von Wagen eines anderen EVU ohne Vertrauensvereinbarung."
  },
  "q_docx_16": {
    "options": [
      "Wenn die Revisionsfrist des Güterwagens erst in vier Wochen (30 Tagen) abläuft.",
      "Wenn die Revisionsfrist in weniger als einer Woche (7 Tagen) abläuft.",
      "Wenn die Revisionsfrist in weniger als 15 Tagen abläuft oder bereits abgelaufen ist."
    ],
    "explanation": "Der Zettel Muster K kennzeichnet Wagen mit Fristablauf oder Schäden. Er ist anzubringen, wenn die Revisionsfrist eines Wagens in weniger als 15 Tagen abläuft oder bereits abgelaufen ist (AVV Anlage 9 / VDV-Schrift 758)."
  },
  "q_docx_11": {
    "options": [
      "Prüfung vor dem Abstellen (Prüfstufe 4)",
      "Prüfung nach der Zugfahrt (Prüfstufe 3)",
      "Prüfung nach dem Abstellen (Prüfstufe 1)",
      "Prüfung vor der Zugfahrt (Prüfstufe 2)",
      "Prüfung vor einer Rangierfahrt"
    ],
    "explanation": "Nach VDV-Schrift 758 gilt: Prüfstufe 1 = Prüfung nach Abstellung, Prüfstufe 2 = Prüfung vor der Zugfahrt, Prüfstufe 3 = Prüfung nach der Zugfahrt, Prüfstufe 4 = Prüfung vor Abstellung / wagentechnische Untersuchung."
  },
  "q_docx_15": {
    "options": [
      "Bei Schrauben- und Parabelfedern mindestens 10 mm Restspiel",
      "Bei Blatt- und Parabelfedern mindestens 15 mm Restspiel",
      "Bei Blatt- und Parabelfedern mindestens 8 mm Restspiel",
      "Bei Schrauben- und Gummirollenfedern mindestens 15 mm Restspiel",
      "Bei Schrauben- und Gummirollenfedern mindestens 8 mm Restspiel"
    ],
    "explanation": "Nach AVV Anlage 9 und VDV-Schrift 758 beträgt das Mindest-Tragfederspiel im beladenen Zustand: bei Blatt- und Parabelfedern mindestens 15 mm, bei Schrauben- und Gummirollenfedern mindestens 8 mm."
  },
  "q_docx_14": {
    "options": [
      "Frischer Farbabbrand an der Radkranzverbindungszone bzw. am Radsteg mit einer Breite von mehr als 25 mm",
      "Sichtbarer Fettaustritt an der Labyrinthdichtung des Radsatzlagers",
      "Farabbrand und Lackbeschädigung ausschließlich am Radsatzlagerdeckel",
      "Angeschmolzene, verbrannte oder verglaste Bremsklotzsohlen",
      "Thermische Laufflächenschäden mit Materialauftragungen, Aufschweißungen oder Brandrissen",
      "Metallische Knirsch- oder Rasselgeräusche beim Drehen des Radsatzes"
    ],
    "explanation": "Merkmale thermischer Überbeanspruchung eines Radsatzes nach AVV Anlage 9 und VDV 758: Farbabbrand am Radkranz von mehr als 25 mm Breite, angeschmolzene Bremssohlen sowie Laufflächenbeschädigungen mit Materialauftragungen."
  },
  "q_qhp1qkeaa": {
    "options": [
      "Zurrgurte zum form- oder kraftschlüssigen Niederzurren (Niederbindung mit Spanngurt)",
      "Hochfeste Zurr- und Spannketten mit Kettenspannern",
      "Das bloße Eigengewicht des Transportgutes ohne mechanische Festlegung",
      "Feste oder steckbare Rungen am Wagenrahmen zur Seitenabsicherung",
      "Einfache Hanfschnüre und Paketklebebänder",
      "Wachspapier als reibungsmindernde Gleitschicht auf dem Wagenboden"
    ],
    "explanation": "Zugelassene Ladungssicherungsmittel nach UIC-Verladerichtlinien und VDV 758 sind u. a. Zurrgurte, Zurrketten, Rungen, Keile und Antirutschmatten. Das reine Eigengewicht ist kein Sicherungsmittel."
  },
  "q_docx_55": {
    "options": [
      "Ein spanabhebendes Abdrehverfahren in der Werkstatt zur Wiederherstellung des Radreifen-Nennprofils.",
      "Eine Verlademethode bei Rundhölzern und Stahlcoils zur Begrenzung von Querkräften.",
      "Eine plastische Materialverformung an der Radlauffläche, bei der Radstahl unter hohen Druck- und Reibkräften über die äußere Radkante fließt und einen spröden Grat bildet.",
      "Eine Gefügeveränderung im Radinneren durch magnetische Einwirkung punktförmiger Zugbeeinflussungsmagnete."
    ],
    "explanation": "Eine Überwalzung ist eine plastische Materialkaltverformung an der Lauffläche des Rades, bei der Radstahl über die Kante hinausgepresst wird und einen spröden, ausbruchgefährdeten Grat bildet (AVV Anlage 9 / VDV-Schrift 758)."
  },
  "q_docx_48": {
    "options": [
      "Eindeutige Fett- oder Ölaustritte am Radsatzlagerdeckel bzw. dessen Verschraubungen",
      "Das Fehlen des Kunststoff-Schutzdeckels auf der Achswellen-Zentrierbohrung",
      "Umlaufende Schmiermittel- und Fettspuren auf der inneren Radscheibe",
      "Eine so starke Erwärmung des Lagergehäuses, dass ein schmerzfreies Berühren mit dem Handrücken unmöglich ist",
      "Angeschmolzene Verbundstoffbremssohlen an den Bremsklötzen",
      "Flachstellen auf der Radlauffläche mit mehr als 60 mm Länge"
    ],
    "explanation": "Symptome eines beschädigten Radsatzlagers nach VDV-Schrift 758 sind Fettaustritt am Lagerdeckel, Fettspuren an der Radscheibe sowie eine Überhitzung des Lagergehäuses (Handrückenkontrolle)."
  },
  "q_docx_49": {
    "options": [
      "Verglaste oder an der Radlauffläche festgeschweißte Verbundstoffbremssohlen",
      "Eine extreme Hitzeentwicklung, bei der das Radsatzlagergehäuse nicht mehr schmerzfrei mit dem Handrücken berührt werden kann",
      "Deutliche Oxidations- und Anlauffarben oder verbrannter Lack am Lagergehäuse und Lagerdeckel",
      "Ein Verdrehen des Radreifens auf der Radfelge infolge einer festen Handbremse"
    ],
    "explanation": "Ein Heißläufer am Radsatzlager führt zu extremer Hitzeentwicklung (Handrückenprüfung nicht mehr möglich) sowie Anlauffarben und Farbabbrand am Gehäuse (VDV-Schrift 758; sofortiges Aussetzen des Wagens erforderlich)."
  },
  "q_docx_57": {
    "options": [
      "Sie koppelt die innere und äußere Schraubenfeder starr, um ein Durchfedern bei voller Beladung zu verhindern.",
      "Sie überträgt einen lastabhängigen Teil der vertikalen Radlast über die Federhaube auf ein Druckstück, welches gegen eine Hartmanganplatte am Radsatzlagergehäuse presst und Schwingungen reibungsgedämpft abbaut.",
      "Sie dient als mechanischer Anschlag, der den maximalen Ausfederweg der Schraubenfedern bei leerem Wagen begrenzt."
    ],
    "explanation": "Die Dämpferschake am Drehgestell Y25 erzeugt die lastabhängige Lenoir-Reibungsdämpfung: Die Vertikallast wird über die Schake in die Federhaube geleitet, deren Druckstück gegen die Hartmanganplatte am Radsatzlagergehäuse drückt (VDV-Schrift 758)."
  },
  "q_docx_69": {
    "options": [
      "Es liegt ein mechanischer Bruch des Notlaufschenkels an der Radsatzwelle vor.",
      "Es liegt eine Beschädigung bzw. Undichtigkeit der Labyrinthdichtung des Radsatzlagers vor.",
      "Das auf der Radscheibe sichtbare Schmiermittel tritt aus dem Radsatzlagergehäuse aus.",
      "Das Schmiermittel tritt aufgrund einer Lockerung aus dem Presssitz der Radscheibe auf der Radsatzwelle aus.",
      "Für die Weiterfahrt muss der Wagen zwingend mit dem Zettel Muster U (außergewöhnliche Sendung) bezettelt werden.",
      "Durch fortschreitenden Schmiermittelmangel droht ein Heißläufer mit Achsschenkelbruch und Entgleisung."
    ],
    "explanation": "Umlaufende Fettspuren an Radnabe und Radscheibe deuten auf eine defekte Labyrinthdichtung des Radsatzlagers hin. Schmiermittel tritt aus; durch Schmiermittelmangel drohen Heißläufer, Achsschenkelbruch und Entgleisung (VDV-Schrift 758 / AVV Anlage 9)."
  },
  "q_wmq_107_iv3ygn": {
    "options": [
      "Flachstellen sind im Schienengüterverkehr ohne Begrenzung zulässig und erfordern keinerlei betriebliche Einschränkungen.",
      "Erst ab einer durchgehenden Flachstellenlänge von mehr als 150 mm ist ein betriebliches Eingreifen erforderlich.",
      "Bei einem Raddurchmesser über 840 mm ab mehr als 60 mm Länge (bzw. über 40 mm bei Raddurchmessern bis 840 mm); Weiterfahrt höchstens mit 20 km/h bis zum nächsten Aussetzbahnhof.",
      "Bereits bei minimalem Abrieb unter 10 mm muss der Wagenzug auf freier Strecke sofort zwangsgebremst und stillgelegt werden."
    ],
    "explanation": "Grenzmaß für Flachstellen nach AVV Anlage 9 und VDV 758: Bei Raddurchmessern > 840 mm max. 60 mm Länge (bei $\\le$ 840 mm max. 40 mm). Bei Überschreitung darf der Wagen nur noch mit maximal 20 km/h bis zum nächsten Bahnhof bewegt und muss dort ausgesetzt werden."
  },
  "q_wmq_009_xb44bb": {
    "options": [
      "Einhaltung vorgeschriebener Schutzabstände zu besetzten Triebfahrzeugen, Steuerwagen oder unverträglichen Gefahrstoffen",
      "Als Schutzabstand genügt das Zwischenschalten mindestens eines vierachsigen Drehgestell-Schutzwagens",
      "Gefahrgutwagen dürfen grundsätzlich nur in Zügen mit maximal fünf Wagen befördert werden",
      "Als Schutzabstand genügt das Zwischenschalten von mindestens zwei zweiachsigen Schutzwagen",
      "Einhaltung eines Mindestabstands von 18 Metern zwischen Wagen mit explosiven Stoffen und brennbaren Flüssigkeiten",
      "Im Eisenbahnbetrieb existieren keinerlei Reihungs- oder Abstandsvorschriften für Gefahrgut"
    ],
    "explanation": "Nach RID und betrieblichen Regelwerken (VDV-Schrift 758 / Ril 408): Zwischen Triebfahrzeugen/besetzten Personenwagen und Wagen mit Explosivstoffen (Kl. 1) oder giftigen Gasen (Kl. 2.3) sind Schutzabstände von mindestens 18 Metern (bzw. 2 zweiachsige oder 1 vierachsiger Schutzwagen) einzuhalten."
  },
  "q_wmq_131_0uhvfe": {
    "options": [
      "Verdrehte oder auf der Radfelge gewanderte Radreifen (erkennbar am Versatz der gelben Kontrollmarkierung)",
      "Flachstellen und ausgeprägte thermische Materialaufschweißungen auf der Radlauffläche",
      "Angeschmolzene, verkohlte oder verbrannte Bremsklotzsohlen",
      "Trockene Flugrostspuren an der Außenseite des Radsatzlagerdeckels"
    ],
    "explanation": "Thermische Überbeanspruchung des Radsatzes (z. B. durch feste Bremse) zeigt sich nach VDV 758 durch verdrehte Radreifen, Aufschweißungen/Flachstellen, verbrannte Bremsklotzsohlen sowie Farbabbrand am Radsteg > 25 mm."
  },
  "q_docx_70": {
    "options": [
      "Es markiert die Anhebepunkte für Hebezeuge und Kräne mit einer zulässigen Stützlast zwischen 5,0 t und 11,0 t.",
      "Es definiert die zulässige Stapelhöhe für Frachtstücke, die mit Dreieck-Verkeilungen gegen Verrutschen gesichert sind.",
      "Maximale Radlast von verladenen Fahrzeugen für die Belastung des Wagenbodens ohne Unterlagen (5,0 t) und zulässige Achslast von verladenen Fahrzeugen auf den Kopfstücken ohne Abstützung (11,0 t).",
      "Es beschreibt die zulässige Radsatzlast des Güterwagens im Leerzustand (5,0 t) und bei Vollbeladung (11,0 t).",
      "Es kennzeichnet die zulässige Pufferstoßbelastung beim Rangieren zwischen 50 kN und 110 kN."
    ],
    "explanation": "Das Piktogramm mit den Gewichtsangaben 5,0 t und 11,0 t kennzeichnet die maximale Radlast von Fahrzeugen beim Befahren des Wagenbodens ohne Unterlagen (5,0 t) und die zulässige Achslast auf den Kopfstücken ohne Abstützung (11,0 t) gemäß VDV 758."
  },
  "q_docx_63": {
    "options": [
      "Die im Einzellastenraster angegebenen Höchstwerte gelten für eine Mindestauflagebreite der Ladung von 1,2 m.",
      "Die Werte des Einzellastenrasters setzen eine Mindestauflagebreite der Ladung von mindestens 2,0 m voraus.",
      "Liegt die Ladung nur auf zwei quer liegenden Unterlagen auf, so muss das maximal zulässige Ladungsgewicht nach dem Kennzeichen für punktuelle Belastung bestimmt werden.",
      "Bei Auflage auf zwei quer liegenden Unterlagen darf das volle Ladegewicht nach dem Kennzeichen für flächige Lastverteilung ausgenutzt werden."
    ],
    "explanation": "Nach den Verladerichtlinien und VDV 758 gelten die Werte des Einzellastenrasters für eine Mindestauflagebreite von 1,2 m. Bei Auflage auf nur zwei quer liegenden Hölzern gilt das Kennzeichen der punktuellen Belastung."
  },
  "q_wmq_133_i7v4w3": {
    "options": [
      "Sicheres Tragen des Fahrzeug-Eigengewichts sowie der gesamten Ladungsmasse",
      "Aktive Übertragung von Beschleunigungs- und Triebkräften auf die Schiene",
      "Zuverlässige geometrische Führung des Fahrzeugs im Gleiskörper (Spurführung)",
      "Federung und Dämpfung der dynamischen Kräfte zwischen Rad und Schiene"
    ],
    "explanation": "Das Laufwerk eines Güterwagens erfüllt nach VDV 758 drei Hauptaufgaben: 1. Führen des Fahrzeugs im Gleis (Spurführung), 2. Tragen der Fahrzeug- und Ladungsmasse, 3. Federung und Dämpfung der dynamischen Kräfte."
  },
  "q_wmq_135_vxohzu": {
    "options": [
      "Die Mindestbelagdicke einer Bremsklotzsohle beträgt an der dünnsten Stelle 8 mm.",
      "Die Mindestbelagdicke an der dünnsten Stelle einer Bremsklotzsohle beträgt 10 mm (bzw. bis zur Verschleißmarkierung).",
      "Eine Bremsklotzsohle gilt bereits ab einer verbleibenden Restdicke von 15 mm als vollständig verschlissen.",
      "Verbundstoffbremssohlen dürfen bis auf das Trägerblech (1 mm Restdicke) abgefahren werden."
    ],
    "explanation": "Mindestbelagdicken bei der Wagenprüfung der Bremsausrüstung nach AVV Anhang 9 und VDV 758: Bremsklotzsohlen (Grauguss P10 sowie Verbundstoff K/LL) mindestens 10 mm an der dünnsten Stelle (bzw. bis zur Verschleißmarkierungsnut); Scheibenbremsbeläge mindestens 5 mm."
  },
  "q_wmq_015_gretps": {
    "options": [
      "Eine rein administrative Prüfung der Begleitpapiere im Dienstgebäude ohne Besichtigung des Wagenzuges.",
      "Die Feststellung und Sicherstellung des betriebssicheren und verkehrstauglichen Zustands von Wagen, Ladung und Ladeeinheiten für die anschließende Zugfahrt.",
      "Eine periodische Hauptuntersuchung zur Fristverlängerung in einem Ausbesserungswerk.",
      "Eine orientierende Sichtprüfung des Zuges während der Vorbeifahrt bei Streckengeschwindigkeit."
    ],
    "explanation": "Schutzziel der Prüfung Stufe 3 nach VDV-Schrift 758: Feststellung und Gewährleistung des sicheren Zustands von Wagen, Ladeeinheiten und Ladung für die anschließende Zugfahrt."
  },
  "q_wmq_127_mkum7t": {
    "options": [
      "Muster I: Wagen ist schwer beschädigt und darf ausschließlich unter permanenter Geschwindigkeitsbegrenzung befördert werden.",
      "Muster K: Nach dem Entladen nicht wiederbeladen – Zuführung zur Reparatur bzw. Werkstatt.",
      "Muster F: Kennzeichnung von Radsätzen mit unzulässiger Flachstellenbildung über 60 mm.",
      "Muster G: Allgemeiner Kennzeichnungszettel zur Erfassung der europäischen Wagennummer."
    ],
    "explanation": "Schadens- und Kennzeichnungszettel nach AVV Anhang 9 / 11 und VDV 758:\n• Muster I: Lauffähigkeitsbescheinigung (Wagen darf ohne Einschränkung auf eigenen Rädern laufen).\n• Muster K: Nach Entladung nicht wiederbeladen, Zuführung zur Werkstatt.\n• Muster M: Wagen hat Mängel, ist voll betriebsfähig und lauffähig.\n• Muster R1: Druckluftbremse ausgeschaltet / unwirksam.\n• Muster U: Außergewöhnliche Sendung."
  },
  "q_wmq_007_7iq72j": {
    "options": [
      "Die Querschwerpunktlage ist im Eisenbahnbetrieb technisch und fahrdynamisch ohne jede Relevanz.",
      "Das Radlastverhältnis zwischen den Rädern derselben Achse darf maximal 1 : 2 (nach UIC-Vorgabe 1,25 : 1) betragen.",
      "Das Lastverhältnis zwischen den Drehgestellen bzw. Achsen in Wagenlängsrichtung darf maximal 1 : 3 betragen.",
      "Eine Wagenseite darf das Fünffache des Radgewichts der gegenüberliegenden Seite aufweisen."
    ],
    "explanation": "Nach UIC-Verladerichtlinien und VDV 758: Das Radlastverhältnis einer Achse infolge ungleicher Querschwerpunktlage darf max. 1 : 2 (bzw. 1,25 : 1 nach UIC) betragen, um Entgleisungen im Bogen zu verhindern. In Längsrichtung darf das Verhältnis 1 : 3 nicht überschritten werden."
  },
  "q_docx_17": {
    "options": [
      "Die zuverlässige geometrische Führung des Fahrzeugs im Gleiskörper (Spurführung)",
      "Das sichere Tragen des Fahrzeug-Eigengewichts sowie der gesamten Ladungsmasse",
      "Die Erzeugung von Triebkraft zur Beschleunigung des Wagens"
    ],
    "explanation": "Das Laufwerk eines Eisenbahnwagens hat die Hauptaufgaben: Spurführung des Fahrzeugs im Gleis und Tragen des Fahrzeuggewichts samt Ladung. Güterwagen besitzen keinen eigenen Fahrantrieb (VDV-Schrift 758)."
  }
};

// Also let's prepare the script to update:
// 1. src/database/docx_questions.json
// 2. src/database/mockDb.ts
// 3. Supabase quiz_questions table

async function run() {
  console.log('--- 1. Updating docx_questions.json ---');
  const docxPath = 'src/database/docx_questions.json';
  const docx = JSON.parse(fs.readFileSync(docxPath, 'utf8'));
  let docxUpdated = 0;
  docx.forEach(q => {
    if (UPDATED_QUESTIONS[q.id]) {
      const u = UPDATED_QUESTIONS[q.id];
      // Check option count matches
      if (u.options.length === q.options.length) {
        q.options = u.options;
      } else {
        console.warn(`Option length mismatch for ${q.id} in docx: expected ${q.options.length}, got ${u.options.length}`);
        // If docx had different count, update to new options and adjust correctIndex if needed
        q.options = u.options;
      }
      if (u.explanation) {
        q.explanation = u.explanation;
      }
      docxUpdated++;
    }
  });
  fs.writeFileSync(docxPath, JSON.stringify(docx, null, 2), 'utf8');
  console.log(`Updated ${docxUpdated} questions in ${docxPath}`);

  console.log('--- 2. Updating mockDb.ts ---');
  let mockContent = fs.readFileSync('src/database/mockDb.ts', 'utf8');
  // Update q6 in mockDb.ts
  const q6 = UPDATED_QUESTIONS['q6'];
  const oldQ6BlockRegex = /id:\s*['"]q6['"],\s*category:\s*['"]Wagenprüfung['"],\s*text:\s*['"]Wie macht sich eine Flachstelle an einem Güterwagen im Betrieb bemerkbar\?['"],\s*options:\s*\[[\s\S]*?\],\s*correctIndex:\s*1,\s*explanation:\s*['"][\s\S]*?['"]/;
  
  const newQ6Block = `id: 'q6',
    category: 'Wagenprüfung',
    text: 'Wie macht sich eine Flachstelle an einem Güterwagen im Betrieb bemerkbar?',
    options: ${JSON.stringify(q6.options, null, 6).replace(/\n\s{4}/g, '\n    ')},
    correctIndex: 1,
    explanation: '${q6.explanation.replace(/'/g, "\\'")}'`;

  if (oldQ6BlockRegex.test(mockContent)) {
    mockContent = mockContent.replace(oldQ6BlockRegex, newQ6Block);
    fs.writeFileSync('src/database/mockDb.ts', mockContent, 'utf8');
    console.log('Successfully updated q6 in mockDb.ts');
  } else {
    console.warn('Could not regex match q6 block in mockDb.ts, checking manual index...');
    const q6Idx = mockContent.indexOf("id: 'q6'");
    if (q6Idx !== -1) {
      console.log('Found q6 at position', q6Idx);
    }
  }

  console.log('--- 3. Updating Supabase quiz_questions ---');
  const supaRaw = JSON.parse(fs.readFileSync('scripts/supabase_wagenpruefung.json', 'utf8'));
  let supaSuccess = 0;
  for (const q of supaRaw) {
    const u = UPDATED_QUESTIONS[q.id];
    if (u) {
      // Keep existing metadata in explanation if present
      const metaMatch = q.explanation ? q.explanation.match(/<!--RT_META:(.*?)-->/) : null;
      let newExplanation = u.explanation;
      if (metaMatch) {
        newExplanation = `${u.explanation}\n${metaMatch[0]}`;
      }

      const { error } = await supabase
        .from('quiz_questions')
        .update({
          options: u.options,
          explanation: newExplanation
        })
        .eq('id', q.id);

      if (error) {
        console.error(`Failed to update ${q.id} in Supabase:`, error.message);
      } else {
        supaSuccess++;
        console.log(`Updated ${q.id} in Supabase (${supaSuccess}/${supaRaw.length})`);
      }
    } else {
      console.warn(`No update defined for Supabase question ${q.id}`);
    }
  }
  console.log(`Supabase update finished: ${supaSuccess} updated.`);
}

run();
