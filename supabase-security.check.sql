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

  -- 1 · La tabla tiene RLS y NINGUNA política para anónimos.
  select
    '1· integration_settings sin acceso anónimo' as comprobacion,
    (
      (select relrowsecurity from pg_class where oid = 'public.integration_settings'::regclass)
      and not exists (
        select 1 from pg_policies
        where schemaname = 'public' and tablename = 'integration_settings'
          and qual not like '%authenticated%'
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
        and pg_get_userbyid(a.grantee) in ('public', 'anon')
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
          'notify_new_submission')
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

  -- 5 · Y el formulario público sigue pudiendo escribir: si esto falla,
  --     la web deja de recoger solicitudes.
  select
    '5· los visitantes siguen pudiendo enviar el formulario',
    exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = 'form_submissions'
        and cmd = 'INSERT' and with_check = 'true'
    )
)
select comprobacion, case when pasa then 'PASS' else 'FAIL ❌' end as resultado
from checks
order by comprobacion;
