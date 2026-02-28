import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useInvalidEmails() {
  const [invalidEmails, setInvalidEmails] = useState<Set<string>>(new Set());

  const loadInvalidEmails = useCallback(async () => {
    const { data } = await supabase.from("invalid_emails").select("email_address").limit(5000);
    if (data) setInvalidEmails(new Set(data.map((d) => d.email_address.toLowerCase())));
  }, []);

  const isEmailInvalid = useCallback(
    (email: string | null | undefined): boolean => {
      return email ? invalidEmails.has(email.toLowerCase()) : false;
    },
    [invalidEmails]
  );

  const reactivateEmail = useCallback(
    async (email: string) => {
      const { error } = await supabase
        .from("invalid_emails")
        .delete()
        .eq("email_address", email.toLowerCase());
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success(`Email ${email} reactivado`);
      loadInvalidEmails();
    },
    [loadInvalidEmails]
  );

  return { invalidEmails, loadInvalidEmails, isEmailInvalid, reactivateEmail };
}
