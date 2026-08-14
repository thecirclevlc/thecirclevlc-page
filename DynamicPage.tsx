import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { StandardHeader } from './StandardHeader';
import Footer from './components/Footer';
import AdminToolbar from './components/AdminToolbar';
import PageBlocks from './components/PageBlocks';
import EditableText from './components/EditableText';
import GSAPReveal from './components/GSAPReveal';
import NotFound from './NotFound';
import { supabase } from './lib/supabase';
import { usePageTitle } from './hooks/usePageTitle';
import type { Page } from './lib/database.types';

/**
 * Renders any page the client built from the panel, at its own address.
 *
 * Registered as `/:slug`, below every static route. React Router ranks static
 * segments above dynamic ones, so `/djs` still reaches the DJs page; only
 * addresses nothing else claims land here. Reserved slugs are additionally
 * blocked by a CHECK on the table, so a page can never shadow a real route.
 */
export default function DynamicPage() {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage]       = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setPage(null);

    // No `status` filter on purpose: RLS already hides drafts from the public
    // and shows them to a logged-in admin. That gives the client preview of an
    // unpublished page for free, with no preview token to build or leak.
    supabase
      .from('pages')
      .select('*')
      .eq('slug', slug ?? '')
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setPage((data as Page) ?? null);
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [slug]);

  usePageTitle(page?.seo_title || page?.title || 'The Circle');


  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!page) return <NotFound />;

  return (
    <div className="min-h-screen bg-bg text-primary selection:bg-primary selection:text-black">
      <StandardHeader />

      <main className="relative z-10 pt-16 md:pt-20">
        {page.status === 'draft' && (
          // Only an admin can ever see this — the public gets a 404 instead.
          <div className="bg-amber-500/10 border-b border-amber-500/30 px-6 py-3 text-center">
            <p className="text-amber-300 text-xs font-mono tracking-widest uppercase">
              Draft — only you can see this page. Publish it to make it public.
            </p>
          </div>
        )}

        <GSAPReveal>
          <header className="px-5 md:px-20 pt-14 md:pt-24 pb-4">
            <div className="max-w-6xl mx-auto">
              <EditableText
                as="h1"
                contentKey="page_title"
                field="title"
                label="Page · Title"
                value={page.title}
                onSave={v => setPage(prev => prev && { ...prev, title: v })}
                persist={async v => {
                  const { error } = await supabase.from('pages').update({ title: v }).eq('id', page.id);
                  if (error) throw error;
                }}
                className="font-black uppercase tracking-tighter leading-[0.9] text-primary break-words block"
                style={{ fontSize: 'clamp(2.5rem, 10vw, 6rem)' }}
              />
            </div>
          </header>
        </GSAPReveal>

        {/* pageId turns on live editing of every block: click a heading or a
            paragraph with edit mode on and change it where it sits. */}
        <PageBlocks
          blocks={page.blocks ?? []}
          pageId={page.id}
          onBlocksChange={blocks => setPage(prev => prev && { ...prev, blocks })}
        />
      </main>

      <Footer />
      <AdminToolbar />
    </div>
  );
}
