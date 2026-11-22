-- Comprobación de seguridad de las integraciones.
--
--   Ejecutar en el SQL editor de Supabase. Toda fila debe decir PASS.
--
-- Por qué existe: la clave de Resend vive en la base de datos, y lo único que
-- la separa de internet son estas cuatro cosas. Un `grant` de más en una
-- migración futura no daría ningún error — simplemente publicaría la clave.
-- Esto lo convierte en algo que se puede volver a mirar en diez segundos.
--
-- El fallo que ya ocurrió una vez, y por el que la comprobación 2 es la más
-- importante: Postgres concede EXECUTE a PUBLIC en cada función nueva.
-- `revoke ... from anon` parece que funciona y no hace nada, porque anon
-- hereda el permiso de PUBLIC.

with checks as (

  -- 1 · La tabla tiene RLS y toda política exige ser admin. "authenticated"
  --     no basta: cualquiera con una cuenta lo es.
  select
    '1· integration_settings solo para admins' as comprobacion,
    (
      (select relrowsecurity from pg_class where oid = 'public.integration_settings'::regclass)
      and not exists (
        select 1 from pg_policies
        where schemaname = 'public' and tablename = 'integration_settings'
          and coalesce(qual, '') || coalesce(with_check, '') not like '%is_admin()%'
      )
    ) as pasa

  union all

  -- 2 · Ninguna función de integración es ejecutable por PUBLIC ni por anon.
  select
    '2· funciones no ejecutables por PUBLIC/anon',
    not exists (
      select 1
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
      where n.nspname = 'public'
        and p.proname in (
          'get_integration', 'save_integration', 'clear_integration_secret',
          'send_notification_email', 'test_notification', 'notification_result')
        and a.privilege_type = 'EXECUTE'
        and (a.grantee = 0 or pg_get_userbyid(a.grantee) = 'anon')   -- 0 = PUBLIC
    )

  union all

  -- 3 · Las funciones que leen el secreto fijan search_path.
  --     Sin esto, SECURITY DEFINER se puede secuestrar con un esquema falso.
  select
    '3· SECURITY DEFINER con search_path fijado',
    not exists (
      select 1 from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.prosecdef
        and p.proname in (
          'get_integration', 'save_integration', 'clear_integration_secret',
          'send_notification_email', 'test_notification', 'notification_result',
          'notify_new_submission', 'is_admin', 'log_audit_changes')
        and (p.proconfig is null or not exists (
          select 1 from unnest(p.proconfig) c where c like 'search_path=%'))
    )

  union all

  -- 4 · El aviso sigue enganchado al formulario público.
  select
    '4· disparador de aviso activo en form_submissions',
    exists (
      select 1 from pg_trigger
      where tgrelid = 'public.form_submissions'::regclass
        and tgname = 'trg_notify_new_submission'
        and not tgisinternal
    )

  union all

  -- 5 · El formulario entra por /api/submit (captcha comprobado en el
  --     servidor), no por un INSERT directo. FAIL hasta aplicar la migración
  --     20261012120100. Si la web deja de recoger solicitudes, mirar primero
  --     SUPABASE_SERVICE_ROLE_KEY en Vercel, no reabrir esta política.
  select
    '5· form_submissions sin INSERT directo para visitantes',
    not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = 'form_submissions'
        and cmd in ('INSERT', 'ALL')
        and roles && array['public', 'anon']::name[]
        -- Una política FOR ALL de admins (sin TO, así que roles = public)
        -- no abre nada a visitantes.
        and coalesce(qual, '') || coalesce(with_check, '') not like '%is_admin()%'
    )
    and not has_table_privilege('anon', 'public.form_submissions', 'INSERT')

  union all

  -- 6 · Ninguna política autoriza por "tener sesión" sin pasar por is_admin().
  select
    '6· ninguna política de public/storage abre a cualquier authenticated',
    not exists (
      select 1 from pg_policies
      where schemaname in ('public', 'storage')
        and coalesce(qual, '') || coalesce(with_check, '') not like '%is_admin()%'
        and (
          coalesce(qual, '') || ' ' || coalesce(with_check, '')
            ~* 'auth\.role\(\)(\s+as\s+\w+\))?\s*=\s*''authenticated'''
          or coalesce(qual, '') || ' ' || coalesce(with_check, '')
            ~* 'auth\.uid\(\)(\s+as\s+\w+\))?\s+is\s+not\s+null'
          or roles = '{authenticated}'::name[]
        )
    )

  union all

  -- 7 · Las RPC del panel comprueban is_admin() dentro.
  select
    '7· RPC del panel solo para admins',
    not exists (
      select 1 from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname in (
          'get_integration', 'save_integration', 'clear_integration_secret',
          'test_notification', 'notification_result')
        and p.prosrc not like '%is_admin()%'
    )

  union all

  -- 8 · La función de auditoría no se puede llamar por RPC.
  select
    '8· log_audit_changes no ejecutable por public/anon/authenticated',
    not exists (
      select 1
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
      where n.nspname = 'public' and p.proname = 'log_audit_changes'
        and a.privilege_type = 'EXECUTE'
        and (a.grantee = 0 or pg_get_userbyid(a.grantee) in ('anon', 'authenticated'))
    )

  union all

  -- 9 · Ninguna tabla de public sin RLS (sin ella, anon lo lee todo).
  select
    '9· RLS activada en todas las tablas de public',
    not exists (
      select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
    )

  union all

  -- 10 · Hay al menos un admin; si no, nadie entra al panel.
  select
    '10· public.admins tiene al menos una persona',
    exists (select 1 from public.admins)

  union all

  -- 11 · Nadie más llama a las RPC del panel. Desde un disparador o desde
  --      otra función no hay sesión de admin: darían 'forbidden' y, si es el
  --      aviso del formulario, se perdería cada envío.
  select
    '11· ninguna otra función llama a las RPC del panel',
    not exists (
      select 1 from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname not in ('pg_catalog', 'information_schema')
        and not (n.nspname = 'public' and p.proname in (
          'get_integration', 'save_integration', 'clear_integration_secret',
          'test_notification', 'notification_result'))
        and coalesce(p.prosrc, '')
          ~* '\m(get_integration|save_integration|clear_integration_secret|test_notification|notification_result)\s*\('
    )
)
select comprobacion, case when pasa then 'PASS' else 'FAIL ❌' end as resultado
from checks
order by comprobacion;
