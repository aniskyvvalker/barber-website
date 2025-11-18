# IMPERIALcut — Product Requirements Document (PRD)

Date: 2025-11-17

## Overview

This document describes the purpose, target users, key features, and expected behavior of the IMPERIALcut Barbershop Website Booking product. The site provides customers a clean, mobile-first interface to view services, select barbers, check availability, book appointments, and receive confirmations. It also includes an admin area for staff to manage availability, services, barbers, and appointments.

## Purpose and Goals

-   Provide a simple, fast booking experience for customers visiting the barbershop website.
-   Reduce phone traffic and no-shows with clear scheduling, confirmations, and reminders.
-   Give staff a concise admin dashboard to view and manage appointments, availability, messages, and service definitions.
-   Integrate with the existing Supabase backend and email function for persistence and notifications.

## Target Users / Personas

-   Walk-in customer: Browses services and contact info; may call or use the site to get store hours.
-   Booking customer: Needs to schedule appointments (new or returning), choose service and barber, and get confirmation.
-   Barber / Staff: Views schedule, marks availability, accepts/cancels appointments, and responds to messages.
-   Admin / Owner: Manages services, barbers, availability, and reviews analytics.

## Primary User Flows

1. Browse & Discover

    - User lands on homepage, views hero, services, team, gallery, testimonials, and contact details.
    - Option to open the booking flow from prominent CTAs.

2. Booking (Customer)

    - Step 1: Choose service (e.g., Men's Cut, Beard Trim) and optionally select duration/add-ons.
    - Step 2: Choose staff (select a specific barber or "Any available barber").
    - Step 3: Choose date and time from live availability (calendar/time slots based on barber/service duration).
    - Step 4: Provide contact info (name, phone, email) and optional notes.
    - Step 5: Review and confirm booking.
    - Post-action: Customer receives confirmation email and/or SMS (if configured). Booking appears in admin dashboard.

3. Admin Dashboard (Staff)
    - View upcoming appointments and appointment details.
    - Mark appointments as confirmed, completed, or canceled.
    - Toggle availability or edit working hours for each barber.
    - Manage services (create/update duration and price) and barbers (profile, photo, specialties).
    - Read messages and mark message threads as read/unread.

## Key Features (Functional Requirements)

-   Booking Flow UI

    -   Multi-step, mobile-first flow with progress and inline validation.
    -   Service selection with durations and price information.
    -   Barber selection and fallback "Any" option.
    -   Live availability calendar showing only valid time slots (no overlaps).
    -   Conflict prevention: appointments cannot be double-booked.

-   Account & Admin

    -   Password-protected admin area for staff logins.
    -   Admin pages: Appointments, Availability, Barbers, Services, Messages, Dashboard summary.

-   Persistence & Backend

    -   Use Supabase (existing `src/lib/supabase.ts`) for storing appointments, barbers, services, and messages.
    -   Appointments table fields (minimum): id, service_id, barber_id (nullable), start_time, end_time, customer_name, customer_email, customer_phone, notes, status (booked/confirmed/cancelled/completed), created_at, is_read (for admin).

-   Notifications

    -   Send booking confirmation emails via the existing Supabase function (`supabase/functions/send-booking-email`).
    -   Admin notification for new bookings (email and/or admin dashboard indicator).
    -   Optional SMS reminders (future).

-   Validation & Edge Cases

    -   Validate required fields (service, date/time, name, contact method).
    -   Prevent selecting past dates or times outside a barber's working hours.
    -   Handle daylight savings and timezone of the barbershop (display and store in UTC).
    -   Gracefully handle backend errors and show user-friendly messages.

-   Accessibility & UX
    -   Keyboard navigable booking flow; proper ARIA attributes on calendar and form controls.
    -   High-contrast readable text, large tap targets, and responsive layout.

## Non-functional Requirements

-   Performance

    -   Booking flow should load quickly on mobile networks. Lazy-load images and non-critical scripts.

-   Reliability

    -   Retry transient email failures; show clear feedback on persistent failures.

-   Security & Privacy

    -   Protect admin endpoints behind authentication and role checks in Supabase.
    -   Sanitize and validate all user inputs server-side.
    -   Store only necessary PII and provide contact privacy info on the site.

-   Internationalization
    -   Initially English only; keep text keys isolated for future i18n work.

## Integrations

-   Supabase: Primary DB and authentication.
-   Supabase Edge Function: Booking confirmation email (already included in repo under `supabase/functions/send-booking-email`).
-   Optional: External SMS provider (Twilio) for reminders (future).

## User Interface / Wireframe Notes

-   Homepage: Hero CTA "Book Now" opens booking modal or dedicated page.
-   Booking UI: Sticky progress indicator; stepper style with back/next.
-   Calendar: Weekly view + day view with available slots; disable unavailable dates.
-   Admin Dashboard: Table/list of upcoming appointments with quick actions (confirm, cancel, mark read).

## Acceptance Criteria

1. Customers can complete a booking end-to-end and receive an email confirmation.
2. Admin can view new bookings in the dashboard and mark them as read/confirmed.
3. Booking system enforces service durations and barber availability to avoid conflicts.
4. The site is responsive and accessible by WCAG 2.1 AA-level basics (color contrast, keyboard navigation).

## Analytics & KPIs

-   Track bookings per week, no-show rate, conversion from homepage CTA, and repeat customers.
-   Monitor latency for booking creation and email dispatch.

## Data Model (High-level)

-   services: id, name, duration_minutes, price_cents, description, created_at
-   barbers: id, name, avatar_url, specialties, working_hours (structured), created_at
-   appointments: id, service_id, barber_id, start_time, end_time, customer_name, customer_email, customer_phone, notes, status, created_at, is_read
-   messages: id, name, email, message, created_at, is_read

## Edge Cases & Handling

-   Simultaneous booking attempts: server-side check to confirm slot availability before insert; return friendly conflict message if slot taken.
-   Offline customers: show "Booking failed — try again" and allow re-submission.
-   Admin cancels an appointment: send cancellation email to customer and free the slot.

## Roadmap / Next Steps

1. Implement booking UI and integrate with Supabase appointments table.
2. Wire up the email function to send confirmations on successful booking.
3. Build basic admin dashboard pages (appointments, availability, barbers, services).
4. Add analytics and monitoring.

## Maintenance & Operational Notes

-   Keep the Supabase function logs monitored for email failures.
-   Create a simple maintenance mode to pause booking during store closures or holidays.

## Contact / Owners

Product owner: IMPERIALcut management (site owner)  
Engineering: repository maintainers

## Revision History

-   2025-11-17 — Initial PRD created.
