'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAuthStore } from '@/lib/store';
import { toast } from 'sonner';
import type { ApprovalRule } from '@/types';

export default function ApprovalRules() {
  const { user } = useAuthStore();
  const [rules, setRules] = useState<ApprovalRule>({
    id: '1',
    companyId: user?.companyId || '',
    autoApproveLimit: 100,
    requireManagerApproval: true,
    requireFinanceApproval: true,
    requireDirectorApproval: false,
    fastTrackThreshold: 500,
    maxExpenseAmount: 10000,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadRules();
  }, [user]);

  const loadRules = async () => {
    // Mock loading from localStorage
    const storedRules = localStorage.getItem('approvalRules');
    if (storedRules) {
      setRules(JSON.parse(storedRules));
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Mock save to localStorage
      localStorage.setItem('approvalRules', JSON.stringify(rules));
      toast.success('Approval rules updated successfully');
    } catch (error) {
      toast.error('Failed to update approval rules');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold">Approval Rules</h2>
          <p className="text-gray-600 mt-2">Configure expense approval workflows and thresholds</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Auto-Approval Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Auto-Approval</CardTitle>
              <CardDescription>Automatically approve expenses below a certain amount</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="autoApproveLimit">Auto-Approve Limit ($)</Label>
                <Input
                  id="autoApproveLimit"
                  type="number"
                  value={rules.autoApproveLimit}
                  onChange={(e) => setRules({ ...rules, autoApproveLimit: Number(e.target.value) })}
                />
                <p className="text-sm text-gray-500">
                  Expenses below this amount will be automatically approved
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxExpenseAmount">Maximum Expense Amount ($)</Label>
                <Input
                  id="maxExpenseAmount"
                  type="number"
                  value={rules.maxExpenseAmount}
                  onChange={(e) => setRules({ ...rules, maxExpenseAmount: Number(e.target.value) })}
                />
                <p className="text-sm text-gray-500">
                  Maximum allowed expense amount per submission
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Fast-Track Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Fast-Track Approval</CardTitle>
              <CardDescription>Conditional rules for expedited approvals</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fastTrackThreshold">Fast-Track Threshold ($)</Label>
                <Input
                  id="fastTrackThreshold"
                  type="number"
                  value={rules.fastTrackThreshold}
                  onChange={(e) => setRules({ ...rules, fastTrackThreshold: Number(e.target.value) })}
                />
                <p className="text-sm text-gray-500">
                  Expenses over this amount will be fast-tracked for approval
                </p>
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm font-medium mb-2">Fast-Track Logic:</p>
                <p className="text-sm text-gray-600">
                  IF expense amount &gt; ${rules.fastTrackThreshold} OR approver's role is 'Finance',<br />
                  THEN the approval status moves to the next step immediately.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Approval Flow Requirements */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Approval Flow Requirements</CardTitle>
              <CardDescription>Define which approval levels are required</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="requireManagerApproval">Manager Approval Required</Label>
                  <p className="text-sm text-gray-500">
                    All expenses must be approved by the employee's manager
                  </p>
                </div>
                <Switch
                  id="requireManagerApproval"
                  checked={rules.requireManagerApproval}
                  onCheckedChange={(checked) => setRules({ ...rules, requireManagerApproval: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="requireFinanceApproval">Finance Approval Required</Label>
                  <p className="text-sm text-gray-500">
                    Expenses must be reviewed by the finance department
                  </p>
                </div>
                <Switch
                  id="requireFinanceApproval"
                  checked={rules.requireFinanceApproval}
                  onCheckedChange={(checked) => setRules({ ...rules, requireFinanceApproval: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="requireDirectorApproval">Director Approval Required</Label>
                  <p className="text-sm text-gray-500">
                    High-value expenses must be approved by a director
                  </p>
                </div>
                <Switch
                  id="requireDirectorApproval"
                  checked={rules.requireDirectorApproval}
                  onCheckedChange={(checked) => setRules({ ...rules, requireDirectorApproval: checked })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Approval Flow Preview */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Approval Flow Preview</CardTitle>
              <CardDescription>Current approval workflow based on your settings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 overflow-x-auto pb-4">
                <div className="flex flex-col items-center min-w-[120px]">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
                    1
                  </div>
                  <p className="mt-2 text-sm font-medium">Submit</p>
                  <p className="text-xs text-gray-500">Employee</p>
                </div>

                {rules.autoApproveLimit > 0 && (
                  <>
                    <div className="h-0.5 w-8 bg-gray-300" />
                    <div className="flex flex-col items-center min-w-[120px]">
                      <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-semibold">
                        ✓
                      </div>
                      <p className="mt-2 text-sm font-medium">Auto-Approve</p>
                      <p className="text-xs text-gray-500">&lt; ${rules.autoApproveLimit}</p>
                    </div>
                  </>
                )}

                {rules.requireManagerApproval && (
                  <>
                    <div className="h-0.5 w-8 bg-gray-300" />
                    <div className="flex flex-col items-center min-w-[120px]">
                      <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-semibold">
                        2
                      </div>
                      <p className="mt-2 text-sm font-medium">Manager</p>
                      <p className="text-xs text-gray-500">Review</p>
                    </div>
                  </>
                )}

                {rules.requireFinanceApproval && (
                  <>
                    <div className="h-0.5 w-8 bg-gray-300" />
                    <div className="flex flex-col items-center min-w-[120px]">
                      <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600 font-semibold">
                        3
                      </div>
                      <p className="mt-2 text-sm font-medium">Finance</p>
                      <p className="text-xs text-gray-500">Audit</p>
                    </div>
                  </>
                )}

                {rules.requireDirectorApproval && (
                  <>
                    <div className="h-0.5 w-8 bg-gray-300" />
                    <div className="flex flex-col items-center min-w-[120px]">
                      <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-semibold">
                        4
                      </div>
                      <p className="mt-2 text-sm font-medium">Director</p>
                      <p className="text-xs text-gray-500">Final Review</p>
                    </div>
                  </>
                )}

                <div className="h-0.5 w-8 bg-gray-300" />
                <div className="flex flex-col items-center min-w-[120px]">
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-semibold">
                    ✓
                  </div>
                  <p className="mt-2 text-sm font-medium">Approved</p>
                  <p className="text-xs text-gray-500">Complete</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={loading} size="lg">
            {loading ? 'Saving...' : 'Save Approval Rules'}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}

