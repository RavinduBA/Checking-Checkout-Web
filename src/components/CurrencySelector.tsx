import { DollarSign } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface CurrencySelectorProps {
  currency: string;
  onCurrencyChange: (currency: string) => void;
  label?: string;
}

export const CurrencySelector = ({ 
  currency, 
  onCurrencyChange, 
  label = "Currency" 
}: CurrencySelectorProps) => {
  const currencies = [
    { code: 'LKR', symbol: 'LKR', name: 'Sri Lankan Rupee' },
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
  ];

  const selectedCurrency = currencies.find(c => c.code === currency);

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <DollarSign className="size-4" />
        {label}
      </Label>
      <Select value={currency} onValueChange={onCurrencyChange}>
        <SelectTrigger className="w-full">
          <SelectValue>
            {selectedCurrency && (
              <div className="flex items-center gap-2">
                <span className="font-mono">{selectedCurrency.symbol}</span>
                <span>{selectedCurrency.code}</span>
                <span className="text-muted-foreground text-sm hidden sm:flex">- {selectedCurrency.name}</span>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="z-50 bg-background border">
          {currencies.map((curr) => (
            <SelectItem key={curr.code} value={curr.code}>
              <div className="flex items-center gap-2">
                <span className="font-mono min-w-[24px]">{curr.symbol}</span>
                <span className="font-medium">{curr.code}</span>
                <span className="text-muted-foreground">- {curr.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};