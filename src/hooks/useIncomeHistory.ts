import { useState, useEffect, useCallback } from "react";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";

type Database = any;
type Income = Database["public"]["Tables"]["income"]["Row"];

export function useIncomeHistory() {
	const { profile } = useProfile();
	const [incomeHistory, setIncomeHistory] = useState<Income[]>([]);
	const [loading, setLoading] = useState(true);

	const fetchIncomeHistory = useCallback(async () => {
		if (!profile?.tenant_id) {
			setLoading(false);
			return;
		}

		try {
			setLoading(true);
			const { data, error } = await supabase
				.from("income")
				.select("*, accounts(name), income_types(type_name)")
				.eq("tenant_id", profile.tenant_id)
				.order("created_at", { ascending: false })
				.limit(20);
			
			if (error) throw error;
			setIncomeHistory(data || []);
		} catch (error) {
			console.error("Error fetching income history:", error);
		} finally {
			setLoading(false);
		}
	}, [profile?.tenant_id]);

	useEffect(() => {
		fetchIncomeHistory();
	}, [fetchIncomeHistory]);

	return {
		incomeHistory,
		loading,
		refetch: fetchIncomeHistory,
	};
}