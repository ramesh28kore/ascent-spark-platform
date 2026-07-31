-- restore the super admin role row if it was removed
INSERT INTO public.user_roles (user_id, role)
SELECT p.user_id, 'admin'::public.app_role
FROM public.profiles p
WHERE p.email = 'avanthi@crtconsole.app' AND p.user_id IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- the admin role assignment is immutable
CREATE OR REPLACE FUNCTION public.protect_admin_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.role = 'admin'::public.app_role THEN
      RAISE EXCEPTION 'The super admin role is permanent and cannot be removed.';
    END IF;
    RETURN OLD;
  ELSE
    IF OLD.role = 'admin'::public.app_role AND NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'The super admin role is permanent and cannot be changed.';
    END IF;
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS protect_admin_role_trg ON public.user_roles;
CREATE TRIGGER protect_admin_role_trg
BEFORE UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.protect_admin_role();

-- the super admin profile cannot be deleted
CREATE OR REPLACE FUNCTION public.protect_admin_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.user_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = OLD.user_id AND ur.role = 'admin'::public.app_role
  ) THEN
    RAISE EXCEPTION 'The super admin account is permanent and cannot be deleted.';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS protect_admin_profile_trg ON public.profiles;
CREATE TRIGGER protect_admin_profile_trg
BEFORE DELETE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_admin_profile();