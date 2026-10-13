-- =====================================================================
-- 20261012120000_admins_is_admin.sql
--
-- QUÉ HACE
--   1. Crea public.admins (lista de usuarios con acceso al panel) y
--      public.is_admin(), SECURITY DEFINER con search_path = ''.
--   2. Recorre TODAS las políticas de los esquemas public y storage que
--      autorizan por "tener sesión" — auth.role() = 'authenticated',
--      auth.uid() IS NOT NULL o TO authenticated — y les antepone
--      (SELECT public.is_admin()). No se escriben nombres de políticas a mano
--      porque varias tablas (site_settings, pages, images, event_djs,
--      event_artists, artist_categories, integration_settings) no están en
--      supabase-schema.sql. Las lecturas públicas (TO public sin esas
--      condiciones) no se tocan.
--   3. Añade "if not public.is_admin() then raise" al principio de las RPC
--      del panel: get_integration, save_integration, clear_integration_secret,
--      test_notification y notification_result. NO toca
--      send_notification_email ni notify_new_submission, que corren en el
--      camino del formulario público.
--   4. log_audit_changes(): nombres cualificados + search_path = '' y sin
--      EXECUTE para public/anon/authenticated (los triggers siguen
--      funcionando). update_updated_at_column(): search_path = ''.
--   Lo que cambia queda copiado en public._backup_20261012 para revertir.
--   Antes de cambiar nada se para (sin tocar nada) si admins está vacía, si
--   otra función llama a las RPC del bloque 3 o si una política abierta al
--   público mezcla la sesión con OR.
--
-- PRERREQUISITOS (en este orden)
--   a) Registro desactivado: Authentication → Sign In / Providers →
--      "Allow new users to sign up" = off.
--   b) Leer en producción, solo con SELECT, lo que se va a cambiar. Una rama
--      de Supabase no sirve: se crea desde supabase/migrations, que solo
--      tiene estos dos archivos, sin las tablas, políticas ni funciones vivas.
--        select schemaname, tablename, policyname, roles, cmd, qual, with_check
--        from pg_policies where schemaname in ('public', 'storage') order by 1, 2, 3;
--        select p.proname, pg_get_functiondef(p.oid) from pg_proc p
--        join pg_namespace n on n.oid = p.pronamespace
--        where n.nspname = 'public' and p.proname in ('notify_new_submission',
--          'send_notification_email', 'get_integration', 'save_integration',
--          'clear_integration_secret', 'test_notification', 'notification_result');
--        select jobname, command from cron.job;   -- solo si pg_cron está activo
--      Ningún disparador, función ni cron debe llamar a las cinco RPC del
--      bloque 3, y ninguna política TO public debe ser "x OR sesión". La
--      parada de abajo es la segunda red, no la primera.
--   c) Comparar la función viva con la del repo:
--        select pg_get_functiondef('public.log_audit_changes()'::regprocedure);
--      Si no coincide con supabase-schema.sql, ajustar el bloque 4.
--   d) Rellenar el bloque SEED con el user_id de la clienta:
--        select id, email, created_at from auth.users order by created_at;
--      Sin él la migración se para antes de tocar ninguna política.
--
-- CÓMO VERIFICAR
--   - supabase-security.check.sql: todas las filas PASS (la 5 solo tras la
--     migración 20261012120100).
--   - Con el usuario de prueba no admin: select de form_submissions → 0 filas;
--     update de events → 0 filas; rpc('get_integration') → error forbidden.
--   - La clienta entra en /admin, edita, ve candidaturas y "Enviar prueba".
--   - La web pública sigue cargando sin sesión.
--
-- CÓMO REVERTIR
--   do $$ declare b record; begin
--     for b in select * from public._backup_20261012 where kind = 'policy' loop
--       execute format('alter policy %I on %I.%I', b.name, b.schemaname, b.tablename)
--         || coalesce(' using (' || b.qual || ')', '')
--         || coalesce(' with check (' || b.with_check || ')', '');
--     end loop;
--     for b in select * from public._backup_20261012 where kind = 'function' loop
--       execute b.definition;
--     end loop;
--   end $$;
--   (log_audit_changes vuelve a su versión con la sección del schema.)
--   Después: drop function public.is_admin(); drop table public.admins;
--   drop table public._backup_20261012;
-- =====================================================================


-- ── 1 · admins + is_admin() ──────────────────────────────────────────
create table if not exists public.admins (
  user_id    uuid        primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Sin políticas: nadie la lee ni la escribe por la API. Solo is_admin()
-- (SECURITY DEFINER) y el SQL editor.
alter table public.admins enable row level security;
revoke all on public.admins from anon, authenticated;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admins where user_id = (select auth.uid())
  );
$$;

-- anon también la necesita: las políticas FOR ALL ... TO public se evalúan
-- en cada lectura anónima, y sin EXECUTE la web pública daría error.
revoke execute on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated, service_role;


-- ── SEED (obligatorio) ───────────────────────────────────────────────
-- Sustituir el valor por el id real de la clienta (y añadir otra fila por
-- cada persona que deba entrar al panel).
--
-- insert into public.admins (user_id) values
--   ('00000000-0000-0000-0000-000000000000')   -- <user_id de la clienta>
-- on conflict do nothing;

do $$
begin
  if not exists (select 1 from public.admins) then
    raise exception 'public.admins está vacía: rellena el bloque SEED antes de aplicar. No se ha tocado ninguna política.';
  end if;
end $$;

-- Dos casos que el bloque 2 y el 3 romperían sin avisar:
--   a) Otra función llama a una de las RPC del bloque 3 (p. ej. el disparador
--      notify_new_submission): sin sesión de admin daría 'forbidden' y cada
--      envío del formulario fallaría. pg_cron no se mira aquí (ver
--      PRERREQUISITOS b).
--   b) Una política abierta al público con OR (status = 'published' OR
--      auth.role() = 'authenticated') quedaría is_admin() AND (…) y el
--      público perdería esa lectura. Las TO authenticated no se paran: pasar
--      a "solo admins" es justo lo que se busca, y con el registro
--      desactivado no hay otros usuarios.
do $$
declare
  callers  text;
  or_rules text;
begin
  select string_agg(p.oid::regprocedure::text, ', ') into callers
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname not in ('pg_catalog', 'information_schema')
    and not (n.nspname = 'public' and p.proname in ('get_integration', 'save_integration',
             'clear_integration_secret', 'test_notification', 'notification_result'))
    and coalesce(p.prosrc, '')
      ~* '\m(get_integration|save_integration|clear_integration_secret|test_notification|notification_result)\s*\(';

  select string_agg(format('%s.%s · %s', schemaname, tablename, policyname), ', ') into or_rules
  from pg_policies
  where schemaname in ('public', 'storage')
    and roles && array['public', 'anon']::name[]
    and (
      coalesce(qual, '') || ' ' || coalesce(with_check, '')
        ~* 'auth\.role\(\)(\s+as\s+\w+\))?\s*=\s*''authenticated'''
      or coalesce(qual, '') || ' ' || coalesce(with_check, '')
        ~* 'auth\.uid\(\)(\s+as\s+\w+\))?\s+is\s+not\s+null'
    )
    and coalesce(qual, '') || coalesce(with_check, '') not like '%is_admin()%'
    and coalesce(qual, '') || ' ' || coalesce(with_check, '') ~* '\mor\M';

  if callers is not null or or_rules is not null then
    raise exception E'Parada: no se ha tocado ninguna política ni función.\n  Funciones que llaman a las RPC del panel: %\n  Políticas abiertas al público con OR: %\nCorrígelas a mano (o adapta esta migración) antes de aplicar.',
      coalesce(callers, '-'), coalesce(or_rules, '-');
  end if;
end $$;


-- ── Copia de lo que se cambia ────────────────────────────────────────
create table if not exists public._backup_20261012 (
  kind       text        not null,   -- 'policy' | 'function'
  schemaname text,
  tablename  text,
  name       text        not null,
  qual       text,
  with_check text,
  definition text,
  saved_at   timestamptz not null default now()
);
alter table public._backup_20261012 enable row level security;
revoke all on public._backup_20261012 from anon, authenticated;


-- ── 2 · Políticas: "tener sesión" pasa a ser "estar en admins" ───────
do $$
declare
  p   record;
  cmd text;
begin
  for p in
    select schemaname, tablename, policyname, roles, qual, with_check
    from pg_policies
    where schemaname in ('public', 'storage')
      and (
        coalesce(qual, '') || ' ' || coalesce(with_check, '')
          ~* 'auth\.role\(\)(\s+as\s+\w+\))?\s*=\s*''authenticated'''
        or coalesce(qual, '') || ' ' || coalesce(with_check, '')
          ~* 'auth\.uid\(\)(\s+as\s+\w+\))?\s+is\s+not\s+null'
        or roles = '{authenticated}'::name[]
      )
      and coalesce(qual, '') || coalesce(with_check, '') not like '%is_admin()%'
  loop
    continue when p.qual is null and p.with_check is null;

    insert into public._backup_20261012 (kind, schemaname, tablename, name, qual, with_check)
    values ('policy', p.schemaname, p.tablename, p.policyname, p.qual, p.with_check);

    cmd := format('alter policy %I on %I.%I', p.policyname, p.schemaname, p.tablename);
    if p.qual is not null then
      cmd := cmd || format(' using ((select public.is_admin()) and (%s))', p.qual);
    end if;
    if p.with_check is not null then
      cmd := cmd || format(' with check ((select public.is_admin()) and (%s))', p.with_check);
    end if;

    execute cmd;
    raise notice 'política: %.% · %', p.schemaname, p.tablename, p.policyname;
  end loop;
end $$;


-- ── 3 · RPC del panel: solo admins ───────────────────────────────────
do $$
declare
  f       record;
  def     text;
  patched text;
begin
  for f in
    select p.oid, p.proname, l.lanname
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    join pg_language  l on l.oid = p.prolang
    where n.nspname = 'public'
      and p.proname in ('get_integration', 'save_integration', 'clear_integration_secret',
                        'test_notification', 'notification_result')
  loop
    def := pg_get_functiondef(f.oid);
    continue when def like '%is_admin()%';

    if f.lanname <> 'plpgsql' then
      raise exception 'La función % es %, no plpgsql: añade la comprobación a mano.', f.proname, f.lanname;
    end if;

    -- El primer BEGIN de la definición es el del cuerpo: la cabecera de
    -- pg_get_functiondef no lo contiene y DECLARE no puede contenerlo.
    patched := regexp_replace(def, '\mbegin\M',
      E'begin\n  if not public.is_admin() then\n    raise exception ''forbidden'' using errcode = ''42501'';\n  end if;',
      'i');
    if patched = def then
      raise exception 'No encuentro el BEGIN de %: revísala a mano.', f.proname;
    end if;

    insert into public._backup_20261012 (kind, name, definition)
    values ('function', f.oid::regprocedure::text, def);

    execute patched;
    raise notice 'rpc: %', f.oid::regprocedure;
  end loop;
end $$;

-- send_notification_email solo debe llamarse desde dentro de la base. Si las
-- dos funciones que la usan son SECURITY DEFINER, authenticated no la necesita.
do $$
declare
  f record;
begin
  if (select bool_and(p.prosecdef) from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname in ('test_notification', 'notify_new_submission'))
  then
    for f in
      select p.oid from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = 'send_notification_email'
    loop
      execute format('revoke execute on function %s from public, anon, authenticated', f.oid::regprocedure);
    end loop;
  end if;
end $$;


-- ── 4 · Funciones de trigger ─────────────────────────────────────────
-- Misma lógica que supabase-schema.sql, con nombres cualificados para que
-- funcione con search_path vacío.
create or replace function public.log_audit_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row_id text;
  v_user   uuid;
  v_old    jsonb;
  v_new    jsonb;
begin
  begin
    v_user := auth.uid();
  exception when others then
    v_user := null;
  end;

  if tg_op = 'UPDATE' then
    v_old := to_jsonb(old) - 'updated_at';
    v_new := to_jsonb(new) - 'updated_at';
    if v_old = v_new then
      return new;
    end if;

    v_row_id := coalesce((to_jsonb(new)->>'id'), (to_jsonb(old)->>'id'));
    insert into public.audit_log(table_name, row_id, operation, old_data, new_data, changed_by)
    values (tg_table_name, v_row_id, 'UPDATE', to_jsonb(old), to_jsonb(new), v_user);
    return new;

  elsif tg_op = 'DELETE' then
    v_row_id := (to_jsonb(old)->>'id');
    if v_row_id is null then
      v_row_id := coalesce(
        (to_jsonb(old)->>'event_id') || ':' || coalesce(
          (to_jsonb(old)->>'dj_id'),
          (to_jsonb(old)->>'artist_id'),
          ''
        ),
        tg_table_name
      );
    end if;
    insert into public.audit_log(table_name, row_id, operation, old_data, new_data, changed_by)
    values (tg_table_name, v_row_id, 'DELETE', to_jsonb(old), null, v_user);
    return old;
  end if;

  return null;
end;
$$;

revoke execute on function public.log_audit_changes() from public, anon, authenticated;

alter function public.update_updated_at_column() set search_path = '';
