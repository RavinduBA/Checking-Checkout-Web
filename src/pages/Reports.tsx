import {
	ArrowLeft,
	BarChart3,
	Building2,
	Calendar,
	CreditCard,
	DollarSign,
	Download,
	Filter,
	Percent,
	RefreshCw,
	TrendingUp,
} from "lucide-react";
import { Link, useSearchParams } from "react-router";
import CommissionReports from "@/components/reports/CommissionReports";
import ComprehensiveReports from "@/components/reports/ComprehensiveReports";
import DetailedBalanceSheet from "@/components/reports/DetailedBalanceSheet";
import EnhancedFinancialReports from "@/components/reports/EnhancedFinancialReports";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import FinancialReports from "./FinancialReports";

export default function Reports() {
	const [searchParams, setSearchParams] = useSearchParams();
	const activeTab = searchParams.get("tab") || "comprehensive";

	return (
		<div className="max-w-full pb-20 w-full mx-auto p-2 lg:p-6 space-y-4 animate-fade-in">

			{/* Reports Content */}
			<Card className="bg-card border">
				<CardHeader className="pb-3">
					<div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
						<div>
							<CardTitle className="text-base  font-semibold">
								Reports Dashboard
							</CardTitle>
							<CardDescription className="text-xs lg:text-sm">
								Access detailed financial reports and analytics
							</CardDescription>
						</div>
						<div className="flex gap-2 w-full sm:w-auto">
							<Button
								variant="outline"
								size="sm"
								className="flex-1 sm:flex-none"
							>
								<Filter className="size-4 mr-2" />
								<span className="hidden sm:inline">Filter</span>
							</Button>
							<Button
								variant="outline"
								size="sm"
								className="flex-1 sm:flex-none"
							>
								<Download className="size-4 mr-2" />
								<span className="hidden sm:inline">Export</span>
							</Button>
							<Button
								variant="outline"
								size="sm"
								className="flex-1 sm:flex-none"
							>
								<RefreshCw className="size-4 mr-2" />
								<span className="hidden sm:inline">Refresh</span>
							</Button>
						</div>
					</div>
				</CardHeader>

				<CardContent className="p-0">
					<Tabs
						value={activeTab}
						onValueChange={(value) => setSearchParams({ tab: value })}
						className="w-full"
					>
						{/* Mobile Tab Navigation */}
						<div className="lg:hidden px-4 pb-4">
							<TabsList className="grid w-full grid-cols-2 gap-2 h-auto p-0 bg-transparent">
								<TabsTrigger
									value="comprehensive"
									className="flex flex-col items-center gap-1 p-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
								>
									<BarChart3 className="size-4" />
									<span className="text-xs">Overview</span>
								</TabsTrigger>
								<TabsTrigger
									value="detailed"
									className="flex flex-col items-center gap-1 p-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
								>
									<TrendingUp className="size-4" />
									<span className="text-xs">Detailed</span>
								</TabsTrigger>
							</TabsList>

							<TabsList className="grid w-full grid-cols-2 gap-2 h-auto p-0 bg-transparent mt-2">
								<TabsTrigger
									value="accounts"
									className="flex flex-col items-center gap-1 p-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
								>
									<CreditCard className="size-4" />
									<span className="text-xs">Accounts</span>
								</TabsTrigger>
								<TabsTrigger
									value="commission"
									className="flex flex-col items-center gap-1 p-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
								>
									<Percent className="size-4" />
									<span className="text-xs">Commission</span>
								</TabsTrigger>
							</TabsList>
						</div>

						{/* Desktop Tab Navigation */}
						<div className="hidden lg:block px-6 pb-4">
							<TabsList className="grid w-full grid-cols-4 h-12">
								<TabsTrigger
									value="comprehensive"
									className="flex items-center gap-2 text-md "
								>
									<BarChart3 className="size-4" />
									Financial Overview
								</TabsTrigger>
								<TabsTrigger
									value="detailed"
									className="flex items-center gap-2 text-md "
								>
									<TrendingUp className="size-4" />
									Detailed Reports
								</TabsTrigger>
								<TabsTrigger
									value="accounts"
									className="flex items-center gap-2 text-md "
								>
									<CreditCard className="size-4" />
									Account Statements
								</TabsTrigger>
								<TabsTrigger
									value="commission"
									className="flex items-center gap-2 text-md "
								>
									<Percent className="size-4" />
									Commissions
								</TabsTrigger>
							</TabsList>
						</div>

						<div className="px-2 pb-2">
							<TabsContent value="comprehensive" className="mt-0">
								<ComprehensiveReports />
							</TabsContent>

							<TabsContent value="detailed" className="mt-0">
								<EnhancedFinancialReports />
							</TabsContent>

							<TabsContent value="accounts" className="mt-0">
								<DetailedBalanceSheet />
							</TabsContent>

							<TabsContent value="commission" className="mt-0">
								<CommissionReports />
							</TabsContent>
						</div>
					</Tabs>
				</CardContent>
			</Card>
		</div>
	);
}

// Skeleton Loading Components for Reports
export function ComprehensiveReportsSkeleton() {
	return (
		<div className="space-y-6">
			{/* Summary Cards Skeleton */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
				{Array.from({ length: 4 }).map((_, i) => (
					<Card key={i}>
						<CardHeader className="pb-2">
							<Skeleton className="h-4 w-24" />
						</CardHeader>
						<CardContent>
							<Skeleton className="h-8 w-32 mb-2" />
							<Skeleton className="h-3 w-20" />
						</CardContent>
					</Card>
				))}
			</div>

			{/* Charts Skeleton */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<Card>
					<CardHeader>
						<Skeleton className="h-6 w-48" />
						<Skeleton className="h-4 w-32" />
					</CardHeader>
					<CardContent>
						<Skeleton className="h-64 w-full" />
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<Skeleton className="h-6 w-48" />
						<Skeleton className="h-4 w-32" />
					</CardHeader>
					<CardContent>
						<Skeleton className="h-64 w-full" />
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

export function EnhancedFinancialReportsSkeleton() {
	return (
		<div className="space-y-6">
			{/* Filter Controls Skeleton */}
			<Card>
				<CardHeader>
					<Skeleton className="h-6 w-40" />
				</CardHeader>
				<CardContent>
					<div className="flex flex-wrap gap-4">
						<Skeleton className="h-10 w-32" />
						<Skeleton className="h-10 w-32" />
						<Skeleton className="h-10 w-32" />
						<Skeleton className="h-10 w-24" />
					</div>
				</CardContent>
			</Card>

			{/* Financial Tables Skeleton */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<Card>
					<CardHeader>
						<Skeleton className="h-6 w-32" />
					</CardHeader>
					<CardContent>
						<div className="space-y-3">
							{Array.from({ length: 6 }).map((_, i) => (
								<div key={i} className="flex justify-between items-center">
									<Skeleton className="h-4 w-24" />
									<Skeleton className="h-4 w-16" />
								</div>
							))}
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<Skeleton className="h-6 w-32" />
					</CardHeader>
					<CardContent>
						<div className="space-y-3">
							{Array.from({ length: 6 }).map((_, i) => (
								<div key={i} className="flex justify-between items-center">
									<Skeleton className="h-4 w-24" />
									<Skeleton className="h-4 w-16" />
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Chart Skeleton */}
			<Card>
				<CardHeader>
					<Skeleton className="h-6 w-48" />
				</CardHeader>
				<CardContent>
					<Skeleton className="h-80 w-full" />
				</CardContent>
			</Card>
		</div>
	);
}

export function DetailedBalanceSheetSkeleton() {
	return (
		<div className="space-y-6">
			{/* Account Summary Skeleton */}
			<Card>
				<CardHeader>
					<Skeleton className="h-6 w-36" />
					<Skeleton className="h-4 w-48" />
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						{Array.from({ length: 3 }).map((_, i) => (
							<div key={i} className="text-center p-4 border rounded-lg">
								<Skeleton className="h-8 w-24 mx-auto mb-2" />
								<Skeleton className="h-4 w-20 mx-auto" />
							</div>
						))}
					</div>
				</CardContent>
			</Card>

			{/* Account Details Table Skeleton */}
			<Card>
				<CardHeader>
					<Skeleton className="h-6 w-32" />
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						{/* Table Header */}
						<div className="grid grid-cols-4 gap-4 pb-2 border-b">
							<Skeleton className="h-4 w-20" />
							<Skeleton className="h-4 w-16" />
							<Skeleton className="h-4 w-20" />
							<Skeleton className="h-4 w-16" />
						</div>
						{/* Table Rows */}
						{Array.from({ length: 8 }).map((_, i) => (
							<div key={i} className="grid grid-cols-4 gap-4 py-2">
								<Skeleton className="h-4 w-24" />
								<Skeleton className="h-4 w-12" />
								<Skeleton className="h-4 w-16" />
								<Skeleton className="h-4 w-14" />
							</div>
						))}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

export function CommissionReportsSkeleton() {
	return (
		<div className="space-y-6">
			{/* Commission Summary Cards Skeleton */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
				{Array.from({ length: 4 }).map((_, i) => (
					<Card key={i}>
						<CardHeader className="pb-2">
							<div className="flex items-center gap-2">
								<Skeleton className="h-4 w-4 rounded" />
								<Skeleton className="h-4 w-28" />
							</div>
						</CardHeader>
						<CardContent>
							<Skeleton className="h-8 w-24 mb-1" />
							<Skeleton className="h-3 w-16" />
						</CardContent>
					</Card>
				))}
			</div>

			{/* Commission Details Table Skeleton */}
			<Card>
				<CardHeader>
					<Skeleton className="h-6 w-40" />
					<Skeleton className="h-4 w-56" />
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						{/* Table Header */}
						<div className="grid grid-cols-5 gap-4 pb-2 border-b">
							<Skeleton className="h-4 w-16" />
							<Skeleton className="h-4 w-20" />
							<Skeleton className="h-4 w-16" />
							<Skeleton className="h-4 w-18" />
							<Skeleton className="h-4 w-14" />
						</div>
						{/* Table Rows */}
						{Array.from({ length: 10 }).map((_, i) => (
							<div key={i} className="grid grid-cols-5 gap-4 py-3 border-b last:border-b-0">
								<Skeleton className="h-4 w-20" />
								<Skeleton className="h-4 w-24" />
								<Skeleton className="h-4 w-16" />
								<Skeleton className="h-4 w-12" />
								<Skeleton className="h-4 w-16" />
							</div>
						))}
					</div>
				</CardContent>
			</Card>

			{/* Commission Chart Skeleton */}
			<Card>
				<CardHeader>
					<Skeleton className="h-6 w-44" />
				</CardHeader>
				<CardContent>
					<Skeleton className="h-64 w-full" />
				</CardContent>
			</Card>
		</div>
	);
}
