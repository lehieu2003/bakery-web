'use client';

import { useState } from 'react';
import AdminShell from '@/components/admin/AdminShell';
import { Save, Plus, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useSettings, useUpdateSettings } from '@/hooks/admin/use-settings';

interface SettingsFormProps {
  initialSettings: {
    store_name?: string;
    store_email?: string;
    store_phone?: string;
    store_address?: string;
    opening_hours?: string;
    pickup_slots?: string;
    allow_delivery?: string;
    delivery_fee?: string;
    min_order_delivery?: string;
  };
}

function SettingsForm({ initialSettings }: SettingsFormProps) {
  const [storeName, setStoreName] = useState(initialSettings.store_name || '');
  const [storeEmail, setStoreEmail] = useState(
    initialSettings.store_email || '',
  );
  const [storePhone, setStorePhone] = useState(
    initialSettings.store_phone || '',
  );
  const [address, setAddress] = useState(initialSettings.store_address || '');
  const [openHours, setOpenHours] = useState(
    initialSettings.opening_hours || '',
  );
  const [pickupSlots, setPickupSlots] = useState<string[]>(
    initialSettings.pickup_slots
      ? initialSettings.pickup_slots.split(',').map((s) => s.trim())
      : [],
  );
  const [newSlot, setNewSlot] = useState('');
  const [allowDelivery, setAllowDelivery] = useState(
    initialSettings.allow_delivery === 'true',
  );
  const [deliveryFee, setDeliveryFee] = useState(
    initialSettings.delivery_fee || '',
  );
  const [minOrderDelivery, setMinOrderDelivery] = useState(
    initialSettings.min_order_delivery || '',
  );

  const updateMutation = useUpdateSettings();

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({
        store_name: storeName,
        store_email: storeEmail,
        store_phone: storePhone,
        store_address: address,
        opening_hours: openHours,
        pickup_slots: pickupSlots.join(', '),
        allow_delivery: allowDelivery ? 'true' : 'false',
        delivery_fee: deliveryFee,
        min_order_delivery: minOrderDelivery,
      });
    } catch {
      // Error handled by mutation/toast
    }
  };

  const addSlot = () => {
    const v = newSlot.trim();
    if (v && !pickupSlots.includes(v)) {
      setPickupSlots((prev) => [...prev, v].sort());
      setNewSlot('');
    }
  };

  return (
    <div className='max-w-2xl space-y-4'>
      {/* Store Info */}
      <div className='bg-card rounded-xl border border-border shadow-sm p-5 space-y-4'>
        <h2 className='font-serif text-sm font-semibold text-foreground pb-2 border-b border-border'>
          Store Information
        </h2>
        <div className='grid sm:grid-cols-2 gap-3'>
          <div>
            <Label className='text-xs font-medium'>Store Name</Label>
            <Input
              className='h-9 text-sm mt-1.5'
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
            />
          </div>
          <div>
            <Label className='text-xs font-medium'>Email</Label>
            <Input
              type='email'
              className='h-9 text-sm mt-1.5'
              value={storeEmail}
              onChange={(e) => setStoreEmail(e.target.value)}
            />
          </div>
          <div>
            <Label className='text-xs font-medium'>Phone</Label>
            <Input
              className='h-9 text-sm mt-1.5'
              value={storePhone}
              onChange={(e) => setStorePhone(e.target.value)}
            />
          </div>
        </div>
        <div>
          <Label className='text-xs font-medium'>Address</Label>
          <Input
            className='h-9 text-sm mt-1.5'
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>
        <div>
          <Label className='text-xs font-medium'>Opening Hours</Label>
          <Textarea
            className='text-xs mt-1.5 resize-none'
            rows={3}
            value={openHours}
            onChange={(e) => setOpenHours(e.target.value)}
          />
        </div>
      </div>

      {/* Pickup slots */}
      <div className='bg-card rounded-xl border border-border shadow-sm p-5 space-y-4'>
        <h2 className='font-serif text-sm font-semibold text-foreground pb-2 border-b border-border'>
          Pickup Slots
        </h2>
        <div className='flex flex-wrap gap-2'>
          {pickupSlots.map((slot) => (
            <span
              key={slot}
              className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted text-xs font-medium text-foreground border border-border'
            >
              {slot}
              <button
                onClick={() =>
                  setPickupSlots((prev) => prev.filter((s) => s !== slot))
                }
                className='text-muted-foreground hover:text-destructive'
              >
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
        <div className='flex gap-2'>
          <Input
            type='time'
            className='h-8 text-xs max-w-36'
            value={newSlot}
            onChange={(e) => setNewSlot(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addSlot()}
          />
          <Button
            variant='outline'
            size='sm'
            className='h-8 text-xs gap-1'
            onClick={addSlot}
          >
            <Plus size={12} />
            Add Slot
          </Button>
        </div>
      </div>

      {/* Delivery */}
      <div className='bg-card rounded-xl border border-border shadow-sm p-5 space-y-4'>
        <h2 className='font-serif text-sm font-semibold text-foreground pb-2 border-b border-border'>
          Fulfillment
        </h2>
        <div className='flex items-center justify-between'>
          <div>
            <p className='text-xs font-medium text-foreground'>
              Allow Delivery
            </p>
            <p className='text-[10px] text-muted-foreground mt-0.5'>
              Enable delivery option for customers at checkout
            </p>
          </div>
          <Switch checked={allowDelivery} onCheckedChange={setAllowDelivery} />
        </div>
        {allowDelivery && (
          <div className='grid sm:grid-cols-2 gap-3 pt-2'>
            <div>
              <Label className='text-xs font-medium'>Delivery Fee (VND)</Label>
              <Input
                className='h-9 text-sm mt-1.5'
                value={deliveryFee}
                onChange={(e) => setDeliveryFee(e.target.value)}
                placeholder='30000'
              />
            </div>
            <div>
              <Label className='text-xs font-medium'>
                Min Order for Delivery (VND)
              </Label>
              <Input
                className='h-9 text-sm mt-1.5'
                value={minOrderDelivery}
                onChange={(e) => setMinOrderDelivery(e.target.value)}
                placeholder='200000'
              />
            </div>
          </div>
        )}
      </div>

      {/* Admin account */}
      <div className='bg-card rounded-xl border border-border shadow-sm p-5 space-y-4'>
        <h2 className='font-serif text-sm font-semibold text-foreground pb-2 border-b border-border'>
          Admin Account
        </h2>
        <div className='grid sm:grid-cols-2 gap-3'>
          <div>
            <Label className='text-xs font-medium'>Current Password</Label>
            <Input
              type='password'
              className='h-9 text-sm mt-1.5'
              placeholder='••••••••'
            />
          </div>
          <div>
            <Label className='text-xs font-medium'>New Password</Label>
            <Input
              type='password'
              className='h-9 text-sm mt-1.5'
              placeholder='••••••••'
            />
          </div>
        </div>
        <Button variant='outline' size='sm' className='h-8 text-xs'>
          Change Password
        </Button>
      </div>

      {/* Save */}
      <div className='sticky bottom-0 bg-card border-t border-border -mx-4 md:-mx-6 px-4 md:px-6 py-3 flex justify-end'>
        <Button
          size='sm'
          className='h-8 text-xs gap-1.5'
          onClick={handleSave}
          disabled={updateMutation.isPending}
        >
          {updateMutation.isPending ? (
            <>
              <Loader2 className='w-3 h-3 animate-spin' />
              Saving...
            </>
          ) : (
            <>
              <Save size={12} />
              Save Settings
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { data: settings, isLoading, error } = useSettings();

  if (isLoading) {
    return (
      <AdminShell title='Settings'>
        <div className='flex items-center justify-center min-h-100'>
          <Loader2 className='w-8 h-8 animate-spin text-primary' />
        </div>
      </AdminShell>
    );
  }

  if (error) {
    return (
      <AdminShell title='Settings'>
        <div className='flex items-center justify-center min-h-100'>
          <p className='text-destructive'>Failed to load settings</p>
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell title='Settings'>
      <div className='flex items-center justify-between mb-6'>
        <div>
          <h1 className='font-serif text-xl font-semibold text-foreground'>
            Settings
          </h1>
          <p className='text-xs text-muted-foreground mt-0.5'>
            Manage store information and configuration
          </p>
        </div>
      </div>
      <SettingsForm initialSettings={settings || {}} />
    </AdminShell>
  );
}
