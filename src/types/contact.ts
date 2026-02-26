export interface Contact {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  position: string | null;
  organization_id: string | null;
  organizations?: { name: string } | null;
  status: string;
  tags: string[] | null;
  notes: string | null;
  linkedin_url?: string | null;
  company_domain?: string | null;
  work_email?: string | null;
  personal_email?: string | null;
  mobile_phone?: string | null;
  work_phone?: string | null;
  lusha_status?: string | null;
  hunter_status?: string | null;
  apollo_status?: string | null;
  findymail_status?: string | null;
  last_enriched_at?: string | null;
  postal_address?: string | null;
}
