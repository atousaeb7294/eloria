alter table "customers"
add column "emailVerifiedAt" timestamp(3);

alter table "customer_otp_challenges"
alter column "mobile" drop not null,
add column "email" varchar(254),
add column "channel" varchar(16) not null default 'SMS';

create index "customer_otp_challenges_email_createdAt_idx"
on "customer_otp_challenges"("email", "createdAt");

create index "customer_otp_challenges_channel_createdAt_idx"
on "customer_otp_challenges"("channel", "createdAt");