-- 1. Create a function to automatically link auth.users to employees
CREATE OR REPLACE FUNCTION public.link_auth_user_to_employee()
RETURNS trigger AS $$
BEGIN
  -- Supabase stores phone numbers in NEW.phone (e.g., '919730266586' or '+919730266586')
  -- We match the last 10 digits against the employee's mobile_number
  UPDATE public.employees
  SET user_id = NEW.id
  WHERE mobile_number = RIGHT(NEW.phone, 10);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create the trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.link_auth_user_to_employee();

-- 3. Insert the District Admin
INSERT INTO public.employees (name, mobile_number, employee_type, status)
VALUES ('District Admin', '9730266586', 'DISTRICT_CONTROLLER', true)
ON CONFLICT (mobile_number) DO UPDATE SET employee_type = 'DISTRICT_CONTROLLER';
