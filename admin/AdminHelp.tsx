import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  MousePointerClick, LayoutDashboard, Inbox, Paintbrush, Settings,
  ChevronDown, Sparkles, Undo2, EyeOff, Ban,
} from 'lucide-react';

/**
 * The manual, inside the panel.
 *
 * A separate document would be read once and lost. Here it sits one click from
 * every screen it describes, and each step links straight to the screen it is
 * talking about — the client asked for Instagram in the footer while the
 * control sat three tabs deep, and no PDF was ever going to fix that.
 */

const CARD = 'bg-[#111] border border-[#1a1a1a] rounded-xl';

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-4">
      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] text-[#888] text-xs flex items-center justify-center mt-0.5 tabular-nums">
        {n}
      </span>
      <div className="min-w-0">
        <p className="text-white text-sm font-medium">{title}</p>
        <div className="text-[#777] text-sm mt-1 leading-relaxed">{children}</div>
      </div>
    </li>
  );
}

function Recipe({ title, blurb, steps, defaultOpen = false }: {
  title: string; blurb: string; steps: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={CARD}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="w-full flex items-start gap-3 text-left p-5 cursor-pointer"
      >
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium">{title}</p>
          <p className="text-[#666] text-xs mt-0.5">{blurb}</p>
        </div>
        <ChevronDown
          size={16}
          className={`text-[#555] flex-shrink-0 mt-0.5 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && <ol className="px-5 pb-5 space-y-4 border-t border-[#1a1a1a] pt-5">{steps}</ol>}
    </div>
  );
}

const L = ({ to, children }: { to: string; children: React.ReactNode }) => (
  <Link to={to} className="text-[#059669] hover:underline underline-offset-2">{children}</Link>
);

export default function AdminHelp() {
  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">How everything works</h1>
        <p className="text-[#555] text-sm mt-1">
          Nothing here can break the site permanently — every change is recorded and can be put back.
        </p>
      </div>

      {/* The one idea that unlocks everything else */}
      <section className={`${CARD} p-6 border-[#059669]/25 bg-[#059669]/[0.04]`}>
        <div className="flex items-start gap-3">
          <MousePointerClick size={18} className="text-[#059669] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-white font-medium">There are two ways to change things</p>
            <p className="text-[#999] text-sm mt-2 leading-relaxed">
              <strong className="text-white">On the site itself.</strong> Open any page while logged in and
              use the floating button at the bottom right to turn on edit mode. Every text you can change
              gets a dotted outline — click it, type, save. This is the fastest way to fix a word, a
              heading or a paragraph, and it works on pages you build too.
            </p>
            <p className="text-[#999] text-sm mt-3 leading-relaxed">
              <strong className="text-white">From this panel.</strong> For anything with structure — an
              event, a DJ, a form, a whole new page.
            </p>
          </div>
        </div>
      </section>

      {/* Where things live */}
      <section className="space-y-3">
        <h2 className="text-white text-sm font-medium">Where things live</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { icon: LayoutDashboard, title: 'Content',
              body: <>Everything the public reads: <L to="/admin/events">Events</L>, <L to="/admin/djs">DJs</L>, <L to="/admin/artists">Artists</L> and your own <L to="/admin/pages">Pages</L>.</> },
            { icon: Inbox, title: 'People writing in',
              body: <>Answers land in <L to="/admin/submissions">Submissions</L>. Build and edit the questions in <L to="/admin/form-builder">Forms</L>.</> },
            { icon: Paintbrush, title: 'Look & navigation',
              body: <>Colour and typeface in <L to="/admin/appearance">Appearance</L>. Links in <L to="/admin/navigation">Menu</L>, <L to="/admin/navigation?tab=footer">Footer</L> and <L to="/admin/navigation?tab=social">Social links</L>.</> },
            { icon: Settings, title: 'Settings',
              body: <><L to="/admin/settings?tab=seo">Google &amp; sharing</L>, <L to="/admin/settings?tab=categories">Artist categories</L>, <L to="/admin/legal">Legal pages</L> and <L to="/admin/history">Change history</L>.</> },
          ].map(g => (
            <div key={g.title} className={`${CARD} p-5`}>
              <div className="flex items-center gap-2.5 mb-2">
                <g.icon size={15} className="text-[#666]" />
                <p className="text-white text-sm font-medium">{g.title}</p>
              </div>
              <p className="text-[#777] text-sm leading-relaxed">{g.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Recipes */}
      <section className="space-y-3">
        <h2 className="text-white text-sm font-medium">How to do the usual things</h2>

        <Recipe
          defaultOpen
          title="Build a page and put it in the menu"
          blurb="Text, photos, video, buttons — and you can keep editing it live afterwards"
          steps={<>
            <Step n={1} title="Create it">
              <L to="/admin/pages">Pages</L> → <strong className="text-[#aaa]">New page</strong>. Give it a
              name; the web address is filled in for you.
            </Step>
            <Step n={2} title="Add content">
              Add blocks in any order: text, photo, gallery, video, buttons or one of your forms. The eye
              icon hides a block without deleting it, and the arrows move it.
            </Step>
            <Step n={3} title="Decide how photos are framed">
              On a photo block, pick a frame shape and whether the image fills it (cropping the edges) or
              is shown whole. "Keep in view" moves the crop, so a face near the top is not cut off.
            </Step>
            <Step n={4} title="Publish it">
              Tick <strong className="text-[#aaa]">Published</strong>, then{' '}
              <strong className="text-[#aaa]">Show in the menu</strong>. Until you publish it, only you
              can see it — that is your preview, no special link needed.
            </Step>
            <Step n={5} title="Edit it live from then on">
              Open the page on the site, turn on edit mode and click any heading or paragraph. You do not
              need to come back here for wording.
            </Step>
          </>}
        />

        <Recipe
          title="A form only for artists (or DJs)"
          blurb="And point a page's button at it"
          steps={<>
            <Step n={1} title="Pick or create the form">
              <L to="/admin/form-builder">Forms</L> → choose <strong className="text-[#aaa]">Artists application</strong>,
              or <strong className="text-[#aaa]">New form</strong> for something else.
            </Step>
            <Step n={2} title="Write the questions">
              <strong className="text-[#aaa]">Add question</strong> and choose a type. Use{' '}
              <strong className="text-[#aaa]">Yes / No</strong> for things like “I agree to receive
              emails” — what was agreed and when is stored with the answer.
            </Step>
            <Step n={3} title="Say where it appears">
              In <strong className="text-[#aaa]">Appears in</strong>, tick a page. That page's button now
              opens this form instead of the general one.
            </Step>
            <Step n={4} title="Read the answers">
              They arrive in <L to="/admin/submissions">Submissions</L>, filtered by form and exportable
              to a spreadsheet.
            </Step>
          </>}
        />

        <Recipe
          title="Send emails to Mailchimp"
          blurb="You set it up yourself, and you can switch provider whenever you like"
          steps={<>
            <Step n={1} title="Copy the address from Mailchimp">
              In Mailchimp: <em>Audience → Signup forms → Embedded form</em>. Copy the address inside{' '}
              <code className="text-amber-400/80 text-xs">form action="…"</code>.
            </Step>
            <Step n={2} title="Paste it here">
              <L to="/admin/form-builder">Forms</L> → the form →{' '}
              <strong className="text-[#aaa]">Send to your mailing list</strong>.
            </Step>
            <Step n={3} title="That is it">
              Every answer is saved here first, so nothing is lost if the address is wrong or Mailchimp is
              down. Brevo, MailerLite and ConvertKit work the same way — paste their address instead.
            </Step>
          </>}
        />

        <Recipe
          title="Add Instagram, or any social link"
          blurb="Shows in the footer and in the phone menu at once"
          steps={<>
            <Step n={1} title="Open Social links">
              <L to="/admin/navigation?tab=social">Social links</L>.
            </Step>
            <Step n={2} title="Add it">
              Pick the platform, paste the address, press Add. Done — it appears everywhere immediately.
            </Step>
          </>}
        />

        <Recipe
          title="Change the colours or the typeface"
          blurb="Applies to the whole site, including the animated background"
          steps={<>
            <Step n={1} title="Open Appearance">
              <L to="/admin/appearance">Appearance</L>. Start from one of the three presets if you are unsure.
            </Step>
            <Step n={2} title="Watch the contrast number">
              Below 4.5 small text becomes hard to read. The preview underneath shows a real heading, a
              button and a link in your colours.
            </Step>
            <Step n={3} title="Save">
              Nothing changes for visitors until you press Save.
            </Step>
          </>}
        />

        <Recipe
          title="Reorder DJs or artists"
          blurb="Decide who appears first"
          steps={<>
            <Step n={1} title="Open the list">
              <L to="/admin/djs">DJs</L> or <L to="/admin/artists">Artists</L>.
            </Step>
            <Step n={2} title="Use the arrows">
              The arrows on the left of each row move it up or down. The public grid follows the same
              order. Clear the search box first — you cannot reorder a filtered list.
            </Step>
          </>}
        />

        <Recipe
          title="Add a donation button"
          blurb="No payment setup needed"
          steps={<>
            <Step n={1} title="Add a Buttons block">
              Inside any page, add a <strong className="text-[#aaa]">Buttons</strong> block.
            </Step>
            <Step n={2} title="Paste your link">
              Your PayPal.me, Ko-fi or Stripe payment link. Tick "Loud" to make it the big filled button.
            </Step>
          </>}
        />
      </section>

      {/* Safety */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { icon: Undo2, title: 'Nothing is lost',
            body: <>Every edit is recorded. Inside an event, DJ, artist or page, the clock icon shows older versions and puts one back. Everything at once in <L to="/admin/history">Change history</L>.</> },
          { icon: EyeOff, title: 'Draft means private',
            body: <>A draft page or event is invisible to visitors and fully visible to you while logged in. That is your preview.</> },
          { icon: Sparkles, title: 'Photos are optimised',
            body: <>Every image you upload is converted and resized automatically. You do not need to prepare them first.</> },
        ].map(c => (
          <div key={c.title} className={`${CARD} p-5`}>
            <div className="flex items-center gap-2.5 mb-2">
              <c.icon size={15} className="text-[#666]" />
              <p className="text-white text-sm font-medium">{c.title}</p>
            </div>
            <p className="text-[#777] text-sm leading-relaxed">{c.body}</p>
          </div>
        ))}
      </section>

      <section className={`${CARD} p-5`}>
        <div className="flex items-start gap-3">
          <Ban size={16} className="text-[#555] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-white text-sm font-medium">What you cannot change here, on purpose</p>
            <p className="text-[#777] text-sm mt-1.5 leading-relaxed">
              The rotating logo, the animation timings, the grain texture, the 404 drawing and the
              “By Alia Studio” credit. These are not oversights — a panel with a control for every single
              thing becomes impossible to use. If you want one of them changed, just ask.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
