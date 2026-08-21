ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ref_code text;

CREATE OR REPLACE FUNCTION public.generate_ref_code(p_prefix text)
RETURNS text
LANGUAGE plpgsql
VOLATILE
SET search_path = public
AS $$
DECLARE
  v_code text;
BEGIN
  LOOP
    v_code := p_prefix || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE ref_code = v_code);
  END LOOP;
  RETURN v_code;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_profile_ref_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.ref_code IS NULL OR NEW.ref_code = '' THEN
    NEW.ref_code := public.generate_ref_code(
      CASE WHEN NEW.account_type = 'supplier' THEN 'SU' ELSE 'CU' END
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_profile_ref_code_trg ON public.profiles;
CREATE TRIGGER set_profile_ref_code_trg
BEFORE INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_profile_ref_code();

UPDATE public.profiles
SET ref_code = public.generate_ref_code(CASE WHEN account_type = 'supplier' THEN 'SU' ELSE 'CU' END)
WHERE ref_code IS NULL;

ALTER TABLE public.profiles ALTER COLUMN ref_code SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_ref_code_key ON public.profiles (ref_code);