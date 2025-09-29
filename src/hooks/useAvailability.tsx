import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

type Room = Tables<"rooms"> & {
	locations: Tables<"locations">;
};

type Reservation = Tables<"reservations">;

interface AvailabilityConflict {
	room: Room;
	conflictingReservations: Reservation[];
}

interface AlternativeOption {
	room: Room;
	isAvailable: boolean;
	conflicts?: Reservation[];
}

export const useAvailability = () => {
	const { tenant } = useAuth();
	const [rooms, setRooms] = useState<Room[]>([]);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		const fetchRooms = async () => {
			if (!tenant?.id) return;

			try {
				const { data, error } = await supabase
					.from("rooms")
					.select(`
            *,
            locations (*)
          `)
					.eq("tenant_id", tenant.id)
					.eq("is_active", true)
					.order("room_number");

				if (error) throw error;
				setRooms(data || []);
			} catch (error) {
				console.error("Error fetching rooms:", error);
			}
		};

		if (tenant?.id) {
			fetchRooms();
		}
	}, [tenant?.id]);

	const refetchRooms = async () => {
		if (!tenant?.id) return;

		try {
			const { data, error } = await supabase
				.from("rooms")
				.select(`
          *,
          locations (*)
        `)
				.eq("tenant_id", tenant.id)
				.eq("is_active", true)
				.order("room_number");

			if (error) throw error;
			setRooms(data || []);
		} catch (error) {
			console.error("Error fetching rooms:", error);
		}
	};

	// Check if a specific room is available for the given dates
	const checkRoomAvailability = async (
		roomId: string,
		checkInDate: string,
		checkOutDate: string,
		excludeReservationId?: string,
	): Promise<{ isAvailable: boolean; conflicts: Reservation[] }> => {
		if (!tenant?.id || !checkInDate || !checkOutDate) {
			return { isAvailable: false, conflicts: [] };
		}

		try {
			const { data: conflictingReservations, error } = await supabase
				.from("reservations")
				.select("*")
				.eq("tenant_id", tenant.id)
				.eq("room_id", roomId)
				.neq("status", "cancelled")
				.not("check_out_date", "lte", checkInDate)
				.not("check_in_date", "gte", checkOutDate);

			if (error) throw error;

			// Filter out the reservation being edited (if any)
			const conflicts = (conflictingReservations || []).filter(
				(reservation) => reservation.id !== excludeReservationId,
			);

			return {
				isAvailable: conflicts.length === 0,
				conflicts: conflicts,
			};
		} catch (error) {
			console.error("Error checking availability:", error);
			return { isAvailable: false, conflicts: [] };
		}
	};

	// Get all available rooms for the given dates
	const getAvailableRooms = async (
		checkInDate: string,
		checkOutDate: string,
		locationId?: string,
		excludeReservationId?: string,
	): Promise<AlternativeOption[]> => {
		if (!tenant?.id || !checkInDate || !checkOutDate) {
			return [];
		}

		setLoading(true);
		try {
			// Filter rooms by location if specified
			const filteredRooms = locationId
				? rooms.filter((room) => room.location_id === locationId)
				: rooms;

			const availabilityPromises = filteredRooms.map(async (room) => {
				const { isAvailable, conflicts } = await checkRoomAvailability(
					room.id,
					checkInDate,
					checkOutDate,
					excludeReservationId,
				);

				return {
					room,
					isAvailable,
					conflicts: isAvailable ? undefined : conflicts,
				};
			});

			const results = await Promise.all(availabilityPromises);
			return results;
		} catch (error) {
			console.error("Error getting available rooms:", error);
			return [];
		} finally {
			setLoading(false);
		}
	};

	// Get alternative options when a room is not available
	const getAlternativeOptions = async (
		originalRoomId: string,
		checkInDate: string,
		checkOutDate: string,
		excludeReservationId?: string,
	): Promise<{
		sameLocationAlternatives: AlternativeOption[];
		otherLocationAlternatives: AlternativeOption[];
	}> => {
		if (!tenant?.id || !checkInDate || !checkOutDate) {
			return { sameLocationAlternatives: [], otherLocationAlternatives: [] };
		}

		const originalRoom = rooms.find((room) => room.id === originalRoomId);
		if (!originalRoom) {
			return { sameLocationAlternatives: [], otherLocationAlternatives: [] };
		}

		const allOptions = await getAvailableRooms(
			checkInDate,
			checkOutDate,
			undefined,
			excludeReservationId,
		);

		// Separate by location
		const sameLocationAlternatives = allOptions.filter(
			(option) =>
				option.room.location_id === originalRoom.location_id &&
				option.room.id !== originalRoomId &&
				option.isAvailable,
		);

		const otherLocationAlternatives = allOptions.filter(
			(option) =>
				option.room.location_id !== originalRoom.location_id &&
				option.isAvailable,
		);

		return {
			sameLocationAlternatives,
			otherLocationAlternatives,
		};
	};

	return {
		rooms,
		loading,
		checkRoomAvailability,
		getAvailableRooms,
		getAlternativeOptions,
		refetchRooms,
	};
};
