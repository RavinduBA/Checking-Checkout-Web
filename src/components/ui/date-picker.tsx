import { CalendarIcon } from "lucide-react";
import { forwardRef } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DatePickerProps {
	value?: string;
	onChange?: (value: string) => void;
	placeholder?: string;
	disabled?: boolean;
	className?: string;
	min?: string;
	max?: string;
}

export const DatePicker = forwardRef<HTMLButtonElement, DatePickerProps>(
	({ value, onChange, placeholder = "Pick a date", disabled, className, min, max }, ref) => {
		// Parse date string as local date to prevent timezone issues
		const parseLocalDate = (dateString: string) => {
			const [year, month, day] = dateString.split('-').map(Number);
			return new Date(year, month - 1, day);
		};

		const selectedDate = value ? parseLocalDate(value) : undefined;
		const minDate = min ? parseLocalDate(min) : undefined;
		const maxDate = max ? parseLocalDate(max) : undefined;

		const handleSelect = (date: Date | undefined) => {
			if (date && onChange) {
				// Format date as YYYY-MM-DD using local date methods
				const year = date.getFullYear();
				const month = String(date.getMonth() + 1).padStart(2, '0');
				const day = String(date.getDate()).padStart(2, '0');
				const formattedDate = `${year}-${month}-${day}`;
				onChange(formattedDate);
			}
		};

		const formatDisplayDate = (date: Date | undefined) => {
			if (!date) return placeholder;
			return date.toLocaleDateString('en-US', {
				year: 'numeric',
				month: 'short',
				day: 'numeric',
			});
		};

		return (
			<Popover>
				<PopoverTrigger asChild>
					<Button
						ref={ref}
						variant="outline"
						className={cn(
							"w-full justify-start text-left font-normal",
							!value && "text-muted-foreground",
							className
						)}
						disabled={disabled}
					>
						<CalendarIcon className="mr-2 h-4 w-4" />
						{formatDisplayDate(selectedDate)}
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-auto p-0" align="start">
					<Calendar
						mode="single"
						selected={selectedDate}
						onSelect={handleSelect}
						disabled={(date) => {
							if (minDate && date < minDate) return true;
							if (maxDate && date > maxDate) return true;
							return false;
						}}
						initialFocus
					/>
				</PopoverContent>
			</Popover>
		);
	}
);

DatePicker.displayName = "DatePicker";