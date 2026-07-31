CREATE OR REPLACE FUNCTION private.is_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin'); $$;

REVOKE ALL ON FUNCTION private.is_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_admin(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'trainer'); $$;

CREATE OR REPLACE FUNCTION private.can_view_all(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('trainer','placement')); $$;

DROP POLICY IF EXISTS "Users read own profile" ON public.profiles;
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT
USING (user_id = auth.uid() OR private.can_view_all(auth.uid()) OR private.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users read own roles" ON public.user_roles;
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT
USING (user_id = auth.uid() OR private.can_view_all(auth.uid()) OR private.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Staff read audit logs" ON public.audit_logs;
CREATE POLICY "Staff read audit logs" ON public.audit_logs FOR SELECT
USING (private.can_view_all(auth.uid()) OR private.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Staff can view credential settings" ON public.credential_settings;
CREATE POLICY "Staff can view credential settings" ON public.credential_settings FOR SELECT
USING (private.is_staff(auth.uid()) OR private.is_admin(auth.uid()));