import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function ReservationsListSkeleton() {
	return (
		<div className="max-w-full w-full pb-20 sm:pb-0 mx-auto p-4 space-y-6">
			{/* Header Skeleton */}
			<div className="flex flex-col gap-4">
				<Skeleton className="h-8 w-64" />

				{/* Filters Skeleton */}
				<div className="flex flex-col lg:flex-row gap-4">
					<Skeleton className="w-full lg:w-48 h-10" />
					<Skeleton className="w-full lg:w-64 h-10" />
					<Skeleton className="w-full lg:w-48 h-10" />
					<Skeleton className="w-40 h-10" />
				</div>
			</div>

			{/* Tabs Skeleton */}
			<Tabs defaultValue="reservations" className="w-full">
				<TabsList className="grid w-full grid-cols-2">
					<TabsTrigger value="reservations">Reservations</TabsTrigger>
					<TabsTrigger value="payments">Payments</TabsTrigger>
				</TabsList>

				<TabsContent value="reservations" className="space-y-4">
					{/* Desktop Table View Skeleton */}
					<div className="hidden lg:block">
						<Card>
							<CardHeader>
								<CardTitle>Reservations</CardTitle>
							</CardHeader>
							<CardContent>
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Reservation #</TableHead>
											<TableHead>Guest</TableHead>
											<TableHead>Room</TableHead>
											<TableHead>Check-in</TableHead>
											<TableHead>Check-out</TableHead>
											<TableHead>Room Amount</TableHead>
											<TableHead>Expenses</TableHead>
											<TableHead>Status</TableHead>
											<TableHead>Actions</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{Array.from({ length: 8 }).map((_, index) => (
											<TableRow key={index}>
												<TableCell>
													<Skeleton className="h-4 w-24" />
												</TableCell>
												<TableCell>
													<Skeleton className="h-4 w-32" />
												</TableCell>
												<TableCell>
													<Skeleton className="h-4 w-28" />
												</TableCell>
												<TableCell>
													<Skeleton className="h-4 w-20" />
												</TableCell>
												<TableCell>
													<Skeleton className="h-4 w-20" />
												</TableCell>
												<TableCell>
													<Skeleton className="h-4 w-24" />
												</TableCell>
												<TableCell>
													<Skeleton className="h-4 w-20" />
												</TableCell>
												<TableCell>
													<Skeleton className="h-6 w-20 rounded-full" />
												</TableCell>
												<TableCell>
													<div className="flex gap-1">
														<Skeleton className="h-8 w-8 rounded" />
														<Skeleton className="h-8 w-8 rounded" />
														<Skeleton className="h-8 w-8 rounded" />
														<Skeleton className="h-8 w-8 rounded" />
													</div>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</CardContent>
						</Card>
					</div>

					{/* Mobile Card View Skeleton */}
					<div className="lg:hidden grid gap-4">
						{Array.from({ length: 6 }).map((_, index) => (
							<Card key={index} className="w-full">
								<CardContent className="p-4">
									<div className="flex justify-between items-start mb-3">
										<div className="space-y-1">
											<Skeleton className="h-4 w-24" />
											<Skeleton className="h-3 w-32" />
										</div>
										<Skeleton className="h-6 w-20 rounded-full" />
									</div>

									<div className="space-y-2">
										<div className="flex items-center gap-2">
											<Skeleton className="h-3 w-3 rounded" />
											<Skeleton className="h-3 w-28" />
										</div>
										<div className="flex items-center gap-2">
											<Skeleton className="h-3 w-3 rounded" />
											<Skeleton className="h-3 w-36" />
										</div>
										<div className="flex items-center gap-2">
											<Skeleton className="h-3 w-3 rounded" />
											<Skeleton className="h-3 w-32" />
										</div>
										<div className="flex items-center gap-2">
											<Skeleton className="h-3 w-3 rounded" />
											<Skeleton className="h-3 w-40" />
										</div>
									</div>

									<div className="flex gap-2 mt-4">
										<Skeleton className="h-8 flex-1" />
										<Skeleton className="h-8 w-12" />
										<Skeleton className="h-8 w-12" />
										<Skeleton className="h-8 w-12" />
									</div>
								</CardContent>
							</Card>
						))}
					</div>
				</TabsContent>

				<TabsContent value="payments" className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle>Recent Payments</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="mb-4">
								<Skeleton className="h-4 w-32" />
							</div>
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Payment #</TableHead>
										<TableHead>Amount</TableHead>
										<TableHead>Method</TableHead>
										<TableHead>Date</TableHead>
										<TableHead>Status</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{Array.from({ length: 5 }).map((_, index) => (
										<TableRow key={index}>
											<TableCell>
												<Skeleton className="h-4 w-24" />
											</TableCell>
											<TableCell>
												<Skeleton className="h-4 w-20" />
											</TableCell>
											<TableCell>
												<Skeleton className="h-4 w-16" />
											</TableCell>
											<TableCell>
												<Skeleton className="h-4 w-20" />
											</TableCell>
											<TableCell>
												<Skeleton className="h-6 w-20 rounded-full" />
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>
		</div>
	);
}