import { CSHAPES_START, cshapesMapYear, nextCshapesChange, usesCshapes } from './cshapes';
import { BC } from '../lib/time';

/**
 * One entry per border snapshot in the historical-basemaps dataset.
 * `year` is the astronomical year the map depicts; `file` is the suffix used
 * by the upstream repository. `summary` is a short editorial description of the
 * political world at that moment, shown in the side panel.
 */
export interface Snapshot {
  file: string;
  year: number;
  summary: string;
  source?: 'basemaps' | 'cshapes';
}

export const SNAPSHOTS: Snapshot[] = [
  {
    file: 'bc5000', year: BC(5000),
    summary:
      'No states yet exist. Farming villages have spread across the Fertile Crescent, the Nile, the Indus region, the Yellow and Yangtze valleys and much of Europe, while most of the planet is inhabited by hunter-gatherers, fishers and pastoralists. The map shows broad cultural zones, not political borders.',
  },
  {
    file: 'bc4000', year: BC(4000),
    summary:
      'The Uruk period begins in southern Mesopotamia: irrigation, temple economies and the first true cities. Copper is worked in the Balkans, Anatolia and Iran, and the giant Cucuteni–Trypillia settlements of Ukraine are among the largest communities on Earth.',
  },
  {
    file: 'bc3000', year: BC(3000),
    summary:
      'Egypt has been unified under its first dynasties and Sumerian city-states such as Uruk, Ur and Kish compete along the Euphrates. Writing exists in both regions. Elsewhere, the Norte Chico sites of Peru, Neolithic Britain and the Yangshao and Liangzhu cultures of China are building monuments without states.',
  },
  {
    file: 'bc2000', year: BC(2000),
    summary:
      'The Old Kingdom pyramids are already centuries old; Egypt is entering the Middle Kingdom. The Akkadian Empire and the Third Dynasty of Ur have risen and fallen in Mesopotamia. The Indus Valley civilisation is at its mature peak, Minoan Crete is building palaces, and Indo-European speakers are spreading across Eurasia.',
  },
  {
    file: 'bc1500', year: BC(1500),
    summary:
      'Bronze Age great powers face one another: New Kingdom Egypt, the Hittites in Anatolia, Kassite Babylon, Mitanni and Mycenaean Greece. In China the Shang dynasty rules from the Yellow River. The Indus cities have been abandoned, and in the Americas the Olmec heartland is taking shape.',
  },
  {
    file: 'bc1000', year: BC(1000),
    summary:
      'The Late Bronze Age collapse has swept away the Hittites and the Mycenaean palaces; Egypt is weakened and divided. Iron is spreading. The Zhou have overthrown the Shang in China, Phoenician traders carry an alphabet around the Mediterranean, and the Olmec and Chavín cultures flourish in the Americas.',
  },
  {
    file: 'bc700', year: BC(700),
    summary:
      'The Neo-Assyrian Empire dominates the Near East from Nineveh. Greek city-states are colonising the Mediterranean and Black Sea coasts, Rome is a small settlement on the Tiber, and the Zhou king in China is a figurehead over increasingly independent states. Kush rules Egypt as its 25th Dynasty.',
  },
  {
    file: 'bc500', year: BC(500),
    summary:
      'The Achaemenid Persian Empire of Darius I stretches from the Indus to the Aegean and Egypt — the largest state the world has yet seen. Athens has just become a democracy, Rome a republic, and Carthage rules the western Mediterranean seaways. In India the Mahajanapadas compete along the Ganges while the Buddha and Mahavira teach; in China Confucius is alive.',
  },
  {
    file: 'bc400', year: BC(400),
    summary:
      'Persia remains the superpower but has been checked in Greece, where Sparta has just defeated Athens in the Peloponnesian War. The Warring States period is under way in China, Magadha is consolidating in northern India, and Celtic peoples occupy much of temperate Europe.',
  },
  {
    file: 'bc323', year: BC(323),
    summary:
      'Alexander the Great has died in Babylon, leaving an empire from Macedon to the Punjab that his generals will now tear apart. Rome controls central Italy, Carthage the western Mediterranean, and the Nanda dynasty rules the Ganges — shortly to be overthrown by Chandragupta Maurya.',
  },
  {
    file: 'bc300', year: BC(300),
    summary:
      'The Hellenistic kingdoms have crystallised: the Ptolemies in Egypt, the Seleucids in Asia and Antigonid Macedon. The Maurya Empire unites most of the Indian subcontinent. Rome is fighting the Samnites for Italy, and the Qin state is rising among China\u2019s Warring States.',
  },
  {
    file: 'bc200', year: BC(200),
    summary:
      'Rome has defeated Hannibal and Carthage in the Second Punic War and is turning east toward Greece. The Han dynasty has replaced the short-lived Qin as ruler of a unified China, and the nomadic Xiongnu confederation dominates the steppe to its north. The Maurya Empire is in decline.',
  },
  {
    file: 'bc100', year: BC(100),
    summary:
      'Rome rules the Mediterranean shores from Spain to Asia Minor, though its Republic is straining under civil strife. The Parthians control Iran and Mesopotamia, Han China under Emperor Wu has pushed into Central Asia and opened the Silk Road, and Greco-Bactrian and Indo-Greek kingdoms linger in the Hindu Kush.',
  },
  {
    file: 'bc1', year: BC(1),
    summary:
      'Augustus has transformed the Roman Republic into an empire ringing the Mediterranean. Parthia is its great rival in the east; Han China, Rome\u2019s equal in size and population, is the other pole of Eurasia. The Kushan and Saka peoples move through Central Asia, and Teotihuacan is growing in central Mexico.',
  },
  {
    file: '100', year: 100,
    summary:
      'Rome under Trajan is approaching its greatest territorial extent, from Britain to the Euphrates. The Kushan Empire links India and Central Asia, the Han dynasty is at its second peak, and the Satavahanas rule the Deccan. Aksum has emerged in the Ethiopian highlands and Teotihuacan dominates Mesoamerica.',
  },
  {
    file: '200', year: 200,
    summary:
      'The Roman Empire has weathered the Antonine Plague and is ruled by the Severan dynasty; the Han dynasty, by contrast, is disintegrating into warlordism. The Kushans still bridge Central Asia and India; the Parthians are on their last legs, soon to be replaced by the Sasanians.',
  },
  {
    file: '300', year: 300,
    summary:
      'Diocletian has stabilised Rome after the Crisis of the Third Century by dividing rule among a tetrarchy. The Sasanian Empire is Rome\u2019s peer rival. China is split (Jin dynasty), the Kushans have fragmented, and Maya city-states are entering their Classic period.',
  },
  {
    file: '400', year: 400,
    summary:
      'The Roman Empire is now formally divided into Eastern and Western halves and is Christian in religion; Germanic peoples press on the frontiers. The Gupta Empire is at its zenith in India, the Sasanians rule Iran, and China is divided between northern nomadic dynasties and the southern Jin.',
  },
  {
    file: '500', year: 500,
    summary:
      'The Western Roman Empire has fallen; Ostrogoths rule Italy, Visigoths Spain, Franks Gaul and Vandals North Africa, while the Eastern Empire endures at Constantinople. The Gupta Empire is fading under Huna attacks. Teotihuacan is at its height and the Maya lowlands are dense with cities.',
  },
  {
    file: '600', year: 600,
    summary:
      'Byzantium under Maurice and Sasanian Persia are locked in the last of their great wars. The Sui dynasty has reunified China and the Turkic Khaganate rules the steppe. Muhammad is a merchant in Mecca; within a generation Arabia will reshape the map.',
  },
  {
    file: '700', year: 700,
    summary:
      'The Umayyad Caliphate has conquered Persia, Syria, Egypt and North Africa and is about to cross into Spain. Byzantium survives in Anatolia and the Balkans. Tang China is at its cosmopolitan height, and Silla has unified most of Korea with Tang help; Srivijaya rises in Sumatra.',
  },
  {
    file: '800', year: 800,
    summary:
      'Charlemagne is crowned emperor in Rome, reviving an imperial title in the West. The Abbasid Caliphate rules from Baghdad, the intellectual centre of the world. Tang China is recovering from the An Lushan rebellion, the Khmer Empire is being founded in Cambodia, and Ghana controls the West African gold trade.',
  },
  {
    file: '900', year: 900,
    summary:
      'The Carolingian Empire has splintered; Vikings raid and settle from Ireland to Kiev. The Abbasid Caliphate is fragmenting into regional dynasties. Tang China is collapsing, the Classic Maya cities are being abandoned, and Magyars have arrived in the Carpathian Basin.',
  },
  {
    file: '1000', year: 1000,
    summary:
      'Europe is a patchwork of feudal kingdoms: the Holy Roman Empire, Capetian France, Anglo-Saxon England, newly Christian Poland, Hungary and Kievan Rus. The Fatimids rule Egypt and the Byzantines are resurgent under Basil II. Song China is prosperous and inventive; Chola power spans the Bay of Bengal; Norse sailors have reached North America.',
  },
  {
    file: '1100', year: 1100,
    summary:
      'Crusaders have just captured Jerusalem. The Seljuk Turks dominate the Middle East and have wrested Anatolia from Byzantium. Song China faces the Liao and Western Xia; the Ghaznavids hold Afghanistan and the Punjab. The Almoravids rule Morocco and Iberia\u2019s Muslim south; Angkor is rising.',
  },
  {
    file: '1200', year: 1200,
    summary:
      'Saladin\u2019s Ayyubids have retaken Jerusalem. The Angevin kings of England hold half of France. Song China rules only the south; the Jin dynasty holds the north. In Mongolia, Temüjin is uniting the tribes and will soon be proclaimed Genghis Khan. The Khmer Empire of Angkor is at its zenith.',
  },
  {
    file: '1279', year: 1279,
    summary:
      'The Mongol Empire is the largest contiguous empire in history: Kublai Khan has just completed the conquest of Song China, while the Golden Horde, Chagatai Khanate and Ilkhanate rule Russia, Central Asia and Iran. Only the Mamluks of Egypt and Japan have repelled them. The Delhi Sultanate holds northern India; Mali is expanding in West Africa.',
  },
  {
    file: '1300', year: 1300,
    summary:
      'The Mongol khanates are now independent of each other and gradually adopting local religions. The Ottoman beylik has just appeared in Anatolia. The Delhi Sultanate and Mali Empire are at their height; the Hundred Years\u2019 War between England and France is a generation away.',
  },
  {
    file: '1400', year: 1400,
    summary:
      'Timur (Tamerlane) has carved a vast empire from Delhi to Damascus. The Ming dynasty has expelled the Mongols from China. The Ottomans hold the Balkans, the Aztec Triple Alliance is about to form in Mexico, and the Inca are still a highland kingdom around Cusco. Europe is recovering from the Black Death.',
  },
  {
    file: '1492', year: 1492,
    summary:
      'Columbus reaches the Caribbean, and Castile has just completed the Reconquista at Granada. The Aztec and Inca empires are at their greatest extent, unaware of what is coming. The Ottomans hold Constantinople, Songhai dominates the Niger bend, Ming China is closed and prosperous, and Ivan III has freed Muscovy from Tatar tribute.',
  },
  {
    file: '1500', year: 1500,
    summary:
      'Portugal has opened the sea route to India and has just touched Brazil. The Safavids are seizing Iran and the Ottomans and Mamluks are on a collision course. Muscovy is expanding, the Habsburgs are assembling their inheritance, and the Aztec and Inca empires remain intact for one more generation.',
  },
  {
    file: '1530', year: 1530,
    summary:
      'The Spanish have destroyed the Aztec Empire and are about to topple the Inca. Charles V rules Spain, the Netherlands, Austria and much of Italy; Suleiman the Magnificent has taken Hungary and besieged Vienna. Babur has founded the Mughal Empire in India, and Luther\u2019s Reformation is splitting Western Christendom.',
  },
  {
    file: '1600', year: 1600,
    summary:
      'Spain and Portugal, united under one crown, claim most of the Americas and the sea lanes to Asia; the Dutch and English are founding East India companies to challenge them. Akbar\u2019s Mughal Empire dominates India, the Ottomans and Safavids the Middle East, and Tokugawa Ieyasu has just won Sekigahara in Japan. Russia is pushing into Siberia.',
  },
  {
    file: '1650', year: 1650,
    summary:
      'The Thirty Years\u2019 War has just ended with the Peace of Westphalia. The Qing have taken Beijing and are conquering China; the Dutch Republic is the world\u2019s leading trading power. English, French and Dutch colonies dot the North American coast and the Caribbean, worked increasingly by enslaved Africans.',
  },
  {
    file: '1700', year: 1700,
    summary:
      'Louis XIV\u2019s France is Europe\u2019s dominant power, about to fight the War of the Spanish Succession. The Mughal Empire under Aurangzeb covers nearly all India but is over-extended. Qing China under Kangxi is expanding into Mongolia and Tibet; Peter the Great is westernising Russia.',
  },
  {
    file: '1715', year: 1715,
    summary:
      'The Peace of Utrecht has redrawn Europe: Britain gains Gibraltar and Newfoundland, the Spanish Empire is divided from Habsburg Austria. Russia has crushed Sweden at Poltava. The Mughal Empire is fragmenting after Aurangzeb\u2019s death, and the Maratha Confederacy is rising in its place.',
  },
  {
    file: '1783', year: 1783,
    summary:
      'The Treaty of Paris recognises the independence of the United States. Britain has nonetheless emerged from the Seven Years\u2019 War as the leading colonial power, with Bengal under East India Company rule and Canada in its hands. Catherine the Great\u2019s Russia has annexed Crimea; Qing China is at its territorial maximum.',
  },
  {
    file: '1800', year: 1800,
    summary:
      'Revolutionary France under Napoleon Bonaparte is remaking Europe. Britain is industrialising and consolidating its Indian empire; Spain still rules most of the Americas. The Ottoman Empire is losing ground to Russia and Austria, and the Qing dynasty, though enormous, is entering decline.',
  },
  {
    file: '1815', year: 1815,
    summary:
      'Napoleon has been defeated at Waterloo and the Congress of Vienna has restored Europe\u2019s monarchies within a new balance of power. Spanish America is in open revolt; Britain is the unrivalled naval and commercial power; the Zulu and Sokoto states are rising in Africa.',
  },
  {
    file: '1880', year: 1880,
    summary:
      'The unified German Empire and Italy have joined the great powers; the United States has survived its Civil War and spans the continent. Britain rules India directly. The Scramble for Africa is about to begin — most of the continent is still under African rule. The Ottoman and Qing empires are shrinking under Western pressure.',
  },
  {
    file: '1900', year: 1900,
    summary:
      'European empires have partitioned Africa and most of Asia; only Ethiopia, Liberia, Siam, Persia, Japan and China (humiliated by the Boxer intervention) remain independent there. Britain rules a quarter of the world\u2019s land. The United States has taken the Philippines and Puerto Rico; Japan is an emerging industrial power.',
  },
  {
    file: '1914', year: 1914,
    summary:
      'The eve of the First World War: Europe is divided between the Triple Entente (France, Russia, Britain) and the Central Powers (Germany, Austria-Hungary). China has become a republic; the Ottoman Empire has lost nearly all its European territory in the Balkan Wars. Colonial empires are at their greatest extent.',
  },
  {
    file: '1920', year: 1920,
    summary:
      'The war has destroyed the German, Austro-Hungarian, Russian and Ottoman empires. New states — Poland, Czechoslovakia, Yugoslavia, the Baltic republics, Finland — fill Central and Eastern Europe. The Bolsheviks are winning the Russian Civil War; Britain and France administer the Middle East under League of Nations mandates.',
  },
  {
    file: '1930', year: 1930,
    summary:
      'The Great Depression is spreading from Wall Street to the world. The Soviet Union is collectivising agriculture under Stalin; Mussolini rules Italy and the Nazis are gaining in Germany. China is nominally unified under Chiang Kai-shek\u2019s Nationalists; Japan is about to seize Manchuria.',
  },
  {
    file: '1938', year: 1938,
    summary:
      'Nazi Germany has annexed Austria and, at Munich, the Sudetenland. Japan is at war with China. Italy has conquered Ethiopia and Spain is in civil war. The Soviet Union is in the grip of the Great Purge. The road to the Second World War is nearly complete.',
  },
  {
    file: '1945', year: 1945,
    summary:
      'The Axis powers have been destroyed and Germany and Korea are under Allied occupation. The United States and the Soviet Union are the new superpowers; the United Nations has just been founded. Europe\u2019s colonial empires still stand on the map but are about to be dismantled, beginning with India and Indonesia.',
  },
  {
    file: '1960', year: 1960,
    summary:
      'The Cold War divides the world into NATO and Warsaw Pact blocs, with a widening non-aligned movement. 1960 is the \u201cYear of Africa\u201d: seventeen colonies gain independence. The People\u2019s Republic of China has been established, the Korean War is over and Cuba has turned to the Soviet Union.',
  },
  {
    file: '1994', year: 1994,
    summary:
      'The Soviet Union, Yugoslavia and Czechoslovakia have dissolved into their successor states; Germany is reunified and the European Union has been created. South Africa holds its first democratic election and Rwanda suffers genocide. The World Wide Web is spreading; China\u2019s economy is booming.',
  },
  {
    file: '2000', year: 2000,
    summary:
      'A largely post-Cold-War order: NATO and the EU are expanding eastwards, the euro has been launched, and the United States is the sole superpower. China has joined the world economy; East Timor is on the way to independence. The conflicts of the 2000s — Afghanistan, Iraq — lie just ahead.',
  },
  {
    file: '2010', year: 2010,
    summary:
      'The global financial crisis has shaken Western economies; China is now the world\u2019s second-largest. Kosovo has declared independence and South Sudan is about to. In December, protests in Tunisia set off the Arab Spring.',
  },
];

export const SNAPSHOT_YEARS = SNAPSHOTS.map((s) => s.year);

/** Index of the latest historical-basemaps snapshot whose year is <= the given year. */
export function snapshotIndexFor(year: number): number {
  let idx = 0;
  for (let i = 0; i < SNAPSHOTS.length; i++) {
    if (SNAPSHOTS[i].year <= year) idx = i;
    else break;
  }
  return idx;
}

function nearestEditorial(year: number): string {
  let best = SNAPSHOTS[0];
  let bestDist = Infinity;
  for (const s of SNAPSHOTS) {
    const d = Math.abs(s.year - year);
    if (d < bestDist) {
      best = s;
      bestDist = d;
    }
  }
  return best.summary;
}

function cshapesSummary(year: number): string {
  return nearestEditorial(cshapesMapYear(year));
}

export function snapshotFor(year: number): Snapshot {
  if (usesCshapes(year)) {
    const mapYear = cshapesMapYear(year);
    return {
      file: 'cshapes',
      year: mapYear,
      source: 'cshapes',
      summary: cshapesSummary(year),
    };
  }
  return { ...SNAPSHOTS[snapshotIndexFor(year)], source: 'basemaps' };
}

export function nextBorderYear(year: number): number | null {
  if (usesCshapes(year)) return nextCshapesChange(year);
  const idx = snapshotIndexFor(year);
  const next = SNAPSHOTS[idx + 1];
  if (!next) return CSHAPES_START;
  if (next.year >= CSHAPES_START) return CSHAPES_START;
  return next.year;
}

export function snapshotUrl(s: Snapshot): string {
  if (s.source === 'cshapes') return `${import.meta.env.BASE_URL}data/borders/cshapes.geojson`;
  return `${import.meta.env.BASE_URL}data/borders/world_${s.file}.geojson`;
}
