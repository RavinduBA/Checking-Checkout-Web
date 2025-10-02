interface CalendarLegendProps {
	className?: string;
}

export function CalendarLegend({ className }: CalendarLegendProps) {
	return (
		<div className={className}>
			<div className="flex flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm">
				<div className="flex items-center gap-1 sm:gap-2">
					<div className="w-3 h-3 sm:w-4 sm:h-4 bg-green-500 rounded"></div>
					<span>Confirmed</span>
				</div>
				<div className="flex items-center gap-1 sm:gap-2">
					<div className="w-3 h-3 sm:w-4 sm:h-4 bg-yellow-500 rounded"></div>
					<span>Tentative</span>
				</div>
				<div className="flex items-center gap-1 sm:gap-2">
					<div className="w-3 h-3 sm:w-4 sm:h-4 bg-blue-500 rounded"></div>
					<span>Pending</span>
				</div>
				<div className="flex items-center gap-1 sm:gap-2">
					<div className="w-3 h-3 sm:w-4 sm:h-4 bg-purple-500 rounded"></div>
					<span>Checked In</span>
				</div>
				<div className="flex items-center gap-1 sm:gap-2">
					<div className="w-3 h-3 sm:w-4 sm:h-4 bg-red-500 rounded"></div>
					<span>Cancelled</span>
				</div>
			</div>
		</div>
	);
}
