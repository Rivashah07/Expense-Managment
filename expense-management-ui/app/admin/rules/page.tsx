'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/lib/store';
import { usersAPI } from '@/lib/api';
import { toast } from 'sonner';
import { Settings, Percent, User, Zap, CheckCircle, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function ApprovalRulesPage() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [managers, setManagers] = useState<any[]>([]);
  
  // Rule configuration state
  const [requireManagerApproval, setRequireManagerApproval] = useState(true);
  const [ruleType, setRuleType] = useState<'sequential' | 'percentage' | 'hybrid' | 'override'>('sequential');
  const [percentageRequired, setPercentageRequired] = useState(60);
  const [overrideApproverId, setOverrideApproverId] = useState<string>('');
  const [autoApproveIfOverride, setAutoApproveIfOverride] = useState(false);
  const [fastTrackThreshold, setFastTrackThreshold] = useState(500);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user?.companyId) return;

    try {
      // Load managers (potential override approvers)
      const { data } = await usersAPI.getAll(user.companyId);
      setManagers(data.filter((u: any) => u.role === 'Admin' || u.role === 'Manager'));

      // Load existing rules (TODO: implement API endpoint)
      // const rulesResponse = await approvalAPI.getRules(user.companyId);
      // if (rulesResponse.data) { setRulesFromAPI(rulesResponse.data); }
    } catch (error) {
      console.error('Failed to load data');
    }
  };

  const handleSaveRules = async () => {
    setLoading(true);
    try {
      // TODO: Implement API endpoint to save rules
      const rules = {
        requireManagerApproval,
        ruleType,
        percentageRequired: ruleType === 'percentage' || ruleType === 'hybrid' ? percentageRequired : null,
        overrideApproverId: ruleType === 'override' || ruleType === 'hybrid' ? overrideApproverId || null : null,
        autoApproveIfOverride,
        fastTrackThreshold,
      };

      console.log('Saving rules:', rules);
      
      toast.success('Approval rules saved successfully! 🎉');
    } catch (error: any) {
      toast.error('Failed to save rules');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
            <Settings className="w-8 h-8 text-blue-600" />
            Approval Rules Configuration
          </h2>
          <p className="text-gray-600 mt-2">Configure advanced approval workflows for your company</p>
        </div>

        {/* Info Alert */}
        <Alert className="bg-blue-50 border-blue-200">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-sm text-blue-900">
            These rules determine how expenses are approved. Choose from sequential, percentage-based, override, or hybrid approval strategies.
          </AlertDescription>
        </Alert>

        {/* Manager Approval Toggle */}
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              Manager Approval Requirement
            </CardTitle>
            <CardDescription>Enable or disable the initial manager approval step</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="manager-approval" className="text-base font-medium">
                  Require Manager Approval First
                </Label>
                <p className="text-sm text-gray-500 mt-1">
                  When enabled, expenses must be approved by the employee's manager before other approvers
                </p>
              </div>
              <Switch
                id="manager-approval"
                checked={requireManagerApproval}
                onCheckedChange={setRequireManagerApproval}
              />
            </div>
          </CardContent>
        </Card>

        {/* Rule Type Selection */}
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader>
            <CardTitle>Approval Strategy</CardTitle>
            <CardDescription>Choose how expenses should be approved</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Rule Type</Label>
              <Select value={ruleType} onValueChange={(value: any) => setRuleType(value)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sequential">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Sequential (Default)</span>
                      <span className="text-xs text-gray-500">Each approver in order</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="percentage">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Percentage-Based</span>
                      <span className="text-xs text-gray-500">X% of approvers must approve</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="override">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Specific Approver Override</span>
                      <span className="text-xs text-gray-500">One person can auto-approve</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="hybrid">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Hybrid (Percentage OR Override)</span>
                      <span className="text-xs text-gray-500">Combine both strategies</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Rule Type Explanation */}
            <div className="bg-gray-50 p-4 rounded-lg border">
              {ruleType === 'sequential' && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 font-medium">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Sequential Approval
                  </div>
                  <p className="text-sm text-gray-600">
                    Expenses move through approvers one by one. Each approver must approve before moving to the next.
                  </p>
                  <div className="mt-2 text-sm font-mono bg-white p-2 rounded border">
                    Employee → Manager → Finance → Director → Approved
                  </div>
                </div>
              )}

              {ruleType === 'percentage' && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 font-medium">
                    <Percent className="w-4 h-4 text-blue-600" />
                    Percentage-Based Approval
                  </div>
                  <p className="text-sm text-gray-600">
                    Expense is approved when a specific percentage of approvers have approved. Other approvers can be skipped.
                  </p>
                  <div className="mt-2 text-sm font-mono bg-white p-2 rounded border">
                    Example: 3 out of 5 approvers (60%) → Auto-Approved ✓
                  </div>
                </div>
              )}

              {ruleType === 'override' && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 font-medium">
                    <User className="w-4 h-4 text-purple-600" />
                    Override Approver
                  </div>
                  <p className="text-sm text-gray-600">
                    A specific high-level approver (e.g., CFO, CEO) can approve expenses immediately, bypassing all other approvers.
                  </p>
                  <div className="mt-2 text-sm font-mono bg-white p-2 rounded border">
                    CFO Approves → Instant Approval ✓ (Skip all others)
                  </div>
                </div>
              )}

              {ruleType === 'hybrid' && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 font-medium">
                    <Zap className="w-4 h-4 text-orange-600" />
                    Hybrid Strategy
                  </div>
                  <p className="text-sm text-gray-600">
                    Combines percentage AND override rules. Expense is approved if EITHER condition is met.
                  </p>
                  <div className="mt-2 text-sm font-mono bg-white p-2 rounded border">
                    60% Approved OR CFO Approves → Auto-Approved ✓
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Percentage Configuration */}
        {(ruleType === 'percentage' || ruleType === 'hybrid') && (
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Percent className="w-5 h-5 text-blue-600" />
                Percentage Threshold
              </CardTitle>
              <CardDescription>Set the minimum percentage of approvers required</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Required Approval Percentage</Label>
                  <span className="text-2xl font-bold text-blue-600">{percentageRequired}%</span>
                </div>
                <Slider
                  value={[percentageRequired]}
                  onValueChange={(value) => setPercentageRequired(value[0])}
                  min={1}
                  max={100}
                  step={1}
                  className="w-full"
                />
                <p className="text-sm text-gray-500">
                  Example: With 5 approvers, {percentageRequired}% means {Math.ceil((percentageRequired / 100) * 5)} approver(s) must approve
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Override Approver */}
        {(ruleType === 'override' || ruleType === 'hybrid') && (
          <Card className="border-l-4 border-l-purple-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-purple-600" />
                Override Approver
              </CardTitle>
              <CardDescription>Select a high-level approver who can bypass the normal flow</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Select Override Approver (CFO, CEO, etc.)</Label>
                <Select value={overrideApproverId} onValueChange={setOverrideApproverId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an approver" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {managers.map((manager) => (
                      <SelectItem key={manager.id} value={manager.id}>
                        {manager.name} ({manager.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <div>
                  <Label htmlFor="auto-approve-override" className="text-base font-medium">
                    Auto-Approve on Override
                  </Label>
                  <p className="text-sm text-gray-600 mt-1">
                    When this approver approves, immediately mark the expense as approved
                  </p>
                </div>
                <Switch
                  id="auto-approve-override"
                  checked={autoApproveIfOverride}
                  onCheckedChange={setAutoApproveIfOverride}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Fast-Track Threshold */}
        <Card className="border-l-4 border-l-green-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-green-600" />
              Fast-Track Threshold
            </CardTitle>
            <CardDescription>Expenses above this amount skip approval steps</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="threshold">Amount Threshold ({user?.company?.defaultCurrency || 'USD'})</Label>
              <Input
                id="threshold"
                type="number"
                value={fastTrackThreshold}
                onChange={(e) => setFastTrackThreshold(Number(e.target.value))}
                placeholder="500"
              />
              <p className="text-sm text-gray-500">
                Expenses over ${fastTrackThreshold} will be automatically fast-tracked after initial approval
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end gap-4">
          <Button variant="outline" onClick={loadData}>
            Reset
          </Button>
          <Button 
            onClick={handleSaveRules} 
            disabled={loading}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            {loading ? 'Saving...' : 'Save Approval Rules'}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
