"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ActionFeedback } from "@/components/ui/action-feedback";
import { useActionStatus } from "@/lib/hooks/use-action-status";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createDeal, logPayment, type DealWithPayments } from "@/lib/actions/deals";

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export function DealsPanel({
  leadId,
  deals,
  canManage,
}: {
  leadId: string;
  deals: DealWithPayments[];
  canManage: boolean;
}) {
  const [addDealOpen, setAddDealOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Deals & Payments</h2>
        {canManage && (
          <Button size="sm" variant="outline" onClick={() => setAddDealOpen(true)}>
            <Plus className="size-4" />
            Add Deal
          </Button>
        )}
      </div>

      {deals.length === 0 && (
        <p className="text-sm text-muted-foreground">No deals yet.</p>
      )}

      {deals.map((deal) => (
        <DealCard key={deal.id} leadId={leadId} deal={deal} canManage={canManage} />
      ))}

      <AddDealDialog leadId={leadId} open={addDealOpen} onOpenChange={setAddDealOpen} />
    </div>
  );
}

function DealCard({
  leadId,
  deal,
  canManage,
}: {
  leadId: string;
  deal: DealWithPayments;
  canManage: boolean;
}) {
  const [paymentOpen, setPaymentOpen] = useState(false);
  const collected = deal.payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const pending = Math.max(0, Number(deal.price) - collected);
  const percent = Number(deal.price) > 0 ? Math.round((collected / Number(deal.price)) * 100) : 0;

  return (
    <div className="flex flex-col gap-3 rounded-md border p-3">
      <div>
        <div className="text-sm font-medium">{deal.package_name}</div>
        <div className="text-xs text-muted-foreground">
          Offered {deal.offer_date} by {deal.offered_by_user?.name ?? "—"}
        </div>
        {deal.services && <div className="mt-1 text-xs text-muted-foreground">{deal.services}</div>}
      </div>

      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Total</span>
          <span className="font-medium">{currency.format(Number(deal.price))}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Collected</span>
          <span className="text-green-700">{currency.format(collected)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Pending</span>
          <span className="text-orange-700">{currency.format(pending)}</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-green-600" style={{ width: `${percent}%` }} />
        </div>
        <div className="text-xs text-muted-foreground">{percent}% collected</div>
      </div>

      {deal.payments.length > 0 && (
        <div className="flex flex-col gap-1 border-t pt-2">
          <div className="text-xs font-medium text-muted-foreground">Payment History</div>
          {[...deal.payments]
            .sort((a, b) => b.created_at.localeCompare(a.created_at))
            .map((payment) => (
              <div key={payment.id} className="flex justify-between text-xs">
                <span className="text-muted-foreground">
                  {new Date(payment.created_at).toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>
                <span className="font-medium">{currency.format(Number(payment.amount))}</span>
              </div>
            ))}
        </div>
      )}

      {canManage && (
        <Button size="sm" variant="outline" onClick={() => setPaymentOpen(true)}>
          Log Payment
        </Button>
      )}

      <LogPaymentDialog
        leadId={leadId}
        dealId={deal.id}
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
      />
    </div>
  );
}

function AddDealDialog({
  leadId,
  open,
  onOpenChange,
}: {
  leadId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [packageName, setPackageName] = useState("");
  const [price, setPrice] = useState("");
  const [services, setServices] = useState("");
  const [offerDate, setOfferDate] = useState(() => new Date().toISOString().slice(0, 10));
  const { status, isPending, run } = useActionStatus();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    run(async () => {
      await createDeal(leadId, {
        package_name: packageName,
        price: Number(price),
        services,
        offer_date: offerDate,
      });
      setPackageName("");
      setPrice("");
      setServices("");
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Deal</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="space-y-1.5">
            <Label>Package Name *</Label>
            <Input value={packageName} onChange={(e) => setPackageName(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>Price *</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Services</Label>
            <Input
              placeholder="Resume, ATS, Mock Interview..."
              value={services}
              onChange={(e) => setServices(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Offer Date</Label>
            <Input type="date" value={offerDate} onChange={(e) => setOfferDate(e.target.value)} />
          </div>
          <ActionFeedback status={status} />
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving..." : "Add Deal"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function LogPaymentDialog({
  leadId,
  dealId,
  open,
  onOpenChange,
}: {
  leadId: string;
  dealId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [amount, setAmount] = useState("");
  const [collectedAt, setCollectedAt] = useState(() => new Date().toISOString().slice(0, 10));
  const { status, isPending, run } = useActionStatus();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    run(async () => {
      await logPayment(dealId, leadId, { amount: Number(amount), collected_at: collectedAt });
      setAmount("");
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log Payment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="space-y-1.5">
            <Label>Amount *</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Collected Date</Label>
            <Input type="date" value={collectedAt} onChange={(e) => setCollectedAt(e.target.value)} />
          </div>
          <ActionFeedback status={status} />
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving..." : "Log Payment"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
