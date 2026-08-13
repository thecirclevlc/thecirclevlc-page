import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import EventCard, { dbToCard, type CardEvent } from './EventCard';
import EditableText from './EditableText';
import { supabase } from '../lib/supabase';
import { useSiteBlock } from '../hooks/useSiteContent';
import type { Event as DBEvent } from '../lib/database.types';

/**
 * Event cards on the home page — "integrar posibilidad de agregar card eventos
 * en el home page".
 *
 * No count or on/off switch on purpose. Three events, ordered by the `featured`
 * flag the admin already has and then by date, and the whole section hides
 * itself when there is nothing published. That is one fewer control to explain,
 * and it finally makes the existing "featured" toggle do something visible.
 */

const HOME_EVENTS_KEY = 'content_home_events';
const DEFAULTS = {
  title:    'RECENT CHAPTERS',
  subtitle: 'Each night happens once.',
  cta:      'ALL EVENTS',
};

export default function HomeEvents() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<CardEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const { data: copy, setData: setCopy } = useSiteBlock(HOME_EVENTS_KEY, DEFAULTS);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from('events')
      .select('*')
      .eq('status', 'published')
      .order('featured', { ascending: false })
      .order('date', { ascending: false })
      .limit(3)
      .then(({ data }) => {
        if (cancelled) return;
        setEvents(((data as DBEvent[]) ?? []).map(dbToCard));
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  // Nothing published yet → no empty shell on the public site.
  if (loading || events.length === 0) return null;

  const go = (path: string) => { window.scrollTo(0, 0); navigate(path); };

  return (
    <section className="relative px-5 md:px-20 py-20 md:py-32 border-t border-primary/10">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-14 md:mb-20">
          <div>
            <EditableText
              as="h2"
              contentKey={HOME_EVENTS_KEY}
              field="title"
              value={copy.title}
              onSave={v => setCopy(prev => ({ ...prev, title: v }))}
              className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-primary leading-none"
            />
            <EditableText
              as="p"
              contentKey={HOME_EVENTS_KEY}
              field="subtitle"
              value={copy.subtitle}
              onSave={v => setCopy(prev => ({ ...prev, subtitle: v }))}
              className="mt-3 text-sm md:text-base font-mono text-primary/50 tracking-wider"
            />
          </div>

          <button
            onClick={() => go('/past-events')}
            className="self-start md:self-auto border border-primary/40 text-primary px-7 py-3.5 text-xs font-mono tracking-widest uppercase hover:bg-primary hover:text-black transition-colors cursor-pointer flex-shrink-0"
          >
            {copy.cta} &rarr;
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10 md:gap-14">
          {events.map((event, i) => (
            <EventCard
              key={event.id}
              event={event}
              index={i}
              onClick={() => go(`/past-events/${event.id}`)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
