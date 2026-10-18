// Hand-written intros for cities I've put together properly. Everything here
// was checked against the linked Wikipedia articles (Oct 2026); place data
// itself (coordinates, category, live summary) still comes from the API so
// "Add to trip" works the same as anywhere else.
//
// Photos are from Wikimedia Commons and were picked so each one actually
// shows the place it's attached to. Credits are required by the licences.

const commons = (file) => `https://commons.wikimedia.org/wiki/File:${file}`;

const chennai = {
  key: 'chennai',
  center: { lat: 13.0878, lon: 80.2785 },
  eyebrow: 'Chennai, Tamil Nadu',
  headline: 'Madras began as a fort in 1639. The temple towns around it are far older.',
  intro: [
    'Chennai sits on the Coromandel Coast of the Bay of Bengal. The East India Company founded Fort St. George here in 1639, and the city grew out from it to take in neighbourhoods like Thiruvallikeni, whose Parthasarathy Temple was first built by the Pallavas in the 6th century, and Mylapore, whose temple deity is praised in 7th-century Tamil hymns.',
  ],
  hero: {
    src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/Chepauk_Palace%2C_the_heritage_building_and_former_official_residence_of_the_Nawab_of_Arcot_in_Chennai_06.jpg/1920px-Chepauk_Palace%2C_the_heritage_building_and_former_official_residence_of_the_Nawab_of_Arcot_in_Chennai_06.jpg',
    alt: 'The red Indo-Saracenic facade of Chepauk Palace in Chennai, with domes, arches and palm trees in front',
    caption: 'Chepauk Palace, residence of the Nawab of Arcot from 1768 to 1855.',
    credit: 'Pinakpani, CC BY 4.0',
    href: commons('Chepauk_Palace,_the_heritage_building_and_former_official_residence_of_the_Nawab_of_Arcot_in_Chennai_06.jpg'),
  },
  picksIntro:
    'Six places that cover most of the city’s story: the fort it grew from, two temples older than it, the museum, the beach and the basilica.',
  picks: [
    {
      id: '627149', // Fort St. George
      note: 'Founded in 1639, it was the first English fortress in India, and the city of Madras grew outward from it. It still houses the Tamil Nadu Legislative Assembly.',
      image: {
        src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/Fort_St._George%2C_Chennai_2.jpg/1280px-Fort_St._George%2C_Chennai_2.jpg',
        alt: 'White colonnaded colonial building inside Fort St. George',
        credit: 'L. Vivian Richard, public domain',
        href: commons('Fort_St._George,_Chennai_2.jpg'),
      },
    },
    {
      id: '658270', // Kapaleeshwarar Temple
      area: 'Mylapore',
      note: 'A Shiva temple built around the 17th century. Its presiding deity is praised in the Tevaram, the 7th-century hymns of the Tamil Nayanar saints.',
      image: {
        src: 'https://upload.wikimedia.org/wikipedia/commons/9/99/Kapaleeswarar1.jpg',
        alt: 'The painted gopuram of Kapaleeshwarar Temple seen across the temple tank',
        credit: 'Mohan Krishnan, CC BY-SA 3.0',
        href: commons('Kapaleeswarar1.jpg'),
      },
    },
    {
      id: '247159', // Marina Beach
      note: 'A natural urban beach running 6 km from near Fort St. George to Foreshore Estate. Swimming is prohibited because of the strong undercurrent.',
      image: {
        src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Marina_beach%2C_Chennai_aerial_view.jpg/960px-Marina_beach%2C_Chennai_aerial_view.jpg',
        alt: 'Aerial view of Marina Beach at dusk, with food stalls on the sand along the shoreline',
        credit: 'Saiphani02, CC BY-SA 4.0',
        href: commons('Marina_beach,_Chennai_aerial_view.jpg'),
      },
    },
    {
      id: '2399139', // Government Museum
      area: 'Egmore',
      note: 'Started in 1851, it is the second-oldest museum in India after the Indian Museum in Kolkata. The National Art Gallery on the same campus holds paintings by Raja Ravi Varma.',
      image: {
        src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/Madras_museum_theatre_in_October_2007.jpg/960px-Madras_museum_theatre_in_October_2007.jpg',
        alt: 'The curved red-brick Museum Theatre at the Government Museum, Egmore',
        credit: 'L. Vivian Richard, public domain',
        href: commons('Madras_museum_theatre_in_October_2007.jpg'),
      },
    },
    {
      id: '783723', // Parthasarathy Temple
      area: 'Thiruvallikeni',
      note: 'First built by the Pallava king Narasimhavarman I in the 6th century, it is one of the oldest structures in Chennai and one of the 108 Divya Desams of Vishnu.',
      image: {
        src: 'https://upload.wikimedia.org/wikipedia/commons/0/0f/Tiruvallikeni1.jpg',
        alt: 'White gopuram of the Parthasarathy Temple behind the pavilion of its temple tank',
        credit: 'Mohan Krishnan, CC BY-SA 3.0',
        href: commons('Tiruvallikeni1.jpg'),
      },
    },
    {
      id: '5334834', // San Thome Basilica
      area: 'Santhome',
      note: 'Built by the Portuguese in 1523 over what is venerated as the tomb of Thomas the Apostle, and renovated in the neo-Gothic style in 1896.',
      image: {
        src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/Santhome_Basilica.jpg/960px-Santhome_Basilica.jpg',
        alt: 'The white neo-Gothic spire and facade of San Thome Basilica against a blue sky',
        credit: 'PlaneMad, CC BY-SA 2.5',
        href: commons('Santhome_Basilica.jpg'),
        position: 'center 30%',
      },
    },
  ],
};

const GUIDES = [chennai];

const near = (a, b) => Math.abs(a.lat - b.lat) < 0.3 && Math.abs(a.lon - b.lon) < 0.3;

export function findGuide(cityName, lat, lon) {
  if (!cityName) return null;
  return (
    GUIDES.find((g) => g.key === cityName.toLowerCase() && near(g.center, { lat: Number(lat), lon: Number(lon) })) || null
  );
}
