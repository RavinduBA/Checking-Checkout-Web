import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ReservationsHeaderProps {
	activeTab: string;
	onTabChange: (value: string) => void;
}

export function ReservationsHeader({ activeTab, onTabChange }: ReservationsHeaderProps) {
	return (
		<div className="container mx-auto p-6">
			<div className="mb-6">
				<h1 className="text-2xl font-bold">Reservations</h1>
				<p className="text-muted-foreground">
					Manage your property reservations and bookings
				</p>
			</div>

			<Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
				<TabsList className="grid w-full grid-cols-2">
					<TabsTrigger value="reservations">Reservations</TabsTrigger>
					<TabsTrigger value="payments">Payments</TabsTrigger>
				</TabsList>
			</Tabs>
		</div>
	);
}