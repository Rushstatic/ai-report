CREATE TABLE IF NOT EXISTS public.village_master_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    village_id UUID NOT NULL REFERENCES public.villages(id) ON DELETE CASCADE,
    population INTEGER NOT NULL DEFAULT 0,
    house_count INTEGER NOT NULL DEFAULT 0,
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to DATE,
    is_current BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.village_master_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all authenticated users" ON public.village_master_data
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Enable all access for admins and PHC Controllers" ON public.village_master_data
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.employees e
            WHERE e.id = auth.uid()
            AND e.role IN ('STATE_ADMIN', 'DISTRICT_ADMIN', 'TALUKA_ADMIN', 'PHC_CONTROLLER')
        )
    );

-- Also add to form_fields table the master data configuration columns
ALTER TABLE public.form_fields 
ADD COLUMN IF NOT EXISTS master_data_source TEXT,
ADD COLUMN IF NOT EXISTS master_data_field TEXT,
ADD COLUMN IF NOT EXISTS master_data_mode TEXT; -- 'DISPLAY_ONLY' or 'CALCULATION_SOURCE'

