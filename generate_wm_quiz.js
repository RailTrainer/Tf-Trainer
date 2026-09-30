const fs = require('fs');
const https = require('https');

const rawCards = JSON.parse(fs.readFileSync('scratch_unique_cards.json', 'utf-8'));

function clean(str) {
  if (!str) return '';
  return str.trim().replace(/\r\n/g, '\n');
}

function cardToQuizQuestion(card, index) {
  const title = clean(card.title);
  const content = clean(card.content);
  const ref = clean(card.reference);
  const origCat = card.category;
  const img = card.image_url || null;

  let qText = '';
  let options = [];
  let correctIndex = 0;
  let dangerIndices = [];
  let explanation = content + (ref ? '\n\nReferenz: ' + ref : '');

  // 1. Spezifische Abfragen je nach Thema
  if (title.toLowerCase().includes('selbsttätig') || content.toLowerCase().includes('selbsttätig')) {
    qText = 'Wann gilt eine durchgehende Druckluftbremse im Eisenbahnbetrieb als "selbsttätig"?';
    options = [
      'Wenn bei unbeabsichtigter Zugtrennung oder Druckabfall in der Hauptluftleitung (HL) automatisch eine Vollbremsung im gesamten Zug ausgelöst wird.',
      'Wenn die Bremse sich nach einer Bremsung ohne Zutun des Triebfahrzeugführers nach 30 Sekunden selbst wieder löst.',
      'Wenn der Bremszylinderdruck rein elektrisch über die Zugsammelschiene gesteuert wird.',
      'Wenn die Bremse nur auf dem Triebfahrzeug wirkt, nicht jedoch an den Wagen.'
    ];
    correctIndex = 0;
    dangerIndices = [3];
  } 
  else if (title.toLowerCase().includes('lastgrenzenraster')) {
    qText = 'Welche Bedeutung hat das Lastgrenzenraster an einem Güterwagen?';
    options = [
      'Es gibt das maximale zulässige Ladegewicht in Tonnen abhängig von Streckenklasse (Achslast/Meterlast) und Geschwindigkeitsstufen an.',
      'Es zeigt die Anzahl der noch zulässigen Bremshundertstel für Leerfahrten an.',
      'Es kennzeichnet ausschließlich das Eigengewicht des Wagens ohne Drehgestelle.',
      'Es gibt die Revisionsintervalle für die nächste Hauptuntersuchung an.'
    ];
    correctIndex = 0;
    dangerIndices = [];
  }
  else if (title.toLowerCase().includes('fahrbereitschaft')) {
    qText = 'Welche Voraussetzungen müssen für die Fahrbereitschaft einer Rangierfahrt erfüllt sein?';
    options = [
      'Alle Fahrzeuge gekuppelt, Sicherungsmittel (Hemmschuhe) entfernt, Bremsen gelöst, Mitfahrende verständigt, Ladearbeiten eingestellt.',
      'Nur die Hauptluftleitung muss gekuppelt sein; Hemmschuhe können beim Anfahren überrollt werden.',
      'Es reicht aus, wenn der Triebfahrzeugführer das Signal Sh 1 wahrgenommen hat.',
      'Lediglich die Spitzenbeleuchtung am Triebfahrzeug muss eingeschaltet sein.'
    ];
    correctIndex = 0;
    dangerIndices = [1];
  }
  else if (title.toLowerCase().includes('arbeitsschutz') || title.toLowerCase().includes('dguv')) {
    qText = 'Welche persönliche Schutzausrüstung (PSA) ist nach DGUV V73 im Gleisbereich mindestens vorgeschrieben?';
    options = [
      'Warnkleidung (z.B. Warnweste / Warnanzug in Orange), Sicherheitsschuhe (mind. S3) und bei Arbeiten wie Kuppeln Anstoßkappe/Helm sowie Schutzhandschuhe.',
      'Alltägliche Straßenkleidung mit reflektierendem Armband ist ausreichend.',
      'Nur ein Gehörschutz, solange man sich auf dem Schotterbett bewegt.',
      'Helle Freizeitkleidung ohne Sicherheitsschuhe.'
    ];
    correctIndex = 0;
    dangerIndices = [1, 3];
  }
  else if (title.toLowerCase().includes('verkehrstauglichkeit') || title.toLowerCase().includes('betriebssicherheit')) {
    qText = 'Wie unterscheiden sich "Betriebssicherheit" und "Verkehrstauglichkeit" bei der Wagenprüfung?';
    options = [
      'Betriebssicher ist ein Wagen, wenn er gefahrlos befördert werden kann; verkehrstauglich, wenn er zusätzlich für die bestimmungsgemäße Ladungsbeförderung geeignet ist.',
      'Beide Begriffe bedeuten im Eisenbahnbetrieb exakt dasselbe ohne Unterschied.',
      'Verkehrstauglichkeit betrifft nur die Lokomotive, Betriebssicherheit nur Reisezugwagen.',
      'Ein Wagen ist betriebssicher, wenn die Revisionsfrist bereits um 6 Monate überschritten ist.'
    ];
    correctIndex = 0;
    dangerIndices = [3];
  }
  else if (title.toLowerCase().includes('revisionsfrist') || title.toLowerCase().includes('muster k')) {
    qText = 'Was ist zu veranlassen, wenn die Revisionsfrist eines Güterwagens in weniger als 15 Tagen abläuft oder bereits abgelaufen ist?';
    options = [
      'Der Wagen darf nicht mehr neu beladen werden bzw. ist mit Schadensmuster K / R1 zu bezetteln und dem Instandhalter zuzuführen.',
      'Die Frist verlängert sich automatisch um 6 Monate durch Unterschrift des Wagenmeisters.',
      'Der Wagen darf ohne jede Einschränkung weitere 2 Jahre im Regelverkehr laufen.',
      'Es genügt, die Aufschrift mit Kreide zu überstreichen.'
    ];
    correctIndex = 0;
    dangerIndices = [2];
  }
  else if (title.toLowerCase().includes('querschwerpunkt') || title.toLowerCase().includes('ladungsverteilung')) {
    qText = 'Welches Verhältnis darf die Radlastdifferenz infolge ungleicher Querschwerpunktlage bei Güterwagen maximal betragen?';
    options = [
      'Das Radlastverhältnis auf einer Achse darf maximal 1 : 1,25 (bzw. Radsatzlastverhältnis 1 : 3) betragen, um Entgleisungsgefahr zu vermeiden.',
      'Die Radlast darf beliebig ungleich verteilt sein, solange das Gesamtgewicht passt.',
      'Eine Seite darf um das Fünffache schwerer als die andere sein.',
      'Der Querschwerpunkt ist bei Güterwagen betrieblich irrelevant.'
    ];
    correctIndex = 0;
    dangerIndices = [1, 2];
  }
  else if (title.toLowerCase().includes('gefahrgutkennzeichnung') || title.toLowerCase().includes('rid')) {
    qText = 'Welche Kennzeichnungen müssen nach RID an einem Tragwagen mit Gefahrgut-Container angebracht sein?';
    options = [
      'Großzettel (Plakate/Gefahrzettel) an beiden Längsseiten sowie ggf. orangefarbene Warntafeln mit Gefahr- und UN-Nummer.',
      'Lediglich ein gelber Aufkleber am Zettelhalter des Wagens.',
      'Es sind keine Kennzeichnungen erforderlich, solange der Triebfahrzeugführer die Frachtpapiere hat.',
      'Ausschließlich ein weißes Schild an der Pufferbohle.'
    ];
    correctIndex = 0;
    dangerIndices = [2];
  }
  else if (title.toLowerCase().includes('schutzabstände') && title.toLowerCase().includes('gefahrgut')) {
    qText = 'Welche Schutzabstände / Reihungsvorschriften gelten grundsätzlich für Gefahrgutwagen im Zugverband?';
    options = [
      'Schutzabstand (z.B. Schutzwagen oder Mindestabstand) zu besetzten Triebfahrzeugen, Steuerwagen oder anderen unverträglichen Stoffen.',
      'Gefahrgutwagen müssen immer direkt hinter der arbeitenden Lokomotive eingereiht werden.',
      'Gefahrgutwagen dürfen niemals in Zügen mit mehr als 5 Wagen eingestellt werden.',
      'Es gibt im Eisenbahnbetrieb keinerlei Reihungsvorschriften für Gefahrgut.'
    ];
    correctIndex = 0;
    dangerIndices = [3];
  }
  else if (title.toLowerCase().includes('lastwechsel')) {
    qText = 'Wie ist die Stellung des manuellen Lastwechselhebels (Leer / Beladen) bei einem Güterwagen zu prüfen?';
    options = [
      'Der Hebel muss auf "Beladen" stehen, wenn das Gesamtgewicht des Wagens (Eigen- + Ladegewicht) das Umstellgewicht erreicht oder überschreitet.',
      'Der Hebel muss immer auf "Leer" stehen, um Bremsbelagverschleiß zu minimieren.',
      'Der Lastwechselhebel darf nur in der Werkstatt durch den Instandhalter verstellt werden.',
      'Der Hebel muss immer auf "Beladen" stehen, unabhängig vom Beladungszustand.'
    ];
    correctIndex = 0;
    dangerIndices = [1];
  }
  else if (title.toLowerCase().includes('außergewöhnliche sendung') || title.toLowerCase().includes('lademaß')) {
    qText = 'Wann liegt eine "Außergewöhnliche Sendung" (Lü / AS) vor?';
    options = [
      'Wenn eine Sendung das reguläre Lademaß (Lichtraumprofil) überschreitet, die zulässige Achs-/Meterlast übersteigt oder besondere betriebliche Maßnahmen erfordert.',
      'Wenn die Ladung einen Warenwert von über 1 Million Euro aufweist.',
      'Wenn der Zug schneller als 80 km/h fährt.',
      'Jede Sendung, die in einem gedeckten Güterwagen transportiert wird.'
    ];
    correctIndex = 0;
    dangerIndices = [];
  }
  else if (title.toLowerCase().includes('federbauarten') || title.toLowerCase().includes('blatttragfedern')) {
    qText = 'Welche Federbauarten kommen an Güterwagen vorrangig zum Einsatz?';
    options = [
      'Blatttragfedern (Trapez- und Parabelfedern) sowie Schraubenfedern (z.B. in Y25-Drehgestellen).',
      'Ausschließlich hydraulische Stoßdämpfer ohne mechanische Federn.',
      'Gummizugbänder ohne metallische Federungselemente.',
      'Ausschließlich Luftfederbälge wie im Hochgeschwindigkeitsverkehr.'
    ];
    correctIndex = 0;
    dangerIndices = [];
  }
  else if (title.toLowerCase().includes('dieselmotor') || title.toLowerCase().includes('takte')) {
    qText = 'In welcher Reihenfolge laufen die vier Takte eines 4-Takt-Dieselmotors ab?';
    options = [
      '1. Ansaugen, 2. Verdichten, 3. Arbeiten (Verbrennung/Expansion), 4. Ausstoßen.',
      '1. Zünden, 2. Verdichten, 3. Ausstoßen, 4. Ansaugen.',
      '1. Verdichten, 2. Ansaugen, 3. Ausstoßen, 4. Arbeiten.',
      '1. Einspritzen, 2. Arbeiten, 3. Ansaugen, 4. Verdichten.'
    ];
    correctIndex = 0;
    dangerIndices = [];
  }
  else if (title.toLowerCase().includes('abfahrbereit')) {
    qText = 'Wann gilt ein Zug im Bahnbetrieb als "abfahrbereit"?';
    options = [
      'Wenn er vorbereitet ist, Ladearbeiten eingestellt sind, Außentüren geschlossen sind, die Bremsprobe abgeschlossen ist und das Zugpersonal fahrbereit ist.',
      'Sobald das Ausfahrsignal Fahrt zeigt, unabhängig von Türen und Bremsprobe.',
      'Allein wenn der Triebfahrzeugführer auf der Lokomotive sitzt.',
      'Wenn die planmäßige Abfahrtszeit laut Fahrplan erreicht ist.'
    ];
    correctIndex = 0;
    dangerIndices = [1];
  }
  else if (title.toLowerCase().includes('stufe 3') || title.toLowerCase().includes('wagenprüfung stufe 3')) {
    qText = 'Was ist das Schutzziel und die Fälligkeit der Wagenprüfung Stufe 3 nach VDV 758?';
    options = [
      'Feststellung der Verkehrs- und Betriebssicherheit sowie vorschriftsmäßigen Beladung vor der Abfahrt eines neu gebildeten Zuges.',
      'Eine jährliche Hauptuntersuchung in einem Ausbesserungswerk der Bahn.',
      'Eine kurze Sichtprüfung während der Vorbeifahrt mit 80 km/h.',
      'Eine reine Dokumentenprüfung im Stellwerk ohne Besichtigung der Fahrzeuge.'
    ];
    correctIndex = 0;
    dangerIndices = [2, 3];
  }
  else if (title.toLowerCase().includes('führerraumbremsprobe')) {
    qText = 'Wann ist eine Führerraumbremsprobe (Fbrp) fällig?';
    options = [
      'Nach Führerstandswechsel, nach vorübergehendem Absperren des Führerbremsventils (bis 1 Std.) oder nach dem Abkuppeln von Triebfahrzeugen.',
      'Ausschließlich einmal täglich morgens beim Ausrücken aus dem Bw.',
      'Nur wenn ein Wagen im Zugverband neu beigestellt wurde.',
      'Niemals, wenn die Lokomotive modern ist.'
    ];
    correctIndex = 0;
    dangerIndices = [];
  }
  else if (title.toLowerCase().includes('12-stelligen uic-wagennummer') || title.toLowerCase().includes('wagennummer')) {
    qText = 'Wie ist die 12-stellige UIC-Wagennummer an Güterwagen aufgebaut?';
    options = [
      '1.-2. Ziffer: Austauschcode, 3.-4. Ziffer: Ländercode, 5.-8. Ziffer: Bauart/Gattung, 9.-11. Ziffer: Ordnungsnummer, 12. Ziffer: Selbstkontrollziffer.',
      '1.-6. Ziffer: Baujahr, 7.-12. Ziffer: Seriennummer des Herstellers.',
      '1.-4. Ziffer: Postleitzahl des Heimatbahnhofs, 5.-12. Ziffer: Bremsgewicht.',
      'Die Wagennummer ist eine rein zufällige Ziffernfolge ohne feste Codierung.'
    ];
    correctIndex = 0;
    dangerIndices = [];
  }
  else if (title.toLowerCase().includes('abstellsicherung') || title.toLowerCase().includes('hemmschuhen')) {
    qText = 'Wie müssen abgestellte Güterwagen gegen unbeabsichtigtes Entlaufen gesichert werden?';
    options = [
      'Mit Feststellbremsen (Handbremse) und/oder Radvorlegern/Hemmschuhen in vorgeschriebener Anzahl nach Gefälleverhältnis; Luftbremsen gelten nicht als dauerhafte Sicherung!',
      'Allein das Anlegen der Druckluftbremse genügt für eine Abstellung über Nacht.',
      'Es muss lediglich die Kupplung zwischen den Wagen stramm gedreht werden.',
      'Güterwagen müssen in ebenen Gleisen grundsätzlich überhaupt nicht gesichert werden.'
    ];
    correctIndex = 0;
    dangerIndices = [1, 3];
  }
  else if (title.toLowerCase().includes('voller bremsprobe') || title.toLowerCase().includes('volle bremsprobe')) {
    qText = 'Wann ist eine "Volle Bremsprobe" im Bahnbetrieb fällig?';
    options = [
      'Am neu gebildeten Zug, bei Unterbrechung der HL um mehr als 1 Stunde, wenn der Zug unverändert bis zu 24 Stunden abgestellt war (ohne Zugpersonal) oder bei Unregelmäßigkeiten.',
      'Nur einmal pro Monat im Rahmen der Werkstattprüfung.',
      'Ausschließlich nach jedem einfachen Lokwechsel ohne Zugumbildung.',
      'Vor jeder Abfahrt an jedem beliebigen Zwischenhalt.'
    ];
    correctIndex = 0;
    dangerIndices = [];
  }
  else if (title.toLowerCase().includes('vereinfachte bremsprobe') || title.toLowerCase().includes('vereinfachten bremsprobe')) {
    qText = 'Was wird bei der "Vereinfachten Bremsprobe" am letzten luftgebremsten Fahrzeug geprüft?';
    options = [
      'Das ordnungsgemäße Anlegen und Lösen der Bremse am letzten Fahrzeug des Zuges (Zustand der Durchgängigkeit der Hauptluftleitung).',
      'Das vollständige Ausmessen aller Radreifenprofile mit dem Grenzmaßlehrensatz.',
      'Die elektrische Spannung der Zugsammelschiene am Zugschluss.',
      'Ausschließlich das Vorhandensein der Schlussscheibe Zg 2.'
    ];
    correctIndex = 0;
    dangerIndices = [];
  }
  else if (title.toLowerCase().includes('radsatz') || title.toLowerCase().includes('flachstelle')) {
    qText = 'Ab welcher Länge gilt eine Flachstelle am Laufrad eines Güterwagens als unzulässiger Mangel / Betriebsgefährdung?';
    options = [
      'Bei Radsatzdurchmesser > 840 mm ab mehr als 60 mm Länge (bzw. > 40 mm bei kleineren Rädern); Wagen darf nur noch mit maximal 20 km/h bewegt werden.',
      'Erst ab einer Flachstellenlänge von über 200 mm.',
      'Flachstellen sind im Güterverkehr uneingeschränkt zulässig und führen nie zu Geschwindigkeitseinschränkungen.',
      'Jede auch mikroskopisch kleine Flachstelle erfordert das sofortige Entgleisen des Wagens.'
    ];
    correctIndex = 0;
    dangerIndices = [1, 2];
  }
  else if (title.toLowerCase().includes('schraubenkupplung') || title.toLowerCase().includes('langmachen')) {
    qText = 'Wie ist die Schraubenkupplung im Regelbetrieb ordnungsgemäß zu kuppeln und zu spannen?';
    options = [
      'Kupplungslasche in den Zughaken einhängen und die Spindel so weit anziehen, dass sich die Pufferfedern der berührenden Puffer leicht berühren (bzw. 1 Umdrehung nach Berührung).',
      'Die Spindel muss immer bis zum äußersten Anschlag mit einer Verlängerungsstange überdreht werden.',
      'Die Kupplung muss lose durchhängen und mindestens 30 cm Abstand zwischen den Puffern lassen.',
      'Es reicht, die Kupplung an der Aufhängeöse einzuhängen, ohne den Zughaken zu nutzen.'
    ];
    correctIndex = 0;
    dangerIndices = [2, 3];
  }
  else {
    // Generischer, inhaltsbasierter Formulierungsweg für alle weiteren Lernkarten
    qText = title.trim();
    if (!qText.endsWith('?')) {
      qText = `Was gilt bezüglich: "${title}"?`;
    }

    const lines = content.split('\n').map(l => l.replace(/^[•\-\*0-9\.\s]+/, '').trim()).filter(l => l.length > 5);
    let correct = lines.slice(0, 3).join('; ');
    if (correct.length > 180) correct = correct.substring(0, 177) + '...';
    if (!correct) correct = content.substring(0, 150);

    options = [
      correct,
      'Dies ist laut Regelwerk grundsätzlich unzulässig und führt zum sofortigen Erlöschen der Betriebserlaubnis.',
      'Diese Vorgabe gilt ausschließlich für Triebzüge im Personenfernverkehr (ICE/TGV), nicht für Güterzüge.',
      'Hierüber entscheidet der Disponent situativ nach persönlichem Ermessen ohne feste Vorschrift.'
    ];
    correctIndex = 0;
    dangerIndices = [];
  }

  // Shuffle options
  const perm = [
    [0, 1, 2, 3],
    [1, 0, 2, 3],
    [2, 1, 0, 3],
    [3, 1, 2, 0],
    [1, 2, 0, 3],
    [2, 0, 1, 3],
    [3, 0, 1, 2],
    [0, 2, 1, 3]
  ][index % 8];

  const shuffledOptions = perm.map(p => options[p]);
  const newCorrectIndex = perm.indexOf(correctIndex);
  const newDangerIndices = dangerIndices.map(d => perm.indexOf(d)).filter(d => d !== -1);

  return {
    id: 'q_wmq_' + String(index + 1).padStart(3, '0') + '_' + Math.random().toString(36).substr(2, 6),
    category: 'Wagenmeister Quiz',
    text: qText,
    options: shuffledOptions,
    correct_index: newCorrectIndex,
    danger_indices: newDangerIndices,
    explanation: explanation,
    image_url: img,
    is_verified: true
  };
}

const allQuestions = rawCards.map((c, idx) => cardToQuizQuestion(c, idx));
console.log('Successfully prepared ' + allQuestions.length + ' questions for Wagenmeister Quiz.');

fs.writeFileSync('generated_wm_quiz_questions.json', JSON.stringify(allQuestions, null, 2), 'utf-8');
console.log('Saved to generated_wm_quiz_questions.json');
