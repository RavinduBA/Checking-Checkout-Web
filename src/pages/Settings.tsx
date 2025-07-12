import { useState, useEffect } from "react";
import { ArrowLeft, Plus, Edit, Trash2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const [expenseTypes, setExpenseTypes] = useState<any[]>([]);
  const [newMainType, setNewMainType] = useState("");
  const [newSubType, setNewSubType] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchExpenseTypes();
    fetchIncomeTypes();
  }, []);

  const fetchExpenseTypes = async () => {
    const { data } = await supabase.from("expense_types").select("*");
    setExpenseTypes(data || []);
  };

  const addExpenseType = async () => {
    if (!newMainType || !newSubType) return;

    const { error } = await supabase
      .from("expense_types")
      .insert({ main_type: newMainType, sub_type: newSubType });

    if (!error) {
      toast({ title: "Success", description: "Expense type added" });
      setNewMainType("");
      setNewSubType("");
      fetchExpenseTypes();
    }
  };

  const deleteExpenseType = async (id: string) => {
    const { error } = await supabase.from("expense_types").delete().eq("id", id);
    if (!error) {
      toast({ title: "Success", description: "Expense type deleted" });
      fetchExpenseTypes();
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link to="/"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Expense Categories</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Input 
              placeholder="Main Type" 
              value={newMainType}
              onChange={(e) => setNewMainType(e.target.value)}
            />
            <Input 
              placeholder="Sub Type" 
              value={newSubType}
              onChange={(e) => setNewSubType(e.target.value)}
            />
            <Button onClick={addExpenseType}>
              <Plus className="h-4 w-4 mr-2" />Add
            </Button>
          </div>
          
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {expenseTypes.map((type) => (
              <div key={type.id} className="flex justify-between items-center p-3 border rounded">
                <span>{type.main_type} - {type.sub_type}</span>
                <Button size="sm" variant="destructive" onClick={() => deleteExpenseType(type.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}