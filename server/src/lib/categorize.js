// Wikipedia doesn't give us a clean "type" for a place, but almost every
// article has a short description like "Hindu temple in Tamil Nadu, India".
// Matching on that turned out to be good enough to bucket things.

export const CATEGORIES = {
  heritage: 'Heritage',
  museum: 'Museums & culture',
  worship: 'Places of worship',
  nature: 'Parks & nature',
  landmark: 'Landmarks',
  neighbourhood: 'Neighbourhoods',
  other: 'Other',
};

// Stuff that has coordinates on Wikipedia but isn't somewhere you'd visit.
const SKIP = [
  /constituenc/, /railway/, /metro station/, /bus (terminus|station|depot)/, /\bcourt\b/,
  /upper house|lower house/, /government offices/, /power (plant|station)/, /container port/,
  /^place in/, /substation/, /\bdepot\b/, /police/, /\bprison\b|\bjail\b/,
  /\bschool\b/, /college/, /universit/, /hospital/, /legislat/, /\bagency\b/, /commission/,
  /\bdistrict\b/, /\btaluk/, /former state/, /presidency/, /\bward\b/, /municipal/,
  /company/, /publisher/, /\bbattle\b/, /\bsiege\b/, /\bwar\b/, /election/, /headquarters/,
  /office building/, /government (body|department)/, /constitutional body/, /\bbank\b/,
  /airline/, /television/, /newspaper/, /radio station/, /\bclub\b/, /census town/,
  /stampede|crowd crush|disaster|attack|bombing|flood|\briot|cyclone|accident|\bfinal\b|\bchain\b/,
  /^capital of/, /^city in/, /^city and/, /administrative/, /\bvillage\b/,
];

const RULES = [
  ['worship', /temple|church|cathedral|mosque|masjid|basilica|shrine|dargah|gurdwara|synagogue|monaster|chapel|mandir|kovil|abbey|pagoda/],
  ['museum', /museum|gallery|library|art centre|theatre|theater|auditorium|cultural|aquarium|planetarium|memorial hall/],
  ['neighbourhood', /neighbourhood|neighborhood|locality|suburb|quarter|area of|old town/],
  ['heritage', /\bfort\b|palace|castle|monument|memorial|statue|ruins|archaeolog|heritage|historic|tomb|mausoleum|colonial|built in 1[0-8]\d\d|world heritage/],
  ['nature', /\bpark\b|garden|beach|lake|river|island|hill|zoo|reserve|sanctuary|waterfall|forest|lagoon|estuary|mountain|valley|\bbay\b/],
  ['landmark', /building|tower|bridge|stadium|market|bazaar|square|street|road|lighthouse|hall|hotel|mall|arena|clock|gate|pier|promenade|skyscraper/],
];

// some articles only say "Building in India", so check the title too
// events with coordinates ("2011 Indian Premier League final") start with a year
const SKIP_TITLE = /^\d{4}\b|power (plant|station)|substation|railway station|assembly constituency|\bschool\b|college|institute/i;

export function categorize(description = '', title = '') {
  description = description || '';
  const text = `${description} ${title}`.toLowerCase();
  if (SKIP_TITLE.test(title)) return null;
  if (SKIP.some((re) => re.test(description.toLowerCase()))) return null;
  for (const [key, re] of RULES) {
    if (re.test(text)) return key;
  }
  return 'other';
}
