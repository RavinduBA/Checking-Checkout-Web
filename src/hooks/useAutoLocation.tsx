import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { usePermissions } from "./usePermissions";

type Location = Tables<"locations">;

export const useAutoLocation = () => {
	const {
		permissions,
		loading: permissionsLoading,
		isAdmin,
	} = usePermissions();
	const [autoSelectedLocation, setAutoSelectedLocation] = useState<string>("");
	const [shouldShowLocationSelect, setShouldShowLocationSelect] =
		useState(true);
	const [availableLocations, setAvailableLocations] = useState<Location[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (!permissionsLoading) {
			fetchLocationsAndAutoSelect();
		}
	}, [permissions, permissionsLoading, isAdmin]);

	const fetchLocationsAndAutoSelect = async () => {
		try {
			// Get all active locations
			const { data: locations } = await supabase
				.from("locations")
				.select("*")
				.eq("is_active", true)
				.order("name");

			if (!locations) {
				setLoading(false);
				return;
			}

			let userLocations: Location[] = [];

			if (isAdmin) {
				// Admin has access to all locations
				userLocations = locations;
			} else {
				// Filter locations based on user permissions
				userLocations = locations.filter(
					(location) =>
						permissions[location.name] &&
						Object.values(permissions[location.name]).some(
							(permission) => permission === true,
						),
				);
			}

			setAvailableLocations(userLocations);

			// If user has access to only one location, auto-select it
			if (userLocations.length === 1) {
				setAutoSelectedLocation(userLocations[0].id);
				setShouldShowLocationSelect(false);
			} else if (userLocations.length > 1) {
				setShouldShowLocationSelect(true);
			} else {
				// No accessible locations
				setShouldShowLocationSelect(false);
			}
		} catch (error) {
			console.error("Error fetching locations:", error);
		} finally {
			setLoading(false);
		}
	};

	return {
		autoSelectedLocation,
		shouldShowLocationSelect,
		availableLocations,
		loading: loading || permissionsLoading,
	};
};
