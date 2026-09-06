-- ============================================================
-- AIMS AI — STAGE 1 FOUNDATION
-- ============================================================

-- ---------- Roles enum ----------
CREATE TYPE public.app_role AS ENUM ('student', 'teacher', 'admin');

-- ---------- Shared helpers ----------
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ---------- schools ----------
CREATE TABLE public.schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT NULL,
  city TEXT NULL,
  state TEXT NULL,
  country TEXT NOT NULL DEFAULT 'India',
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.schools TO authenticated;
GRANT ALL ON public.schools TO service_role;
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_schools_name ON public.schools (lower(name));
CREATE TRIGGER trg_schools_updated_at BEFORE UPDATE ON public.schools
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- profiles ----------
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NULL,
  avatar_url TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_profiles_email ON public.profiles (lower(email));
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- user_roles (the ONLY source of truth for roles) ----------
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_user_roles_user_id ON public.user_roles (user_id);

-- ---------- students ----------
CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  class_level INTEGER NOT NULL CHECK (class_level BETWEEN 1 AND 10),
  school_id UUID NULL REFERENCES public.schools(id) ON DELETE SET NULL,
  school_name TEXT NULL,
  age INTEGER NULL CHECK (age IS NULL OR (age BETWEEN 3 AND 25)),
  date_of_birth DATE NULL,
  preferred_language TEXT NOT NULL DEFAULT 'English',
  avatar_url TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.students TO authenticated;
GRANT ALL ON public.students TO service_role;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_students_user_id ON public.students (user_id);
CREATE INDEX idx_students_school_id ON public.students (school_id);
CREATE INDEX idx_students_class_level ON public.students (class_level);
CREATE TRIGGER trg_students_updated_at BEFORE UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- teachers ----------
CREATE TABLE public.teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  school_id UUID NULL REFERENCES public.schools(id) ON DELETE SET NULL,
  school_name TEXT NULL,
  specialization TEXT NULL,
  avatar_url TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teachers TO authenticated;
GRANT ALL ON public.teachers TO service_role;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_teachers_user_id ON public.teachers (user_id);
CREATE INDEX idx_teachers_school_id ON public.teachers (school_id);
CREATE TRIGGER trg_teachers_updated_at BEFORE UPDATE ON public.teachers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- audit_logs (foundation for later stages) ----------
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NULL,
  metadata JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs (user_id);
CREATE INDEX idx_audit_logs_entity ON public.audit_logs (entity_type, entity_id);

-- ---------- Security-definer role helpers ----------
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS public.app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = auth.uid()
  ORDER BY CASE role WHEN 'admin' THEN 1 WHEN 'teacher' THEN 2 ELSE 3 END
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;

-- ---------- Audit helper ----------
CREATE OR REPLACE FUNCTION public.log_audit(_action TEXT, _entity_type TEXT, _entity_id UUID, _metadata JSONB DEFAULT NULL)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), _action, _entity_type, _entity_id, _metadata)
$$;
GRANT EXECUTE ON FUNCTION public.log_audit(TEXT, TEXT, UUID, JSONB) TO authenticated;

-- ---------- Automatic profile / role / record creation on sign-up ----------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta JSONB := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  requested TEXT := lower(COALESCE(meta->>'requested_role', 'student'));
  v_role public.app_role;
  v_name TEXT := NULLIF(trim(COALESCE(meta->>'full_name', '')), '');
  v_class INTEGER;
  v_dob DATE;
  v_age INTEGER;
BEGIN
  -- Never trust client-supplied "admin": only student/teacher are self-registerable.
  IF requested = 'teacher' THEN
    v_role := 'teacher';
  ELSE
    v_role := 'student';
  END IF;

  IF v_name IS NULL THEN
    v_name := split_part(COALESCE(NEW.email, 'User'), '@', 1);
  END IF;

  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, v_name, COALESCE(NEW.email, ''));

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_role);

  IF v_role = 'student' THEN
    BEGIN
      v_class := (meta->>'class_level')::INTEGER;
    EXCEPTION WHEN OTHERS THEN
      v_class := NULL;
    END;
    IF v_class IS NULL OR v_class < 1 OR v_class > 10 THEN
      RAISE EXCEPTION 'A valid class level between 1 and 10 is required for students';
    END IF;

    BEGIN
      v_dob := NULLIF(meta->>'date_of_birth', '')::DATE;
    EXCEPTION WHEN OTHERS THEN
      v_dob := NULL;
    END;
    IF v_dob IS NOT NULL THEN
      v_age := date_part('year', age(v_dob))::INTEGER;
      IF v_age < 3 OR v_age > 25 THEN v_age := NULL; END IF;
    END IF;

    INSERT INTO public.students (user_id, full_name, class_level, school_name, date_of_birth, age, preferred_language)
    VALUES (
      NEW.id,
      v_name,
      v_class,
      NULLIF(trim(COALESCE(meta->>'school_name', '')), ''),
      v_dob,
      v_age,
      COALESCE(NULLIF(trim(COALESCE(meta->>'preferred_language', '')), ''), 'English')
    );
  ELSE
    INSERT INTO public.teachers (user_id, full_name, school_name, specialization)
    VALUES (
      NEW.id,
      v_name,
      NULLIF(trim(COALESCE(meta->>'school_name', '')), ''),
      NULLIF(trim(COALESCE(meta->>'specialization', '')), '')
    );
  END IF;

  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, metadata)
  VALUES (NEW.id, 'USER_REGISTERED', 'profile', NEW.id, jsonb_build_object('role', v_role::text));

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Keep profile email in sync when the auth email changes
CREATE OR REPLACE FUNCTION public.handle_user_email_updated()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    UPDATE public.profiles SET email = COALESCE(NEW.email, '') WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_email_updated
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_email_updated();

-- Guard: non-admins cannot change identity/email columns on their own records
CREATE OR REPLACE FUNCTION public.protect_profile_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    NEW.id := OLD.id;
    NEW.email := OLD.email;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_protect_profile_columns BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_columns();

CREATE OR REPLACE FUNCTION public.protect_owner_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    NEW.user_id := OLD.user_id;
    NEW.school_id := OLD.school_id;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_protect_students_owner BEFORE UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.protect_owner_column();
CREATE TRIGGER trg_protect_teachers_owner BEFORE UPDATE ON public.teachers
  FOR EACH ROW EXECUTE FUNCTION public.protect_owner_column();

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- schools: readable by any signed-in user, managed by admins only
CREATE POLICY "schools_select_authenticated" ON public.schools
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "schools_admin_insert" ON public.schools
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "schools_admin_update" ON public.schools
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "schools_admin_delete" ON public.schools
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- profiles: own row, or admin
CREATE POLICY "profiles_select_own_or_admin" ON public.profiles
  FOR SELECT TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "profiles_update_own_or_admin" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "profiles_admin_insert" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "profiles_admin_delete" ON public.profiles
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- user_roles: users may read their own role; only admins manage roles
CREATE POLICY "user_roles_select_own_or_admin" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "user_roles_admin_insert" ON public.user_roles
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "user_roles_admin_update" ON public.user_roles
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "user_roles_admin_delete" ON public.user_roles
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- students: own row, or admin
CREATE POLICY "students_select_own_or_admin" ON public.students
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "students_update_own_or_admin" ON public.students
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "students_admin_insert" ON public.students
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "students_admin_delete" ON public.students
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- teachers: own row, or admin
CREATE POLICY "teachers_select_own_or_admin" ON public.teachers
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "teachers_update_own_or_admin" ON public.teachers
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "teachers_admin_insert" ON public.teachers
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "teachers_admin_delete" ON public.teachers
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- audit_logs: admins read; writes only through log_audit()/triggers
CREATE POLICY "audit_logs_admin_select" ON public.audit_logs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- STORAGE POLICIES for the "avatars" bucket (bucket created separately)
-- Path convention: avatars/<user-id>/profile.<ext>
-- ============================================================
CREATE POLICY "avatars_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "avatars_insert_own_folder" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "avatars_update_own_folder" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "avatars_delete_own_folder" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);