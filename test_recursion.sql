CREATE OR REPLACE FUNCTION test_get_taluka() RETURNS uuid AS $$
BEGIN
  RETURN (SELECT taluka_id FROM public.employees WHERE user_id = auth.uid() LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
