import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';

// ── Lazy-loaded public pages ────────────────────────────────────
const App         = lazy(() => import('./App'));
const Form        = lazy(() => import('./Form'));
const PastEvents  = lazy(() => import('./PastEvents'));
const EventDetail = lazy(() => import('./EventDetail'));
const DJs         = lazy(() => import('./DJs'));
const Artists     = lazy(() => import('./Artists'));

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
const AdminVisualEditor  = lazy(() => import('./admin/AdminVisualEditor'));

// ── Auth wrapper (lazy) ─────────────────────────────────────────
const ProtectedRoute = lazy(() => import('./components/ProtectedRoute'));

// ── Full-screen spinner shown during lazy chunk load ───────────
function PageLoader() {
  return (
    <div className="min-h-screen bg-[#050000] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#C42121] border-t-transparent rounded-full animate-spin" />
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

// ── Router ─────────────────────────────────────────────────────
export default function AppRouter() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>

        {/* ── PUBLIC ── */}
        <Route path="/"                     element={<App />} />
        <Route path="/form"                 element={<Form />} />
        <Route path="/past-events"          element={<PastEvents />} />
        <Route path="/past-events/:eventId" element={<EventDetail />} />
        <Route path="/djs"                  element={<DJs />} />
        <Route path="/artists"              element={<Artists />} />

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
        <Route path="/admin/visual-editor"   element={<AdminPage><AdminVisualEditor /></AdminPage>} />

      </Routes>
    </Suspense>
  );
}
