"use client";

import { StudioProfilePanel } from "./_components/studio-profile-panel";
import { AccessControlPanel } from "./_components/access-control-panel";
import { NotificationsPanel } from "./_components/notifications-panel";
import { FormBookingPanel } from "./_components/form-booking-panel";
import { ViesusEnhancementPanel } from "./_components/viesus-enhancement-panel";
import { CustomFieldsPanel } from "./_components/custom-fields-panel";
import { CloudinaryAccountsPanel } from "@/components/admin/cloudinary-accounts";

export default function AdminSettingsPage() {
  return (
    <section className="space-y-8">
      {/* Header */}
      <header className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-1 rounded-full bg-gradient-to-b from-sky-500 to-sky-700" />
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Studio Settings
            </p>
    
          </div>
        </div>
        <p className="text-sm text-slate-600 max-w-2xl">
          Configure your studio preferences, integrations, and access policies.
        </p>
      </header>

      <div className="grid gap-5 md:grid-cols-2">
        <StudioProfilePanel />
        <AccessControlPanel />
        <NotificationsPanel />
        <CloudinaryAccountsPanel />
        <ViesusEnhancementPanel />
        <FormBookingPanel />
        <CustomFieldsPanel />
      </div>
    </section>
  );
}
