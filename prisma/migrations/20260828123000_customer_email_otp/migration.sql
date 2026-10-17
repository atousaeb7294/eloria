-- The earlier 20260813150000_customer_accounts migration already creates
-- customers.emailVerifiedAt. Keep all additions safe to retry after a failure.
alter table "customers"
add column if not exists "emailVerifiedAt" timestamp(3);

alter table "customer_otp_challenges"
alter column "mobile" drop not null,
add column if not exists "email" varchar(254),
add column if not exists "channel" varchar(16) not null default 'SMS';

create index if not exists "customer_otp_challenges_email_createdAt_idx"
on "customer_otp_challenges"("email", "createdAt");

create index if not exists "customer_otp_challenges_channel_createdAt_idx"
on "customer_otp_challenges"("channel", "createdAt");
