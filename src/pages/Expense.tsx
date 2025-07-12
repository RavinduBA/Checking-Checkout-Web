import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { format } from "date-fns";
import { ArrowLeft, Minus, Calendar } from "lucide-react";
import { Link } from "react-router-dom";

type Location = Tables<"locations">;
type Account = Tables<"accounts">;
type ExpenseType = Tables<"expense_types">;
type Expense = Tables<"expenses"> & {
  locations?: Location;
  accounts?: Account;
};

export default function Expense() {
  const [formData, setFormData] = useState({
    mainCategory: "",
    subCategory: "",
    amount: "",
    accountId: "",
    locationId: "",
    date: format(new Date(), "yyyy-MM-dd"),
    note: "",
  });

  const [locations, setLocations] = useState<Location[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([]);
  const [recentExpenses, setRecentExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [locationsData, accountsData, expenseTypesData, recentExpensesData] = await Promise.all([
        supabase.from("locations").select("*").eq("is_active", true),
        supabase.from("accounts").select("*"),
        supabase.from("expense_types").select("*").order("main_type"),
        supabase.from("expenses").select("*, accounts(*), locations(*)").order("created_at", { ascending: false }).limit(10)
      ]);

      setLocations(locationsData.data || []);
      setAccounts(accountsData.data || []);
      setExpenseTypes(expenseTypesData.data || []);
      setRecentExpenses(recentExpensesData.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const selectedAccount = accounts.find(a => a.id === formData.accountId);
  const currencySymbol = selectedAccount?.currency === "USD" ? "$" : "Rs.";

  const mainCategories = [...new Set(expenseTypes.map(et => et.main_type))];
  const subCategories = expenseTypes.filter(et => et.main_type === formData.mainCategory).map(et => et.sub_type);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from("expenses").insert([{
        main_type: formData.mainCategory,
        sub_type: formData.subCategory,
        amount: parseFloat(formData.amount),
        account_id: formData.accountId,
        location_id: formData.locationId,
        date: formData.date,
        note: formData.note || null,
      }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Expense record added successfully",
      });

      // Reset form
      setFormData({
        mainCategory: "",
        subCategory: "",
        amount: "",
        accountId: "",
        locationId: "",
        date: format(new Date(), "yyyy-MM-dd"),
        note: "",
      });

      fetchData(); // Refresh recent expenses
    } catch (error) {
      console.error("Error adding expense:", error);
      toast({
        title: "Error",
        description: "Failed to add expense record",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="container mx-auto p-4 sm:p-6">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link to="/">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Add Expense</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Record your business expenses</p>
        </div>
      </div>

      {/* Location Filter at Top */}
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-4">
          <div>
            <Label htmlFor="locationFilter" className="text-red-800 font-medium">Select Location</Label>
            <Select value={formData.locationId} onValueChange={(value) => setFormData({...formData, locationId: value})}>
              <SelectTrigger className="bg-white border-red-200">
                <SelectValue placeholder="Select Location" />
              </SelectTrigger>
              <SelectContent>
                {locations.map((location) => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Only show form after location is selected */}
      {formData.locationId && (
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
          {/* Expense Form */}
          <Card className="bg-gradient-to-br from-red-50 to-rose-50 border-red-200 shadow-lg order-2 lg:order-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-red-800 flex items-center gap-2 text-lg">
              <Minus className="h-5 w-5" />
              New Expense Record
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="mainCategory">Main Category</Label>
                  <Select value={formData.mainCategory} onValueChange={(value) => setFormData({...formData, mainCategory: value, subCategory: ""})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select main category" />
                    </SelectTrigger>
                    <SelectContent>
                      {mainCategories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="subCategory">Sub Category</Label>
                  <Select value={formData.subCategory} onValueChange={(value) => setFormData({...formData, subCategory: value})} disabled={!formData.mainCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select sub category" />
                    </SelectTrigger>
                    <SelectContent>
                      {subCategories.map((subCategory) => (
                        <SelectItem key={subCategory} value={subCategory}>
                          {subCategory}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="amount">Amount</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground">
                    {currencySymbol}
                  </span>
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
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="accountId">Pay From Account</Label>
                  <Select value={formData.accountId} onValueChange={(value) => setFormData({...formData, accountId: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name} ({account.currency})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
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
              </div>

              <div>
                <Label htmlFor="note">Note (Optional)</Label>
                <Textarea
                  id="note"
                  placeholder="Add details about this expense..."
                  value={formData.note}
                  onChange={(e) => setFormData({...formData, note: e.target.value})}
                  rows={3}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1 bg-red-600 hover:bg-red-700 text-white">
                  <Minus className="h-4 w-4 mr-2" />
                  Add Expense
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Recent Expenses */}
        <Card className="bg-gradient-to-br from-red-50 to-rose-50 border-red-200 shadow-lg order-1 lg:order-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-red-800 text-lg">Recent Expenses</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="space-y-2 max-h-80 sm:max-h-96 overflow-y-auto">
              {recentExpenses.map((expense) => (
                <div key={expense.id} className="p-3 bg-white/60 rounded-lg border border-red-100">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                    <div className="flex-1">
                      <div className="font-medium text-red-900 text-sm sm:text-base">
                        {expense.main_type} - {expense.sub_type} • {expense.accounts?.currency === "LKR" ? "Rs." : "$"}{expense.amount.toLocaleString()}
                      </div>
                      <div className="text-xs sm:text-sm text-red-700 mt-1">
                        <div>{expense.locations?.name}</div>
                        <div>Account: {expense.accounts?.name} ({expense.accounts?.currency})</div>
                        <div>{format(new Date(expense.date), "MMM dd, yyyy")}</div>
                        {expense.note && <div className="mt-1 italic">"{expense.note}"</div>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {recentExpenses.length === 0 && (
                <div className="text-center py-8 text-red-600">
                  No expense records yet. Add your first expense above!
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        </div>
      )}
    </div>
  );
}