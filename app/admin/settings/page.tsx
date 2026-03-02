'use client';

import { useState } from 'react';
import AdminShell from '@/components/admin/AdminShell';
import { Save, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';

const defaultSlots = [
  '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00',
];

export default function SettingsPage() {
  const [storeName, setStoreName] = useState('La Douceur');
  const [storeEmail, setStoreEmail] = useState('hello@ladouceur.vn');
  const [storePhone, setStorePhone] = useState('028 3820 1234');
  const [address, setAddress] = useState('12 Nguyen Thi Minh Khai, Dist 1, HCMC');
  const [openHours, setOpenHours] = useState('Mon – Sat: 8:00 AM – 7:00 PM\nSun: 9:00 AM – 5:00 PM');
  const [pickupSlots, setPickupSlots] = useState<string[]>(defaultSlots);
  const [newSlot, setNewSlot] = useState('');
  const [allowDelivery, setAllowDelivery] = useState(true);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 700));
    setSaving(false);
  };

  const addSlot = () => {
    const v = newSlot.trim();
    if (v && !pickupSlots.includes(v)) {
      setPickupSlots((prev) => [...prev, v].sort());
      setNewSlot('');
    }
  };

  return (
    <AdminShell title='Settings'>
      <div className='flex items-center justify-between mb-6'>
        <div>
          <h1 className='font-serif text-xl font-semibold text-foreground'>Settings</h1>
          <p className='text-xs text-muted-foreground mt-0.5'>
            Manage store information and configuration
          </p>
        </div>
      </div>

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
                  onClick={() => setPickupSlots((prev) => prev.filter((s) => s !== slot))}
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
            <Button variant='outline' size='sm' className='h-8 text-xs gap-1' onClick={addSlot}>
              <Plus size={12} />
              Add Slot
            </Button>
          </div>
        </div>

        {/* Delivery */}
        <div className='bg-card rounded-xl border border-border shadow-sm p-5'>
          <h2 className='font-serif text-sm font-semibold text-foreground pb-2 border-b border-border mb-4'>
            Fulfillment
          </h2>
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-xs font-medium text-foreground'>Allow Delivery</p>
              <p className='text-[10px] text-muted-foreground mt-0.5'>
                Enable delivery option for customers at checkout
              </p>
            </div>
            <Switch checked={allowDelivery} onCheckedChange={setAllowDelivery} />
          </div>
        </div>

        {/* Admin account */}
        <div className='bg-card rounded-xl border border-border shadow-sm p-5 space-y-4'>
          <h2 className='font-serif text-sm font-semibold text-foreground pb-2 border-b border-border'>
            Admin Account
          </h2>
          <div className='grid sm:grid-cols-2 gap-3'>
            <div>
              <Label className='text-xs font-medium'>Current Password</Label>
              <Input type='password' className='h-9 text-sm mt-1.5' placeholder='••••••••' />
            </div>
            <div>
              <Label className='text-xs font-medium'>New Password</Label>
              <Input type='password' className='h-9 text-sm mt-1.5' placeholder='••••••••' />
            </div>
          </div>
          <Button variant='outline' size='sm' className='h-8 text-xs'>
            Change Password
          </Button>
        </div>

        {/* Save */}
        <div className='sticky bottom-0 bg-card border-t border-border -mx-4 md:-mx-6 px-4 md:px-6 py-3 flex justify-end'>
          <Button size='sm' className='h-8 text-xs gap-1.5' onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <svg className='animate-spin h-3 w-3' viewBox='0 0 24 24' fill='none'>
                  <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4' />
                  <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z' />
                </svg>
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
    </AdminShell>
  );
}
