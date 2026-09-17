import { useEffect, useState } from "react";
import { RequireAuth, useAuth } from "../features/auth";
import client, { toApiError } from "../api/client";
import { getAddresses, createAddress, updateAddress, deleteAddress } from "../api/addresses";
import type { Address, UserProfile } from "../types/models";
import Spinner from "../components/ui/Spinner";
import ErrorBanner from "../components/ui/ErrorBanner";
import Breadcrumbs from "../components/ui/Breadcrumbs";

export async function loader() {
  return null;
}

interface AddressFormData {
  full_name: string;
  phone: string;
  address_line_1: string;
  address_line_2: string;
  city: string;
  district: string;
  state: string;
  pincode: string;
  landmark: string;
  is_default: boolean;
}

const emptyForm: AddressFormData = {
  full_name: "",
  phone: "",
  address_line_1: "",
  address_line_2: "",
  city: "",
  district: "",
  state: "",
  pincode: "",
  landmark: "",
  is_default: false,
};

function formatAddress(addr: Address): string {
  return [
    addr.address_line_1,
    addr.address_line_2,
    addr.city,
    addr.district,
    addr.state,
    addr.pincode,
  ]
    .filter(Boolean)
    .join(", ");
}

function AddressForm({ initial, onSubmit, onCancel }: { initial: AddressFormData; onSubmit: (data: AddressFormData) => Promise<void>; onCancel: () => void }) {
  const [form, setForm] = useState<AddressFormData>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (key: keyof AddressFormData, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSubmit(form);
    } catch (err: any) {
      setError(err?.response?.data?.message || toApiError(err).message);
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 rounded-btn border border-ink-soft/15 bg-paper p-5">
      {error && <ErrorBanner message={error} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="pf-name">Full Name</label>
          <input id="pf-name" className="input mt-1 w-full rounded-btn px-3 py-2 text-sm" value={form.full_name} onChange={(e) => update("full_name", e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="pf-phone">Phone</label>
          <input id="pf-phone" className="input mt-1 w-full rounded-btn px-3 py-2 text-sm" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="pf-line-1">Address Line 1</label>
          <input id="pf-line-1" className="input mt-1 w-full rounded-btn px-3 py-2 text-sm" value={form.address_line_1} onChange={(e) => update("address_line_1", e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="pf-line-2">Address Line 2 (optional)</label>
          <input id="pf-line-2" className="input mt-1 w-full rounded-btn px-3 py-2 text-sm" value={form.address_line_2} onChange={(e) => update("address_line_2", e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="pf-city">City</label>
          <input id="pf-city" className="input mt-1 w-full rounded-btn px-3 py-2 text-sm" value={form.city} onChange={(e) => update("city", e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="pf-district">District</label>
          <input id="pf-district" className="input mt-1 w-full rounded-btn px-3 py-2 text-sm" value={form.district} onChange={(e) => update("district", e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="pf-state">State</label>
          <input id="pf-state" className="input mt-1 w-full rounded-btn px-3 py-2 text-sm" value={form.state} onChange={(e) => update("state", e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="pf-pincode">Pincode</label>
          <input id="pf-pincode" className="input mt-1 w-full rounded-btn px-3 py-2 text-sm" value={form.pincode} onChange={(e) => update("pincode", e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="pf-landmark">Landmark</label>
          <input id="pf-landmark" className="input mt-1 w-full rounded-btn px-3 py-2 text-sm" value={form.landmark} onChange={(e) => update("landmark", e.target.value)} />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-ink">
        <input type="checkbox" checked={form.is_default} onChange={(e) => update("is_default", e.target.checked)} className="size-4 accent-brand-600" />
        Set as default address
      </label>
      <div className="flex gap-3">
        <button type="button" onClick={submit} disabled={saving} className="btn-primary rounded-btn px-5 py-2.5 text-sm font-semibold disabled:opacity-60">
          {saving ? "Saving…" : "Save Address"}
        </button>
        <button type="button" onClick={onCancel} className="btn-ghost rounded-btn px-5 py-2.5 text-sm">
          Cancel
        </button>
      </div>
    </div>
  );
}

function ProfileContent() {
  const { profile, refreshProfile } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(true);
  const [addressesError, setAddressesError] = useState<string | null>(null);
  const [addressForm, setAddressForm] = useState<AddressFormData | null>(null);
  const [editingAddressId, setEditingAddressId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    if (profile) {
      setName(profile.name ?? "");
      setEmail(profile.email ?? "");
      setPhone(profile.phone ?? "");
    }
  }, [profile]);

  const loadAddresses = async () => {
    try {
      setAddressesLoading(true);
      setAddressesError(null);
      setAddresses(await getAddresses());
    } catch (err: any) {
      setAddressesError(err?.response?.data?.message || "Failed to load addresses");
    } finally {
      setAddressesLoading(false);
    }
  };

  useEffect(() => {
    loadAddresses();
  }, []);

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    setProfileError(null);
    setProfileMessage(null);
    try {
      await client.patch<{ data: UserProfile }>("/auth/me/", { name, email, phone });
      await refreshProfile();
      setProfileMessage("Profile updated successfully.");
    } catch (err: any) {
      setProfileError(err?.response?.data?.message || toApiError(err).message);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAddressSubmit = async (data: AddressFormData) => {
    if (editingAddressId !== null) {
      const updated = await updateAddress(editingAddressId, data);
      setAddresses((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    } else {
      const created = await createAddress(data);
      setAddresses((prev) => [created, ...prev]);
    }
    setAddressForm(null);
    setEditingAddressId(null);
  };

  const startEdit = (addr: Address) => {
    setEditingAddressId(addr.id);
    setAddressForm({
      full_name: addr.full_name,
      phone: addr.phone,
      address_line_1: addr.address_line_1,
      address_line_2: addr.address_line_2,
      city: addr.city,
      district: addr.district,
      state: addr.state,
      pincode: addr.pincode,
      landmark: addr.landmark,
      is_default: addr.is_default,
    });
  };

  const handleDelete = async (addr: Address) => {
    if (!window.confirm(`Delete the address for ${addr.full_name}?`)) return;
    setDeletingId(addr.id);
    try {
      await deleteAddress(addr.id);
      setAddresses((prev) => prev.filter((a) => a.id !== addr.id));
    } catch (err: any) {
      setAddressesError(err?.response?.data?.message || "Failed to delete address");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "My Profile" }]} />
      <h1 className="mt-4 font-display text-2xl font-bold text-ink sm:text-3xl">My Profile</h1>

      <div className="mt-8 space-y-8">
        <section className="card p-6">
          <h2 className="font-display text-lg font-semibold text-ink">Personal Information</h2>
          {profileMessage && (
            <p className="mt-3 rounded-btn bg-green-50 px-3 py-2 text-xs font-medium text-green-700">{profileMessage}</p>
          )}
          {profileError && <div className="mt-3"><ErrorBanner message={profileError} /></div>}
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="pro-name">Full Name</label>
              <input id="pro-name" className="input mt-1 w-full rounded-btn px-3 py-2 text-sm" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="pro-email">Email</label>
              <input id="pro-email" type="email" className="input mt-1 w-full rounded-btn px-3 py-2 text-sm" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="pro-phone">Phone</label>
              <input id="pro-phone" className="input mt-1 w-full rounded-btn px-3 py-2 text-sm" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>
          <div className="mt-5">
            <button type="button" onClick={handleSaveProfile} disabled={savingProfile} className="btn-primary rounded-btn px-6 py-2.5 text-sm font-semibold disabled:opacity-60">
              {savingProfile ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </section>

        <section className="card p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-ink">Saved Addresses</h2>
            {addressForm === null && (
              <button
                type="button"
                onClick={() => { setEditingAddressId(null); setAddressForm(emptyForm); }}
                className="btn-outline rounded-btn px-4 py-2 text-sm font-semibold"
              >
                Add Address
              </button>
            )}
          </div>
          {addressesError && <div className="mt-4"><ErrorBanner message={addressesError} /></div>}

          {addressForm !== null ? (
            <div className="mt-4">
              <AddressForm
                initial={addressForm}
                onSubmit={handleAddressSubmit}
                onCancel={() => { setAddressForm(null); setEditingAddressId(null); }}
              />
            </div>
          ) : addressesLoading ? (
            <Spinner />
          ) : addresses.length === 0 ? (
            <p className="mt-4 text-sm text-ink-soft">No saved addresses yet. Add one for faster checkout.</p>
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {addresses.map((addr) => (
                <div key={addr.id} className="rounded-btn border border-ink-soft/15 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold text-ink">
                      {addr.full_name}
                      {addr.is_default && (
                        <span className="badge ml-2 bg-accent-400/20 text-ink">Default</span>
                      )}
                    </p>
                    <span className="text-xs text-ink-faint">{addr.phone}</span>
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-ink-soft">{formatAddress(addr)}</p>
                  {addr.landmark && <p className="mt-1 text-xs text-ink-faint">Near {addr.landmark}</p>}
                  <div className="mt-3 flex gap-2">
                    <button type="button" onClick={() => startEdit(addr)} className="btn-ghost rounded-btn px-3 py-1.5 text-xs font-semibold">
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(addr)}
                      disabled={deletingId === addr.id}
                      className="btn-danger rounded-btn px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
                    >
                      {deletingId === addr.id ? "Deleting…" : "Delete"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export function Component() {
  return (
    <RequireAuth>
      <ProfileContent />
    </RequireAuth>
  );
}

export default Component;