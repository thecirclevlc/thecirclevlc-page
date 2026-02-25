export interface Event {
  id: string;
  number: string; // For display like "01", "02", etc.
  title: string;
  subtitle?: string;
  date: string;
  location: string;
  description: string;
  longDescription: string[];
  coverImage: string;
  images: string[];
  attendees?: number;
  lineup?: string[];
  tags: string[];
  year: string;
}

export const pastEvents: Event[] = [
  {
    id: 'vol-ii',
    number: '01',
    title: 'VOL. II',
    subtitle: 'SILENCE WAS DEAFENING',
    date: 'December 28, 2024',
    location: 'Secret Location, Valencia',
    description: 'The second chapter of The Circle. An immersive night where electronic beats met visual art in an abandoned industrial space.',
    longDescription: [
      'VOL. II marked a turning point in The Circle\'s evolution. What started as an intimate gathering transformed into a full sensory experience.',
      'Over 150 carefully selected participants entered a transformed industrial warehouse, where light, sound, and space converged into a single unified experience.',
      'The night featured performances from emerging electronic artists, live visual projections, and interactive art installations that responded to the crowd\'s energy.',
      'Every element was designed to blur the line between observer and participant, creating moments of collective discovery that could only happen once.'
    ],
    coverImage: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1200&h=800&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1200&h=800&fit=crop',
      'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200&h=800&fit=crop',
      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200&h=800&fit=crop',
      'https://images.unsplash.com/photo-1571266028243-d220c6da6c92?w=1200&h=800&fit=crop'
    ],
    attendees: 150,
    lineup: ['DJ Nexus', 'Analog Dreams', 'The Resonance Collective'],
    tags: ['Electronic', 'Immersive', 'Visual Art', 'Limited Capacity'],
    year: '2024'
  },
  {
    id: 'vol-i',
    number: '02',
    title: 'VOL. I',
    subtitle: 'GENESIS',
    date: 'October 15, 2024',
    location: 'Hidden Venue, Valencia',
    description: 'Where it all began. The first Circle gathered under one principle: create without boundaries.',
    longDescription: [
      'VOL. I was the genesis. An experiment in collective experience, where 80 strangers became co-creators of a single night.',
      'In a raw, unfinished space on the outskirts of Valencia, we proved that the best moments happen when structure gives way to spontaneity.',
      'No predetermined timeline. No rigid format. Just music, movement, and the freedom to explore what happens when art meets the unexpected.',
      'This was the night that defined what The Circle would become: not just an event, but a living, breathing space for creative expression.'
    ],
    coverImage: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1200&h=800&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1200&h=800&fit=crop',
      'https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=1200&h=800&fit=crop',
      'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=1200&h=800&fit=crop',
      'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=1200&h=800&fit=crop'
    ],
    attendees: 80,
    lineup: ['Luna Eclipse', 'The Grid', 'Frequency Shift'],
    tags: ['Experimental', 'Underground', 'Electronic', 'Genesis'],
    year: '2024'
  }
];

export const getEventById = (id: string): Event | undefined => {
  return pastEvents.find(event => event.id === id);
};

export const getEventByIndex = (index: number): Event | undefined => {
  return pastEvents[index];
};
