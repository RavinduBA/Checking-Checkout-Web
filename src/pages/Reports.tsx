import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  Percent,
  Calendar,
  Building2,
  CreditCard,
  ChevronDown,
  ChevronRight
} from "lucide-react";
import FinancialReports from "./FinancialReports";
import CommissionReports from "@/components/reports/CommissionReports";
import AccountsReports from "@/components/reports/AccountsReports";
import EnhancedFinancialReports from "@/components/reports/EnhancedFinancialReports";
import DetailedBalanceSheet from "@/components/reports/DetailedBalanceSheet";
import ComprehensiveReports from "@/components/reports/ComprehensiveReports";

export default function Reports() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Financial Reports</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Comprehensive financial analytics and account management
        </p>
      </div>
      
      <Tabs defaultValue="comprehensive" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="comprehensive" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Financial Overview
          </TabsTrigger>
          <TabsTrigger value="detailed" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Detailed Reports
          </TabsTrigger>
          <TabsTrigger value="accounts" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Account Statements
          </TabsTrigger>
          <TabsTrigger value="commission" className="flex items-center gap-2">
            <Percent className="h-4 w-4" />
            Commissions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="comprehensive" className="mt-6">
          <ComprehensiveReports />
        </TabsContent>

        <TabsContent value="detailed" className="mt-6">
          <EnhancedFinancialReports />
        </TabsContent>

        <TabsContent value="accounts" className="mt-6">
          <DetailedBalanceSheet />
        </TabsContent>

        <TabsContent value="commission" className="mt-6">
          <CommissionReports />
        </TabsContent>
      </Tabs>
    </div>
  );
}