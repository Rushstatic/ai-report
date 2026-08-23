export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      districts: {
        Row: {
          id: string
          name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
          updated_at?: string
        }
      }
      talukas: {
        Row: {
          id: string
          district_id: string
          name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          district_id: string
          name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          district_id?: string
          name?: string
          created_at?: string
          updated_at?: string
        }
      }
      phcs: {
        Row: {
          id: string
          taluka_id: string
          name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          taluka_id: string
          name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          taluka_id?: string
          name?: string
          created_at?: string
          updated_at?: string
        }
      }
      sub_centres: {
        Row: {
          id: string
          phc_id: string
          name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          phc_id: string
          name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          phc_id?: string
          name?: string
          created_at?: string
          updated_at?: string
        }
      }
      villages: {
        Row: {
          id: string
          sub_centre_id: string
          name: string
          code: string | null
          population: number | null
          status: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          sub_centre_id: string
          name: string
          code?: string | null
          population?: number | null
          status?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          sub_centre_id?: string
          name?: string
          code?: string | null
          population?: number | null
          status?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      employees: {
        Row: {
          id: string
          user_id: string | null
          name: string
          mobile_number: string
          employee_type: Database["public"]["Enums"]["employee_type"]
          designation: string | null
          employee_code: string | null
          district_id: string | null
          taluka_id: string | null
          phc_id: string | null
          sub_centre_id: string | null
          status: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          name: string
          mobile_number: string
          employee_type: Database["public"]["Enums"]["employee_type"]
          designation?: string | null
          employee_code?: string | null
          district_id?: string | null
          taluka_id?: string | null
          phc_id?: string | null
          sub_centre_id?: string | null
          status?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          name?: string
          mobile_number?: string
          employee_type?: Database["public"]["Enums"]["employee_type"]
          designation?: string | null
          employee_code?: string | null
          district_id?: string | null
          taluka_id?: string | null
          phc_id?: string | null
          sub_centre_id?: string | null
          status?: boolean
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      employee_type: 'MPW' | 'ANM' | 'CHO' | 'DISTRICT_CONTROLLER' | 'TALUKA_CONTROLLER' | 'PHC_CONTROLLER'
      report_period_type: 'Daily' | 'Weekly' | 'Fortnightly' | 'Monthly' | 'Quarterly' | 'Yearly' | 'Custom'
      report_data_type: 'VILLAGE_NUMERICAL' | 'VILLAGE_PROGRESS' | 'LIST' | 'SUBCENTRE_LEVEL'
      report_status: 'Draft' | 'Pending' | 'Submitted' | 'Under Review' | 'Approved' | 'Rejected' | 'Correction Required' | 'Overdue'
      field_type: 'Text' | 'Long Text' | 'Number' | 'Decimal' | 'Mobile Number' | 'Date' | 'Time' | 'Date & Time' | 'Dropdown' | 'Radio Button' | 'Checkbox' | 'Yes/No' | 'File Upload' | 'Image Upload' | 'Village Selector' | 'Employee Selector' | 'Auto Calculated Field' | 'Read-only Field'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
