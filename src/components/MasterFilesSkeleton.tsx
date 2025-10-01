import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function MasterFilesSkeleton() {
	return (
		<div className="p-6 space-y-6">
			{/* Header */}
			<Skeleton className="h-8 w-48" />

			{/* Master Files Tabs */}
			<Tabs defaultValue="locations" className="w-full">
				<TabsList className="grid w-full grid-cols-5">
					<TabsTrigger value="locations">Locations</TabsTrigger>
					<TabsTrigger value="rooms">Rooms</TabsTrigger>
					<TabsTrigger value="agents">Agents</TabsTrigger>
					<TabsTrigger value="guides">Guides</TabsTrigger>
					<TabsTrigger value="commissions">Commissions</TabsTrigger>
				</TabsList>

				<TabsContent value="locations" className="space-y-4">
					<Card>
						<CardHeader>
							<div className="flex justify-between items-center">
								<CardTitle>Locations</CardTitle>
								<Skeleton className="h-10 w-32" />
							</div>
						</CardHeader>
						<CardContent>
							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
								{Array.from({ length: 6 }).map((_, index) => (
									<Card key={index}>
										<CardContent className="p-4 space-y-3">
											<div className="flex justify-between items-start">
												<Skeleton className="h-5 w-32" />
												<Skeleton className="h-6 w-16 rounded-full" />
											</div>
											<div className="space-y-2">
												<Skeleton className="h-4 w-24" />
												<Skeleton className="h-4 w-36" />
												<Skeleton className="h-4 w-28" />
											</div>
											<div className="flex gap-2">
												<Skeleton className="h-8 w-8" />
												<Skeleton className="h-8 w-8" />
											</div>
										</CardContent>
									</Card>
								))}
							</div>
						</CardContent>
					</Card>
				</TabsContent>

				{["rooms", "agents", "guides", "commissions"].map((tab) => (
					<TabsContent key={tab} value={tab} className="space-y-4">
						<Card>
							<CardHeader>
								<div className="flex justify-between items-center">
									<Skeleton className="h-6 w-32" />
									<Skeleton className="h-10 w-28" />
								</div>
							</CardHeader>
							<CardContent>
								{tab === "rooms" ? (
									<div className="space-y-3">
										{Array.from({ length: 8 }).map((_, index) => (
											<div key={index} className="flex items-center justify-between p-4 border rounded-lg">
												<div className="flex items-center gap-4">
													<Skeleton className="h-8 w-12" />
													<div className="space-y-1">
														<Skeleton className="h-4 w-24" />
														<Skeleton className="h-3 w-32" />
													</div>
												</div>
												<div className="flex items-center gap-2">
													<Skeleton className="h-6 w-16 rounded-full" />
													<Skeleton className="h-8 w-8" />
													<Skeleton className="h-8 w-8" />
												</div>
											</div>
										))}
									</div>
								) : (
									<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
										{Array.from({ length: 6 }).map((_, index) => (
											<Card key={index}>
												<CardContent className="p-4 space-y-3">
													<div className="flex justify-between items-start">
														<Skeleton className="h-5 w-32" />
														<Skeleton className="h-6 w-16 rounded-full" />
													</div>
													<div className="space-y-2">
														<Skeleton className="h-4 w-28" />
														<Skeleton className="h-4 w-36" />
														<Skeleton className="h-4 w-24" />
													</div>
													<div className="flex gap-2">
														<Skeleton className="h-8 w-8" />
														<Skeleton className="h-8 w-8" />
													</div>
												</CardContent>
											</Card>
										))}
									</div>
								)}
							</CardContent>
						</Card>
					</TabsContent>
				))}
			</Tabs>
		</div>
	);
}