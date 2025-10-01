import { Printer } from "lucide-react";
import React from "react";
import { ReservationPrintableView } from "@/components/ReservationPrintableView";
import { Button } from "@/components/ui/button";
import {
	PrintableReservationData,
	useReservationPrint,
} from "@/hooks/useReservationPrint";
import { Tables } from "@/integrations/supabase/types";

// Enhanced reservation type from ReservationsList
type EnhancedReservation = Tables<"reservations"> & {
	locations: {
		id: string;
		name: string;
		address: string | null;
		phone: string | null;
		email: string | null;
		is_active: boolean;
		created_at: string;
		property_type: string | null;
		tenant_id: string;
	};
	rooms: {
		id: string;
		room_number: string;
		room_type: string;
		bed_type: string;
		description: string | null;
		amenities: string[] | null;
		base_price: number;
		max_occupancy: number;
		property_type: string;
		currency: string;
		is_active: boolean;
		created_at: string;
		updated_at: string;
		location_id: string;
		tenant_id: string;
	};
	guides?: {
		id: string;
		name: string;
		phone: string | null;
		email: string | null;
		address: string | null;
		license_number: string | null;
		is_active: boolean;
	} | null;
	agents?: {
		id: string;
		name: string;
		phone: string | null;
		email: string | null;
		agency_name: string | null;
		is_active: boolean;
	} | null;
	tenants?: {
		id: string;
		hotel_name: string;
		address: string | null;
		phone: string | null;
		email: string | null;
		website: string | null;
		logo_url: string | null;
	} | null;
};

/**
 * Transform enhanced reservation data to printable format
 */
const transformToPrintableData = (reservation: EnhancedReservation): PrintableReservationData => {
	return {
		// Base reservation data
		...reservation,
		
		// Enhanced hotel/tenant information
		tenant_name: reservation.tenants?.hotel_name,
		hotel_name: reservation.tenants?.hotel_name,
		hotel_address: reservation.tenants?.address,
		hotel_phone: reservation.tenants?.phone,
		hotel_email: reservation.tenants?.email,
		hotel_website: reservation.tenants?.website,
		logo_url: reservation.tenants?.logo_url,
		
		// Enhanced location information
		location_name: reservation.locations.name,
		location_address: reservation.locations.address,
		location_phone: reservation.locations.phone,
		location_email: reservation.locations.email,
		
		// Room details
		room_number: reservation.rooms.room_number,
		room_type: reservation.rooms.room_type,
		bed_type: reservation.rooms.bed_type,
		room_description: reservation.rooms.description,
		amenities: reservation.rooms.amenities || [],
		
		// Guide information
		guide_name: reservation.guides?.name,
		guide_phone: reservation.guides?.phone,
		guide_email: reservation.guides?.email,
		guide_address: reservation.guides?.address,
		guide_license: reservation.guides?.license_number,
		
		// Agent information
		agent_name: reservation.agents?.name,
		agent_phone: reservation.agents?.phone,
		agent_email: reservation.agents?.email,
		agency_name: reservation.agents?.agency_name,
		
		// Legacy structure for backward compatibility
		locations: {
			id: reservation.locations.id,
			name: reservation.locations.name,
			is_active: reservation.locations.is_active,
			created_at: reservation.locations.created_at,
		},
		rooms: {
			id: reservation.rooms.id,
			bed_type: reservation.rooms.bed_type,
			currency: reservation.rooms.currency,
			amenities: reservation.rooms.amenities || [],
			is_active: reservation.rooms.is_active,
			room_type: reservation.rooms.room_type,
			base_price: reservation.rooms.base_price,
			created_at: reservation.rooms.created_at,
			updated_at: reservation.rooms.updated_at,
			description: reservation.rooms.description || "",
			location_id: reservation.rooms.location_id,
			room_number: reservation.rooms.room_number,
			max_occupancy: reservation.rooms.max_occupancy,
			property_type: reservation.rooms.property_type,
		},
	};
};

interface ReservationPrintButtonProps {
	reservation: PrintableReservationData | EnhancedReservation;
	buttonText?: string;
	buttonVariant?:
		| "default"
		| "destructive"
		| "outline"
		| "secondary"
		| "ghost"
		| "link";
	buttonSize?: "default" | "sm" | "lg" | "icon";
	showIcon?: boolean;
	className?: string;
}

/**
 * Reusable component that renders a print button and handles printing logic
 * Can be easily integrated into any component that needs to print reservation details
 */
export const ReservationPrintButton: React.FC<ReservationPrintButtonProps> = ({
	reservation,
	buttonText = "Print",
	buttonVariant = "outline",
	buttonSize = "sm",
	showIcon = true,
	className = "",
}) => {
	const { printRef, printReservation } = useReservationPrint();

	const handlePrint = () => {
		// Check if reservation has enhanced data structure and transform if needed
		const printableData = 'tenants' in reservation 
			? transformToPrintableData(reservation as EnhancedReservation)
			: reservation as PrintableReservationData;
		
		printReservation(printableData);
	};

	// Prepare data for the hidden printable component
	const printableReservation = 'tenants' in reservation 
		? transformToPrintableData(reservation as EnhancedReservation)
		: reservation as PrintableReservationData;

	return (
		<>
			<Button
				onClick={handlePrint}
				variant={buttonVariant}
				size={buttonSize}
				className={`flex items-center gap-2 ${className}`}
			>
				{showIcon && <Printer className="h-4 w-4" />}
				{buttonText}
			</Button>

			{/* Hidden printable component */}
			<div ref={printRef} className="hidden">
				<ReservationPrintableView reservation={printableReservation} />
			</div>
		</>
	);
};

/**
 * Example usage component showing how to integrate the print functionality
 */
export const ReservationPrintButtonExample = () => {
	const sampleReservation: PrintableReservationData = {
		id: "e5d670dd-e41d-4aec-9269-18b122bc3fa2",
		reservation_number: "RES20250008",
		location_id: "a24ed6cf-11cd-40b8-8a29-8f9546822ca8",
		room_id: "b184a03f-9b0e-4b7a-9ba6-dcaadd76a4ba",
		guest_name: "test 45",
		guest_email: "uu@g.com",
		guest_phone: null,
		guest_address: null,
		guest_id_number: null,
		guest_nationality: null,
		adults: 1,
		children: 0,
		check_in_date: "2025-09-25",
		check_out_date: "2025-09-30",
		nights: 5,
		room_rate: 10000,
		total_amount: 50000,
		advance_amount: 0,
		paid_amount: 50000,
		balance_amount: 0,
		currency: "LKR",
		status: "confirmed",
		special_requests: null,
		arrival_time: null,
		created_by: null,
		grc_approved: false,
		grc_approved_by: null,
		grc_approved_at: null,
		created_at: "2025-09-24T06:03:05.237536+00:00",
		updated_at: "2025-09-24T06:03:45.888076+00:00",
		guide_id: "a4d0de6e-1394-433c-a26b-1638e4e7a5ad",
		agent_id: "24355400-ca40-4de6-8af5-affa5f065d12",
		guide_commission: 4000,
		agent_commission: 7000,
		booking_source: "direct",
		locations: {
			id: "a24ed6cf-11cd-40b8-8a29-8f9546822ca8",
			name: "Antiqua Serenity",
			is_active: true,
			created_at: "2025-09-23T09:18:26.23406+00:00",
		},
		rooms: {
			id: "b184a03f-9b0e-4b7a-9ba6-dcaadd76a4ba",
			bed_type: "Double",
			currency: "LKR",
			amenities: ["Safe", "TV", "Garden View"],
			is_active: true,
			room_type: "Deluxe",
			base_price: 10000,
			created_at: "2025-09-23T09:32:50.174944+00:00",
			updated_at: "2025-09-23T09:33:08.169338+00:00",
			description: "",
			location_id: "a24ed6cf-11cd-40b8-8a29-8f9546822ca8",
			room_number: "102",
			max_occupancy: 2,
			property_type: "Room",
		},
	};

	return (
		<div className="p-6 space-y-4">
			<h2 className="text-xl font-bold">Print Button Examples</h2>

			<div className="flex flex-wrap gap-4">
				{/* Different button variants */}
				<ReservationPrintButton
					reservation={sampleReservation}
					buttonText="Print Reservation"
				/>

				<ReservationPrintButton
					reservation={sampleReservation}
					buttonVariant="default"
					buttonText="Print"
				/>

				<ReservationPrintButton
					reservation={sampleReservation}
					buttonVariant="ghost"
					buttonSize="lg"
					buttonText="Print Details"
				/>

				<ReservationPrintButton
					reservation={sampleReservation}
					buttonVariant="outline"
					buttonSize="icon"
					buttonText=""
					showIcon={true}
				/>
			</div>

			<div className="mt-8 p-4 border rounded bg-gray-50">
				<h3 className="font-semibold mb-2">How to use in your components:</h3>
				<pre className="text-sm bg-gray-800 text-green-400 p-3 rounded overflow-x-auto">
					{`// Import the component
import { ReservationPrintButton } from '@/components/ReservationPrintButton';

// Use in your component
<ReservationPrintButton 
  reservation={reservationData} 
  buttonText="Print Reservation"
  buttonVariant="outline"
/>`}
				</pre>
			</div>
		</div>
	);
};

export default ReservationPrintButton;
