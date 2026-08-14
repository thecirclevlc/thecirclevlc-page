import React, { Suspense, lazy, useLayoutEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import { useSiteTheme } from './hooks/useSiteTheme';

// ── Lazy-loaded public pages ────────────────────────────────────
const App         = lazy(() => import('./App'));
const Form        = lazy(() => import('./Form'));
const PastEvents  = lazy(() => import('./PastEvents'));
const EventDetail = lazy(() => import('./EventDetail'));
const DJs         = lazy(() => import('./DJs'));
const Artists     = lazy(() => import('./Artists'));
const Terms       = lazy(() => import('./Terms'));
const Privacy     = lazy(() => import('./Privacy'));
const NotFound    = lazy(() => import('./NotFound'));
const DynamicPage = lazy(() => import('./DynamicPage'));
const ProfileDetail = lazy(() => import('./ProfileDetail'));

// ── Lazy-loaded admin pages ─────────────────────────────────────
const AdminLogin        = lazy(() => import('./admin/AdminLogin'));
const AdminLayout       = lazy(() => import('./admin/AdminLayout'));
const AdminDashboard    = lazy(() => import('./admin/AdminDashboard'));
const AdminEvents       = lazy(() => import('./admin/AdminEvents'));
const AdminEventForm    = lazy(() => import('./admin/AdminEventForm'));
const AdminDJs          = lazy(() => import('./admin/AdminDJs'));
const AdminDJForm       = lazy(() => import('./admin/AdminDJForm'));
const AdminArtists      = lazy(() => import('./admin/AdminArtists'));
const AdminArtistForm   = lazy(() => import('./admin/AdminArtistForm'));
const AdminSiteSettings  = lazy(() => import('./admin/AdminSiteSettings'));
const AdminNavigation    = lazy(() => import('./admin/AdminNavigation'));
const AdminLegal         = lazy(() => import('./admin/AdminLegal'));
const AdminFormBuilder   = lazy(() => import('./admin/AdminFormBuilder'));
const AdminSubmissions   = lazy(() => import('./admin/AdminSubmissions'));
const AdminAppearance    = lazy(() => import('./admin/AdminAppearance'));
const AdminHelp          = lazy(() => import('./admin/AdminHelp'));
const AdminHistoryPage   = lazy(() => import('./admin/AdminHistoryPage'));
const AdminPages         = lazy(() => import('./admin/AdminPages'));
const AdminHome          = lazy(() => import('./admin/AdminHome'));
const AdminNotifications = lazy(() => import('./admin/AdminNotifications'));
const AdminPageForm      = lazy(() => import('./admin/AdminPageForm'));

// ── Auth wrapper (lazy) ─────────────────────────────────────────
const ProtectedRoute = lazy(() => import('./components/ProtectedRoute'));

// ── Full-screen spinner shown during lazy chunk load ───────────
function PageLoader() {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// ── Helper: wrap a page in AdminLayout + auth ──────────────────
function AdminPage({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <AdminLayout>{children}</AdminLayout>
    </ProtectedRoute>
  );
}

/**
 * Toda navegación empieza arriba de la página nueva.
 *
 * El fallo que arregla: pulsar "Privacy Policy" en el pie te dejaba al final
 * de la página de privacidad. Cada enlace hacía `window.scrollTo(0, 0)` y
 * navegaba 50 ms después — pero `index.css` pone `scroll-behavior: smooth`
 * en html Y en `*`, así que ese scroll no es un salto sino una animación de
 * medio segundo. A los 50 ms iba por la mitad, la página cambiaba debajo, y
 * te quedabas donde estuvieras. Desde el pie, eso es el fondo.
 *
 * `behavior: 'instant'` ignora el CSS a propósito, y `useLayoutEffect` lo
 * hace antes de pintar, así que no se ve el salto.
 *
 * Global, no enlace por enlace: había 21 sitios navegando y 3 sin acordarse
 * de subir. Aquí se arregla una vez y vale para las páginas que ella cree
 * mañana, que es lo que pidió — "que no pase en ninguna página".
 */
function ScrollToTop() {
  const { pathname } = useLocation();
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname]);
  return null;
}

// ── Router ─────────────────────────────────────────────────────
export default function AppRouter() {
  // Mounted here, not in App.tsx, so the admin's colours apply on EVERY
  // route. Previously only the home page ever read the theme.
  useSiteTheme();

  return (
    <>
    <ScrollToTop />
    <Analytics />
    <Suspense fallback={<PageLoader />}>
      <Routes>

        {/* ── PUBLIC ── */}
        <Route path="/"                     element={<App />} />
        <Route path="/form"                 element={<Form />} />
        <Route path="/form/:slug"           element={<Form />} />
        <Route path="/past-events"          element={<PastEvents />} />
        <Route path="/past-events/:eventId" element={<EventDetail />} />
        <Route path="/djs"                  element={<DJs />} />
        <Route path="/djs/:slug"            element={<ProfileDetail type="dj" />} />
        <Route path="/artists"              element={<Artists />} />
        <Route path="/artists/:slug"        element={<ProfileDetail type="artist" />} />
        <Route path="/terms"                element={<Terms />} />
        <Route path="/privacy"              element={<Privacy />} />

        {/* ── ADMIN AUTH ── */}
        <Route path="/admin/login" element={<AdminLogin />} />

        {/* ── ADMIN (protected) ── */}
        <Route path="/admin"              element={<AdminPage><AdminDashboard /></AdminPage>} />
        <Route path="/admin/events"       element={<AdminPage><AdminEvents /></AdminPage>} />
        <Route path="/admin/events/new"   element={<AdminPage><AdminEventForm /></AdminPage>} />
        <Route path="/admin/events/:id"   element={<AdminPage><AdminEventForm /></AdminPage>} />
        <Route path="/admin/djs"          element={<AdminPage><AdminDJs /></AdminPage>} />
        <Route path="/admin/djs/new"      element={<AdminPage><AdminDJForm /></AdminPage>} />
        <Route path="/admin/djs/:id"      element={<AdminPage><AdminDJForm /></AdminPage>} />
        <Route path="/admin/artists"      element={<AdminPage><AdminArtists /></AdminPage>} />
        <Route path="/admin/artists/new"  element={<AdminPage><AdminArtistForm /></AdminPage>} />
        <Route path="/admin/artists/:id"  element={<AdminPage><AdminArtistForm /></AdminPage>} />
        <Route path="/admin/settings"        element={<AdminPage><AdminSiteSettings /></AdminPage>} />
        <Route path="/admin/appearance"      element={<AdminPage><AdminAppearance /></AdminPage>} />
        {/* Legacy path — the toolbar and old bookmarks still point here. */}
        <Route path="/admin/visual-editor"   element={<AdminPage><AdminAppearance /></AdminPage>} />
        <Route path="/admin/navigation"      element={<AdminPage><AdminNavigation /></AdminPage>} />
        <Route path="/admin/legal"           element={<AdminPage><AdminLegal /></AdminPage>} />
        <Route path="/admin/form-builder"    element={<AdminPage><AdminFormBuilder /></AdminPage>} />
        <Route path="/admin/submissions"     element={<AdminPage><AdminSubmissions /></AdminPage>} />
        <Route path="/admin/notifications"   element={<AdminPage><AdminNotifications /></AdminPage>} />
        <Route path="/admin/help"            element={<AdminPage><AdminHelp /></AdminPage>} />
        <Route path="/admin/history"         element={<AdminPage><AdminHistoryPage /></AdminPage>} />
        <Route path="/admin/home"            element={<AdminPage><AdminHome /></AdminPage>} />
        <Route path="/admin/pages"           element={<AdminPage><AdminPages /></AdminPage>} />
        <Route path="/admin/pages/:id"       element={<AdminPage><AdminPageForm /></AdminPage>} />

        {/* ── ADMIN-CREATED PAGES ──
            Last but one. React Router ranks static segments above dynamic
            ones, so every route above still wins; this only catches
            single-segment addresses nothing else claims. Reserved slugs are
            also blocked by a CHECK on the table. */}
        <Route path="/:slug" element={<DynamicPage />} />

        {/* ── 404 CATCH-ALL ── */}
        <Route path="*" element={<NotFound />} />

      </Routes>
    </Suspense>
    </>
  );
}
