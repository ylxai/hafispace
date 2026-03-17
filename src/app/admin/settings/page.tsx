"use client";

import { StudioProfilePanel } from "./_components/studio-profile-panel";
import { AccessControlPanel } from "./_components/access-control-panel";
import { NotificationsPanel } from "./_components/notifications-panel";
import { FormBookingPanel } from "./_components/form-booking-panel";
import { ViesusEnhancementPanel } from "./_components/viesus-enhancement-panel";
import { CustomFieldsPanel } from "./_components/custom-fields-panel";
import { CloudinaryAccountsPanel } from "@/components/admin/cloudinary-accounts";
import { PageHeader } from "@/components/admin/shared";
import { SettingsAccordion } from "@/components/admin/shared";

export default function AdminSettingsPage() {
  return (
    <section className="space-y-5">
      {/* Header */}
      <PageHeader
        label="Studio Settings"
        title="Settings"
        subtitle="Configure studio preferences, integrations, and access policies."
      />

      {/* Accordion Panels — single column, mobile-first */}
      <div className="space-y-2">
        <SettingsAccordion
          id="studio-profile"
          title="Studio Profile"
          description="Brand name, contact information"
          defaultOpen
          icon={
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          }
        >
          <StudioProfilePanel embedded />
        </SettingsAccordion>

        <SettingsAccordion
          id="access-control"
          title="Access Control"
          description="Password and security settings"
          icon={
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          }
        >
          <AccessControlPanel embedded />
        </SettingsAccordion>

        <SettingsAccordion
          id="notifications"
          title="Notifications"
          description="WhatsApp dan email notifications"
          icon={
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          }
        >
          <NotificationsPanel embedded />
        </SettingsAccordion>

        <SettingsAccordion
          id="cloudinary"
          title="Cloudinary Accounts"
          description="Storage accounts untuk upload foto"
          icon={
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
            </svg>
          }
        >
          <CloudinaryAccountsPanel embedded />
        </SettingsAccordion>

        <SettingsAccordion
          id="viesus"
          title="VIESUS Enhancement"
          description="AI photo enhancement settings"
          badge="AI"
          icon={
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          }
        >
          <ViesusEnhancementPanel embedded />
        </SettingsAccordion>

        <SettingsAccordion
          id="form-booking"
          title="Booking Form"
          description="Custom fields untuk form booking"
          icon={
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
        >
          <FormBookingPanel embedded />
        </SettingsAccordion>

        <SettingsAccordion
          id="custom-fields"
          title="Custom Fields"
          description="Field tambahan pada data booking"
          icon={
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
          }
        >
          <CustomFieldsPanel embedded />
        </SettingsAccordion>
      </div>
    </section>
  );
}
