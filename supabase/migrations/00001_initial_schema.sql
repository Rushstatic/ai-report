-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ROLES & ENUMS
CREATE TYPE employee_type AS ENUM ('MPW', 'ANM', 'CHO', 'DISTRICT_CONTROLLER', 'TALUKA_CONTROLLER', 'PHC_CONTROLLER');
CREATE TYPE report_period_type AS ENUM ('Daily', 'Weekly', 'Fortnightly', 'Monthly', 'Quarterly', 'Yearly', 'Custom');
CREATE TYPE report_data_type AS ENUM ('VILLAGE_NUMERICAL', 'VILLAGE_PROGRESS', 'LIST', 'SUBCENTRE_LEVEL');
CREATE TYPE report_status AS ENUM ('Draft', 'Pending', 'Submitted', 'Under Review', 'Approved', 'Rejected', 'Correction Required', 'Overdue');
CREATE TYPE field_type AS ENUM ('Text', 'Long Text', 'Number', 'Decimal', 'Mobile Number', 'Date', 'Time', 'Date & Time', 'Dropdown', 'Radio Button', 'Checkbox', 'Yes/No', 'File Upload', 'Image Upload', 'Village Selector', 'Employee Selector', 'Auto Calculated Field', 'Read-only Field');

-- ORGANIZATION HIERARCHY TABLES
CREATE TABLE districts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE talukas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    district_id UUID NOT NULL REFERENCES districts(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE phcs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    taluka_id UUID NOT NULL REFERENCES talukas(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE sub_centres (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phc_id UUID NOT NULL REFERENCES phcs(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE villages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sub_centre_id UUID NOT NULL REFERENCES sub_centres(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE,
    population INTEGER,
    status BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- EMPLOYEES & USERS
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id), -- Links to Supabase Auth
    name VARCHAR(255) NOT NULL,
    mobile_number VARCHAR(15) UNIQUE NOT NULL,
    employee_type employee_type NOT NULL,
    designation VARCHAR(100),
    employee_code VARCHAR(50) UNIQUE,
    district_id UUID REFERENCES districts(id),
    taluka_id UUID REFERENCES talukas(id),
    phc_id UUID REFERENCES phcs(id),
    sub_centre_id UUID REFERENCES sub_centres(id),
    status BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- FORMS & DYNAMIC FIELDS
CREATE TABLE forms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    reporting_period report_period_type NOT NULL,
    report_type report_data_type NOT NULL,
    employee_wise_submission BOOLEAN DEFAULT false,
    active BOOLEAN DEFAULT true,
    start_date DATE,
    end_date DATE,
    created_by UUID REFERENCES employees(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE form_sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE form_fields (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    section_id UUID NOT NULL REFERENCES form_sections(id) ON DELETE CASCADE,
    label_en VARCHAR(255) NOT NULL,
    label_mr VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    field_type field_type NOT NULL,
    is_required BOOLEAN DEFAULT false,
    placeholder VARCHAR(255),
    min_value NUMERIC,
    max_value NUMERIC,
    default_value TEXT,
    validation_rule TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    help_text TEXT,
    conditional_logic JSONB, -- Stores IF/ELSE logic
    calculation_formula TEXT, -- Stores math formulas
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE form_field_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    field_id UUID NOT NULL REFERENCES form_fields(id) ON DELETE CASCADE,
    label_en VARCHAR(255) NOT NULL,
    label_mr VARCHAR(255) NOT NULL,
    value VARCHAR(255) NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE form_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
    target_type VARCHAR(50) NOT NULL, -- 'DISTRICT', 'TALUKA', 'PHC', 'SUBCENTRE', 'EMPLOYEE_TYPE'
    target_id UUID, -- NULL means ALL if type is something general, else specific ID
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- REPORT SUBMISSIONS
CREATE TABLE report_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    form_id UUID NOT NULL REFERENCES forms(id),
    employee_id UUID NOT NULL REFERENCES employees(id),
    village_id UUID REFERENCES villages(id),
    sub_centre_id UUID REFERENCES sub_centres(id),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    status report_status DEFAULT 'Draft',
    submitted_at TIMESTAMP WITH TIME ZONE,
    due_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE report_submission_values (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID NOT NULL REFERENCES report_submissions(id) ON DELETE CASCADE,
    field_id UUID NOT NULL REFERENCES form_fields(id),
    value_text TEXT,
    value_numeric NUMERIC,
    value_boolean BOOLEAN,
    value_date DATE,
    value_json JSONB, -- For list reports or complex data
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    action VARCHAR(255) NOT NULL,
    record_type VARCHAR(100),
    record_id UUID,
    details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- INDEXES FOR PERFORMANCE
CREATE INDEX idx_talukas_district ON talukas(district_id);
CREATE INDEX idx_phcs_taluka ON phcs(taluka_id);
CREATE INDEX idx_subcentres_phc ON sub_centres(phc_id);
CREATE INDEX idx_villages_subcentre ON villages(sub_centre_id);
CREATE INDEX idx_employees_hierarchy ON employees(district_id, taluka_id, phc_id, sub_centre_id);
CREATE INDEX idx_report_submissions_hierarchy ON report_submissions(employee_id, village_id, sub_centre_id);
CREATE INDEX idx_report_submissions_period ON report_submissions(period_start, period_end, status);

-- Enable RLS on all tables
ALTER TABLE districts ENABLE ROW LEVEL SECURITY;
ALTER TABLE talukas ENABLE ROW LEVEL SECURITY;
ALTER TABLE phcs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_centres ENABLE ROW LEVEL SECURITY;
ALTER TABLE villages ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_submission_values ENABLE ROW LEVEL SECURITY;

-- Note: RLS policies will be implemented via Supabase interface based on user role (employee_type)
