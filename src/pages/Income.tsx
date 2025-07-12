import { useState } from "react";
import { ArrowLeft, Plus, DollarSign, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const incomeTypes = [
  { value: "booking", label: "Booking Income" },
  { value: "laundry", label: "Laundry Income" },
  { value: "food", label: "Food Income" },
  { value: "other", label: "Other Income" }
];

const accounts = [
  { id: "1", name: "Sampath Bank", currency: "LKR" },
  { id: "2", name: "Payoneer", currency: "USD" },
  { id: "3", name: "Asaliya Cash", currency: "LKR" },
  { id: "4", name: "Wishva Account", currency: "LKR" }
];

const paymentMethods = [
  { value: "cash", label: "Cash" },
  { value: "transfer", label: "Bank Transfer" },
  { value: "payoneer", label: "Payoneer" }
];

export default function Income() {
  const [formData, setFormData] = useState({
    type: "",
    amount: "",
    accountId: "",
    paymentMethod: "",
    isAdvance: false,
    note: "",
    date: new Date().toISOString().split('T')[0]
  });
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In real app, this would save to Supabase
    toast({
      title: "Income Added Successfully",
      description: `Rs. ${Number(formData.amount).toLocaleString()} added to ${accounts.find(a => a.id === formData.accountId)?.name}`,
    });
    
    // Reset form
    setFormData({
      type: "",
      amount: "",
      accountId: "",
      paymentMethod: "",
      isAdvance: false,
      note: "",
      date: new Date().toISOString().split('T')[0]
    });
  };

  const selectedAccount = accounts.find(a => a.id === formData.accountId);

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link to="/">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Add Income</h1>
          <p className="text-muted-foreground">Record income for Asaliya Villa</p>
        </div>
      </div>

      {/* Current Location Badge */}
      <Badge variant="outline" className="w-fit">
        📍 Asaliya Villa
      </Badge>

      {/* Form */}
      <Card className="bg-gradient-card border-0 shadow-elegant">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            Income Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Income Type */}
            <div className="space-y-2">
              <Label htmlFor="type">Income Type</Label>
              <Select 
                value={formData.type} 
                onValueChange={(value) => setFormData({...formData, type: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select income type" />
                </SelectTrigger>
                <SelectContent>
                  {incomeTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Payment Method */}
            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Payment Method</Label>
              <Select 
                value={formData.paymentMethod} 
                onValueChange={(value) => setFormData({...formData, paymentMethod: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="How was this paid?" />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method.value} value={method.value}>
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Account */}
            <div className="space-y-2">
              <Label htmlFor="account">Deposit to Account</Label>
              <Select 
                value={formData.accountId} 
                onValueChange={(value) => setFormData({...formData, accountId: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{account.name}</span>
                        <Badge variant="outline" className="ml-2">
                          {account.currency}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  className="pl-10"
                  required
                />
              </div>
              {selectedAccount && (
                <p className="text-xs text-muted-foreground">
                  Will be added to {selectedAccount.name} ({selectedAccount.currency})
                </p>
              )}
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            {/* Advance Payment Checkbox */}
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="advance"
                checked={formData.isAdvance}
                onCheckedChange={(checked) => setFormData({...formData, isAdvance: checked as boolean})}
              />
              <Label htmlFor="advance" className="text-sm">
                This is an advance payment
              </Label>
            </div>

            {/* Note */}
            <div className="space-y-2">
              <Label htmlFor="note">Note (Optional)</Label>
              <Textarea
                id="note"
                placeholder="Add any additional details..."
                value={formData.note}
                onChange={(e) => setFormData({...formData, note: e.target.value})}
                rows={3}
              />
            </div>

            {/* Submit Button */}
            <div className="flex gap-3 pt-4">
              <Button asChild variant="outline" className="flex-1">
                <Link to="/">Cancel</Link>
              </Button>
              <Button 
                type="submit" 
                className="flex-1"
                disabled={!formData.type || !formData.amount || !formData.accountId || !formData.paymentMethod}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Income
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}