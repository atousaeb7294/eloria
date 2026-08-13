"use client";

import type {
  FormEvent,
  ReactNode,
} from "react";

import {
  Bell,
  ChevronLeft,
  ChevronRight,
  Heart,
  House,
  LifeBuoy,
  Mail,
  MapPin,
  Package,
  Phone,
  Route,
  Search,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";

import { TreasuryPanel } from "@/components/profile/treasury-panel";

import Link from "next/link";
import {
  usePathname,
  useRouter,
} from "next/navigation";
import {
  useState,
} from "react";

type Locale = "fa" | "en";

type SectionKey =
  | "overview"
  | "orders"
  | "treasury"
  | "tracking"
  | "addresses"
  | "notifications"
  | "account"
  | "support";

type Copy = {
  eyebrow: string;
  title: string;
  subtitle: string;
  privateSpace: string;
  member: string;
  navTitle: string;
  overview: string;
  orders: string;
  treasury: string;
  tracking: string;
  addresses: string;
  notifications: string;
  account: string;
  support: string;
  statOrders: string;
  statTreasury: string;
  statAddresses: string;
  statNotifications: string;
  recentOrders: string;
  recentOrdersDescription: string;
  noOrders: string;
  noOrdersDescription: string;
  explore: string;
  treasuryTitle: string;
  treasuryDescription: string;
  treasuryEmpty: string;
  treasuryEmptyDescription: string;
  collections: string;
  trackingTitle: string;
  trackingDescription: string;
  trackingPlaceholder: string;
  trackingButton: string;
  trackingHelp: string;
  addressesTitle: string;
  addressesDescription: string;
  addressEmpty: string;
  addressEmptyDescription: string;
  notificationsTitle: string;
  notificationsDescription: string;
  notificationsEmpty: string;
  notificationsEmptyDescription: string;
  accountTitle: string;
  accountDescription: string;
  personalInfo: string;
  name: string;
  phone: string;
  email: string;
  authPending: string;
  security: string;
  securityDescription: string;
  supportTitle: string;
  supportDescription: string;
  contact: string;
  shipping: string;
  privacy: string;
  terms: string;
  hereForYou: string;
  hereForYouDescription: string;
  quickAccess: string;
};

const fa: Copy = {
  eyebrow: "\u0641\u0636\u0627\u06cc \u0634\u062e\u0635\u06cc \u0634\u0645\u0627 \u062f\u0631 \u0627\u0644\u0648\u0631\u06cc\u0627",
  title: "\u062d\u0633\u0627\u0628 \u0645\u0646",
  subtitle:
    "\u0633\u0641\u0627\u0631\u0634\u200c\u0647\u0627\u060c \u0627\u0646\u062a\u062e\u0627\u0628\u200c\u0647\u0627 \u0648 \u062c\u0632\u0626\u06cc\u0627\u062a \u062d\u0633\u0627\u0628 \u0634\u0645\u0627\u061b \u062f\u0631 \u0641\u0636\u0627\u06cc\u06cc \u0622\u0631\u0627\u0645\u060c \u0631\u0648\u0634\u0646 \u0648 \u0647\u0645\u0627\u0647\u0646\u06af \u0628\u0627 \u062a\u062c\u0631\u0628\u0647 \u0627\u0644\u0648\u0631\u06cc\u0627.",
  privateSpace: "\u0641\u0636\u0627\u06cc \u0634\u062e\u0635\u06cc",
  member: "\u0639\u0636\u0648 \u0627\u0644\u0648\u0631\u06cc\u0627",
  navTitle: "\u0628\u062e\u0634\u200c\u0647\u0627\u06cc \u062d\u0633\u0627\u0628",
  overview: "\u0646\u0645\u0627\u06cc \u06a9\u0644\u06cc",
  orders: "\u0633\u0641\u0627\u0631\u0634\u200c\u0647\u0627\u06cc \u0645\u0646",
  treasury: "\u06af\u0646\u062c\u06cc\u0646\u0647 \u0645\u0646",
  tracking: "\u0631\u0647\u06af\u06cc\u0631\u06cc \u0633\u0641\u0627\u0631\u0634",
  addresses: "\u0622\u062f\u0631\u0633\u200c\u0647\u0627\u06cc \u0645\u0646",
  notifications: "\u0627\u0639\u0644\u0627\u0646\u200c\u0647\u0627",
  account: "\u0627\u0637\u0644\u0627\u0639\u0627\u062a \u062d\u0633\u0627\u0628",
  support: "\u067e\u0634\u062a\u06cc\u0628\u0627\u0646\u06cc",
  statOrders: "\u0633\u0641\u0627\u0631\u0634",
  statTreasury: "\u0627\u062b\u0631 \u062f\u0631 \u06af\u0646\u062c\u06cc\u0646\u0647",
  statAddresses: "\u0622\u062f\u0631\u0633",
  statNotifications: "\u0627\u0639\u0644\u0627\u0646 \u062c\u062f\u06cc\u062f",
  recentOrders: "\u0622\u062e\u0631\u06cc\u0646 \u0633\u0641\u0627\u0631\u0634\u200c\u0647\u0627",
  recentOrdersDescription:
    "\u0648\u0636\u0639\u06cc\u062a \u062a\u0627\u0632\u0647\u200c\u062a\u0631\u06cc\u0646 \u0633\u0641\u0627\u0631\u0634\u200c\u0647\u0627\u06cc \u0634\u0645\u0627 \u062f\u0631 \u0627\u06cc\u0646 \u0628\u062e\u0634 \u0646\u0645\u0627\u06cc\u0634 \u062f\u0627\u062f\u0647 \u0645\u06cc\u200c\u0634\u0648\u062f.",
  noOrders: "\u0647\u0646\u0648\u0632 \u0633\u0641\u0627\u0631\u0634\u06cc \u062b\u0628\u062a \u0646\u0634\u062f\u0647",
  noOrdersDescription:
    "\u0627\u0648\u0644\u06cc\u0646 \u0627\u0646\u062a\u062e\u0627\u0628 \u0634\u0645\u0627\u060c \u0622\u063a\u0627\u0632 \u0627\u0648\u0644\u06cc\u0646 \u0631\u0648\u0627\u06cc\u062a \u062f\u0631 \u062d\u0633\u0627\u0628 \u0627\u0644\u0648\u0631\u06cc\u0627 \u062e\u0648\u0627\u0647\u062f \u0628\u0648\u062f.",
  explore: "\u062a\u0645\u0627\u0634\u0627\u06cc \u0622\u062b\u0627\u0631",
  treasuryTitle: "\u06af\u0646\u062c\u06cc\u0646\u0647 \u0645\u0646",
  treasuryDescription:
    "\u0622\u062b\u0627\u0631\u06cc \u06a9\u0647 \u062f\u0648\u0633\u062a \u062f\u0627\u0631\u06cc\u062f \u062f\u0648\u0628\u0627\u0631\u0647 \u0628\u0647 \u0622\u0646\u200c\u0647\u0627 \u0628\u0631\u06af\u0631\u062f\u06cc\u062f\u060c \u0627\u06cc\u0646\u062c\u0627 \u062f\u0631 \u06cc\u06a9 \u0645\u062c\u0645\u0648\u0639\u0647 \u0634\u062e\u0635\u06cc \u0646\u06af\u0647 \u062f\u0627\u0634\u062a\u0647 \u0645\u06cc\u200c\u0634\u0648\u0646\u062f.",
  treasuryEmpty: "\u06af\u0646\u062c\u06cc\u0646\u0647 \u0634\u0645\u0627 \u0647\u0646\u0648\u0632 \u062e\u0627\u0644\u06cc \u0627\u0633\u062a",
  treasuryEmptyDescription:
    "\u0647\u0646\u06af\u0627\u0645 \u062f\u06cc\u062f\u0646 \u0622\u062b\u0627\u0631\u060c \u0627\u0646\u062a\u062e\u0627\u0628\u200c\u0647\u0627\u06cc \u0645\u062d\u0628\u0648\u0628 \u062e\u0648\u062f \u0631\u0627 \u0630\u062e\u06cc\u0631\u0647 \u06a9\u0646\u06cc\u062f \u062a\u0627 \u0647\u0645\u06cc\u0634\u0647 \u062f\u0631 \u062f\u0633\u062a\u0631\u0633 \u0628\u0627\u0634\u0646\u062f.",
  collections: "\u0645\u0631\u0648\u0631 \u06af\u0646\u062c\u06cc\u0646\u0647\u200c\u0647\u0627",
  trackingTitle: "\u0631\u0647\u06af\u06cc\u0631\u06cc \u0633\u0641\u0627\u0631\u0634",
  trackingDescription:
    "\u06a9\u062f \u0633\u0641\u0627\u0631\u0634 \u0631\u0627 \u0648\u0627\u0631\u062f \u06a9\u0646\u06cc\u062f \u062a\u0627 \u0628\u0647 \u0635\u0641\u062d\u0647 \u0631\u0647\u06af\u06cc\u0631\u06cc \u0647\u062f\u0627\u06cc\u062a \u0634\u0648\u06cc\u062f.",
  trackingPlaceholder: "\u0645\u062b\u0644\u0627\u064b EL-10248",
  trackingButton: "\u0631\u0647\u06af\u06cc\u0631\u06cc",
  trackingHelp:
    "\u06a9\u062f \u0633\u0641\u0627\u0631\u0634 \u062f\u0631 \u062c\u0632\u0626\u06cc\u0627\u062a \u062e\u0631\u06cc\u062f \u0648 \u067e\u06cc\u0627\u0645 \u062a\u0623\u06cc\u06cc\u062f \u0633\u0641\u0627\u0631\u0634 \u0642\u0631\u0627\u0631 \u062f\u0627\u0631\u062f.",
  addressesTitle: "\u0622\u062f\u0631\u0633\u200c\u0647\u0627\u06cc \u0645\u0646",
  addressesDescription:
    "\u0645\u0642\u0635\u062f\u0647\u0627\u06cc \u0627\u0631\u0633\u0627\u0644 \u0634\u0645\u0627 \u0628\u0631\u0627\u06cc \u0627\u0646\u062a\u062e\u0627\u0628 \u0633\u0631\u06cc\u0639\u200c\u062a\u0631 \u062f\u0631 \u062e\u0631\u06cc\u062f\u0647\u0627\u06cc \u0628\u0639\u062f\u06cc.",
  addressEmpty: "\u0647\u0646\u0648\u0632 \u0622\u062f\u0631\u0633\u06cc \u0630\u062e\u06cc\u0631\u0647 \u0646\u0634\u062f\u0647",
  addressEmptyDescription:
    "\u067e\u0633 \u0627\u0632 \u062b\u0628\u062a \u0627\u0648\u0644\u06cc\u0646 \u0622\u062f\u0631\u0633\u060c \u0645\u0642\u0635\u062f\u0647\u0627\u06cc \u0645\u0648\u0631\u062f \u0627\u0639\u062a\u0645\u0627\u062f \u0634\u0645\u0627 \u062f\u0631 \u0627\u06cc\u0646 \u0642\u0633\u0645\u062a \u0646\u0645\u0627\u06cc\u0634 \u062f\u0627\u062f\u0647 \u0645\u06cc\u200c\u0634\u0648\u0646\u062f.",
  notificationsTitle: "\u0627\u0639\u0644\u0627\u0646\u200c\u0647\u0627",
  notificationsDescription:
    "\u062a\u063a\u06cc\u06cc\u0631\u0627\u062a \u0645\u0647\u0645 \u0633\u0641\u0627\u0631\u0634 \u0648 \u067e\u06cc\u0627\u0645\u200c\u0647\u0627\u06cc \u0636\u0631\u0648\u0631\u06cc \u062d\u0633\u0627\u0628 \u062f\u0631 \u0627\u06cc\u0646 \u0628\u062e\u0634 \u0642\u0631\u0627\u0631 \u0645\u06cc\u200c\u06af\u06cc\u0631\u0646\u062f.",
  notificationsEmpty: "\u0647\u0645\u0647\u200c\u0686\u06cc\u0632 \u0622\u0631\u0627\u0645 \u0627\u0633\u062a",
  notificationsEmptyDescription:
    "\u062f\u0631 \u062d\u0627\u0644 \u062d\u0627\u0636\u0631 \u0627\u0639\u0644\u0627\u0646 \u062e\u0648\u0627\u0646\u062f\u0647\u200c\u0646\u0634\u062f\u0647\u200c\u0627\u06cc \u0628\u0631\u0627\u06cc \u062d\u0633\u0627\u0628 \u0634\u0645\u0627 \u0648\u062c\u0648\u062f \u0646\u062f\u0627\u0631\u062f.",
  accountTitle: "\u0627\u0637\u0644\u0627\u0639\u0627\u062a \u062d\u0633\u0627\u0628",
  accountDescription:
    "\u0627\u0637\u0644\u0627\u0639\u0627\u062a \u0647\u0648\u06cc\u062a\u06cc \u0648 \u0631\u0627\u0647\u200c\u0647\u0627\u06cc \u0627\u0631\u062a\u0628\u0627\u0637\u06cc \u062d\u0633\u0627\u0628 \u0634\u0645\u0627 \u062f\u0631 \u0627\u06cc\u0646 \u0628\u062e\u0634 \u0642\u0631\u0627\u0631 \u0645\u06cc\u200c\u06af\u06cc\u0631\u062f.",
  personalInfo: "\u0627\u0637\u0644\u0627\u0639\u0627\u062a \u0634\u062e\u0635\u06cc",
  name: "\u0646\u0627\u0645 \u0648 \u0646\u0627\u0645 \u062e\u0627\u0646\u0648\u0627\u062f\u06af\u06cc",
  phone: "\u0634\u0645\u0627\u0631\u0647 \u0645\u0648\u0628\u0627\u06cc\u0644",
  email: "\u0627\u06cc\u0645\u06cc\u0644",
  authPending:
    "\u0627\u0637\u0644\u0627\u0639\u0627\u062a \u0648\u0627\u0642\u0639\u06cc \u0645\u0634\u062a\u0631\u06cc \u067e\u0633 \u0627\u0632 \u0627\u062a\u0635\u0627\u0644 \u0633\u0631\u0648\u06cc\u0633 \u0627\u062d\u0631\u0627\u0632 \u0647\u0648\u06cc\u062a \u062f\u0631 \u0627\u06cc\u0646 \u0628\u062e\u0634 \u0646\u0645\u0627\u06cc\u0634 \u062f\u0627\u062f\u0647 \u0645\u06cc\u200c\u0634\u0648\u062f.",
  security: "\u0627\u0645\u0646\u06cc\u062a \u062d\u0633\u0627\u0628",
  securityDescription:
    "\u0645\u062f\u06cc\u0631\u06cc\u062a \u0631\u0645\u0632 \u0639\u0628\u0648\u0631\u060c \u0646\u0634\u0633\u062a\u200c\u0647\u0627 \u0648 \u062a\u0646\u0638\u06cc\u0645\u0627\u062a \u0627\u0645\u0646\u06cc\u062a\u06cc \u067e\u0633 \u0627\u0632 \u0627\u062a\u0635\u0627\u0644 \u0627\u062d\u0631\u0627\u0632 \u0647\u0648\u06cc\u062a \u0627\u0632 \u0647\u0645\u06cc\u0646 \u0628\u062e\u0634 \u0627\u0646\u062c\u0627\u0645 \u0645\u06cc\u200c\u0634\u0648\u062f.",
  supportTitle: "\u067e\u0634\u062a\u06cc\u0628\u0627\u0646\u06cc",
  supportDescription:
    "\u0628\u0631\u0627\u06cc \u0633\u0624\u0627\u0644 \u062f\u0631\u0628\u0627\u0631\u0647 \u0633\u0641\u0627\u0631\u0634\u060c \u0627\u0631\u0633\u0627\u0644 \u06cc\u0627 \u0645\u062d\u0635\u0648\u0644\u0627\u062a \u0645\u06cc\u200c\u062a\u0648\u0627\u0646\u06cc\u062f \u0645\u0633\u062a\u0642\u06cc\u0645\u0627\u064b \u0628\u0627 \u0627\u0644\u0648\u0631\u06cc\u0627 \u062f\u0631 \u0627\u0631\u062a\u0628\u0627\u0637 \u0628\u0627\u0634\u06cc\u062f.",
  contact: "\u0627\u0631\u062a\u0628\u0627\u0637 \u0628\u0627 \u0627\u0644\u0648\u0631\u06cc\u0627",
  shipping: "\u0634\u0631\u0627\u06cc\u0637 \u0627\u0631\u0633\u0627\u0644",
  privacy: "\u062d\u0631\u06cc\u0645 \u062e\u0635\u0648\u0635\u06cc",
  terms: "\u0642\u0648\u0627\u0646\u06cc\u0646 \u0648 \u0634\u0631\u0627\u06cc\u0637",
  hereForYou: "\u062f\u0631 \u06a9\u0646\u0627\u0631 \u0634\u0645\u0627 \u0647\u0633\u062a\u06cc\u0645",
  hereForYouDescription:
    "\u0627\u06af\u0631 \u062f\u0631\u0628\u0627\u0631\u0647 \u0627\u0646\u062a\u062e\u0627\u0628 \u06cc\u06a9 \u0627\u062b\u0631 \u06cc\u0627 \u0648\u0636\u0639\u06cc\u062a \u0633\u0641\u0627\u0631\u0634\u062a\u0627\u0646 \u0646\u06cc\u0627\u0632 \u0628\u0647 \u0631\u0627\u0647\u0646\u0645\u0627\u06cc\u06cc \u062f\u0627\u0631\u06cc\u062f\u060c \u0627\u0632 \u0645\u0633\u06cc\u0631 \u062a\u0645\u0627\u0633 \u0628\u0627 \u0645\u0627 \u067e\u06cc\u0627\u0645 \u0628\u0641\u0631\u0633\u062a\u06cc\u062f.",
  quickAccess: "\u062f\u0633\u062a\u0631\u0633\u06cc \u0633\u0631\u06cc\u0639",
};

const en: Copy = {
  eyebrow: "Your private space in Eloria",
  title: "My account",
  subtitle:
    "Orders, saved pieces and account details in a calm, refined space designed around the Eloria experience.",
  privateSpace: "Private space",
  member: "Eloria member",
  navTitle: "Account sections",
  overview: "Overview",
  orders: "My orders",
  treasury: "My favorites",
  tracking: "Track order",
  addresses: "Addresses",
  notifications: "Notifications",
  account: "Account details",
  support: "Support",
  statOrders: "Orders",
  statTreasury: "Favorites",
  statAddresses: "Addresses",
  statNotifications: "New notices",
  recentOrders: "Recent orders",
  recentOrdersDescription:
    "The status of your latest orders will appear here.",
  noOrders: "No orders yet",
  noOrdersDescription:
    "Your first selection will begin the first story in your Eloria account.",
  explore: "Explore pieces",
  treasuryTitle: "My favorites",
  treasuryDescription:
    "Pieces you choose to revisit are saved here.",
  treasuryEmpty: "You have no favorites yet",
  treasuryEmptyDescription:
    "Save pieces you love so you can return to them anytime.",
  collections: "Browse pieces",
  trackingTitle: "Track an order",
  trackingDescription:
    "Enter an order code to continue to the tracking page.",
  trackingPlaceholder: "e.g. EL-10248",
  trackingButton: "Track",
  trackingHelp:
    "You can find the order code in your purchase details and confirmation message.",
  addressesTitle: "My addresses",
  addressesDescription:
    "Trusted delivery destinations for a faster checkout experience.",
  addressEmpty: "No saved address yet",
  addressEmptyDescription:
    "Your trusted delivery destinations will appear here after you add the first one.",
  notificationsTitle: "Notifications",
  notificationsDescription:
    "Important order updates and essential account messages appear here.",
  notificationsEmpty: "Everything is quiet",
  notificationsEmptyDescription:
    "There are currently no unread notifications for your account.",
  accountTitle: "Account details",
  accountDescription:
    "Identity and contact information belong in this section.",
  personalInfo: "Personal information",
  name: "Full name",
  phone: "Mobile",
  email: "Email",
  authPending:
    "Real customer information will appear here after the authentication service is connected.",
  security: "Account security",
  securityDescription:
    "Password, sessions and security preferences can be managed here once authentication is connected.",
  supportTitle: "Support",
  supportDescription:
    "Contact Eloria directly for questions about an order, delivery or a piece.",
  contact: "Contact Eloria",
  shipping: "Shipping policy",
  privacy: "Privacy",
  terms: "Terms",
  hereForYou: "We are here with you",
  hereForYouDescription:
    "If you need guidance about a piece or an order, send us a message through the contact page.",
  quickAccess: "Quick access",
};

const navItems: Array<{
  key: SectionKey;
  icon: typeof House;
}> = [
  { key: "overview", icon: House },
  { key: "orders", icon: Package },
  { key: "treasury", icon: Heart },
  { key: "tracking", icon: Route },
  { key: "addresses", icon: MapPin },
  { key: "notifications", icon: Bell },
  { key: "account", icon: UserRound },
  { key: "support", icon: LifeBuoy },
];

function SectionHeader({
  eyebrow,
  title,
  description,
  isPersian,
}: {
  eyebrow: string;
  title: string;
  description: string;
  isPersian: boolean;
}) {
  return (
    <header>
      <p
        className={
          isPersian
            ? "font-sans text-[11px] font-medium leading-6 tracking-normal text-[#d9be73]/60 sm:text-xs"
            : "text-[10px] font-medium tracking-[0.16em] text-[#d9be73]/60 sm:text-[11px]"
        }
      >
        {eyebrow}
      </p>

      <h2
        className={
          isPersian
            ? "font-persian-title mt-3 text-2xl text-[#f2e7ce] sm:text-3xl"
            : "mt-3 text-2xl font-semibold text-[#f2e7ce] sm:text-3xl"
        }
      >
        {title}
      </h2>

      <p
        className={
          isPersian
            ? "font-sans mt-3 max-w-2xl text-[13px] leading-8 tracking-normal text-[#cdbf9f]/64 sm:text-sm"
            : "mt-3 max-w-2xl text-sm leading-7 text-[#cdbf9f]/64"
        }
      >
        {description}
      </p>
    </header>
  );
}

function SummaryCard({
  label,
  icon: Icon,
  isPersian,
}: {
  label: string;
  icon: typeof Package;
  isPersian: boolean;
}) {
  return (
    <article className="group relative overflow-hidden rounded-[24px] border border-[#d8b967]/10 bg-[linear-gradient(150deg,rgba(7,34,25,.58),rgba(3,18,13,.50))] p-5 shadow-[0_16px_48px_rgba(0,0,0,.13)] transition duration-500 hover:-translate-y-1 hover:border-[#d8b967]/20 motion-reduce:transform-none sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p
            className={
              isPersian
                ? "font-sans text-[11px] font-medium leading-6 tracking-normal text-[#c8b991]/54"
                : "text-[10px] font-medium tracking-[0.08em] text-[#c8b991]/54"
            }
          >
            {label}
          </p>

          <p className="mt-3 font-sans text-[28px] font-semibold tabular-nums text-[#f0dfb4]">
            0
          </p>
        </div>

        <div className="grid h-11 w-11 place-items-center rounded-[16px] border border-[#d6b864]/12 bg-[#0a2b20]/56 text-[#d9bd70]/68">
          <Icon
            aria-hidden="true"
            className="h-5 w-5"
            strokeWidth={1.55}
          />
        </div>
      </div>
    </article>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  href,
  isPersian,
}: {
  icon: typeof Heart;
  title: string;
  description: string;
  action?: string;
  href?: string;
  isPersian: boolean;
}) {
  return (
    <div className="relative overflow-hidden rounded-[28px] border border-[#d8b967]/10 bg-[linear-gradient(150deg,rgba(7,34,25,.50),rgba(3,18,13,.42))] px-5 py-10 text-center sm:px-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-[-90px] h-44 w-44 -translate-x-1/2 rounded-full bg-[#d4b25d]/[0.04] blur-3xl"
      />

      <div className="relative mx-auto grid h-14 w-14 place-items-center rounded-[19px] border border-[#d8b967]/14 bg-[#0a2a1f]/56 text-[#ddc47e]/72">
        <Icon
          className="h-6 w-6"
          strokeWidth={1.5}
        />
      </div>

      <h3
        className={
          isPersian
            ? "font-persian-title relative mt-5 text-[17px] text-[#eee2c7]/92"
            : "relative mt-5 text-base font-semibold text-[#eee2c7]/92"
        }
      >
        {title}
      </h3>

      <p
        className={
          isPersian
            ? "font-sans relative mx-auto mt-3 max-w-md text-[12px] leading-7 tracking-normal text-[#c8b996]/58 sm:text-[13px]"
            : "relative mx-auto mt-3 max-w-md text-xs leading-6 text-[#c8b996]/58 sm:text-[13px]"
        }
      >
        {description}
      </p>

      {action && href ? (
        <Link
          href={href}
          className={
            isPersian
              ? "font-sans relative mt-6 inline-flex items-center gap-2 rounded-full border border-[#d9bc6d]/20 bg-[#0b3023]/62 px-5 py-2.5 text-[12px] font-medium tracking-normal text-[#ead18a] transition duration-300 hover:border-[#e5c874]/35 hover:bg-[#0d3929]"
              : "relative mt-6 inline-flex items-center gap-2 rounded-full border border-[#d9bc6d]/20 bg-[#0b3023]/62 px-5 py-2.5 text-xs font-medium text-[#ead18a] transition duration-300 hover:border-[#e5c874]/35 hover:bg-[#0d3929]"
          }
        >
          {action}

          {isPersian ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Link>
      ) : null}
    </div>
  );
}

function InfoRow({
  label,
  icon: Icon,
  isPersian,
}: {
  label: string;
  icon: typeof UserRound;
  isPersian: boolean;
}) {
  return (
    <div className="flex items-center gap-4 border-b border-[#d9bb69]/[0.07] py-4 last:border-0">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] border border-[#d9bb69]/10 bg-[#08261c]/55 text-[#d8bd72]/58">
        <Icon
          className="h-[18px] w-[18px]"
          strokeWidth={1.5}
        />
      </div>

      <div>
        <p
          className={
            isPersian
              ? "font-sans text-[10px] leading-5 tracking-normal text-[#b7aa8b]/48"
              : "text-[10px] tracking-[0.06em] text-[#b7aa8b]/48"
          }
        >
          {label}
        </p>

        <p className="mt-1 font-sans text-[13px] text-[#e6d8b8]/66">
          \u2014
        </p>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const pathname =
    usePathname();

  const router =
    useRouter();

  const locale: Locale =
    pathname
      .split("/")
      .filter(Boolean)[0] ===
    "en"
      ? "en"
      : "fa";

  const isPersian =
    locale === "fa";

  const copy =
    isPersian
      ? fa
      : en;

  const [
    active,
    setActive,
  ] = useState<SectionKey>(
    "overview",
  );

  const [
    trackingCode,
    setTrackingCode,
  ] = useState("");

  const labels: Record<
    SectionKey,
    string
  > = {
    overview: copy.overview,
    orders: copy.orders,
    treasury: copy.treasury,
    tracking: copy.tracking,
    addresses: copy.addresses,
    notifications:
      copy.notifications,
    account: copy.account,
    support: copy.support,
  };

  function chooseSection(
    key: SectionKey,
  ) {
    setActive(key);

    window.requestAnimationFrame(
      () => {
        document
          .getElementById(
            "profile-main-panel",
          )
          ?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
      },
    );
  }

  function submitTracking(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const code =
      trackingCode.trim();

    router.push(
      code
        ? `/${locale}/order-tracking?code=${encodeURIComponent(code)}`
        : `/${locale}/order-tracking`,
    );
  }

  function renderOverview(): ReactNode {
    return (
      <div className="space-y-8">
        <SectionHeader
          eyebrow={copy.overview}
          title={copy.title}
          description={copy.subtitle}
          isPersian={isPersian}
        />

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          <SummaryCard
            label={copy.statOrders}
            icon={Package}
            isPersian={isPersian}
          />
          <SummaryCard
            label={copy.statTreasury}
            icon={Heart}
            isPersian={isPersian}
          />
          <SummaryCard
            label={copy.statAddresses}
            icon={MapPin}
            isPersian={isPersian}
          />
          <SummaryCard
            label={copy.statNotifications}
            icon={Bell}
            isPersian={isPersian}
          />
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
          <div className="rounded-[30px] border border-[#d8b967]/10 bg-[#051b14]/48 p-5 sm:p-7">
            <SectionHeader
              eyebrow={copy.orders}
              title={copy.recentOrders}
              description={
                copy.recentOrdersDescription
              }
              isPersian={isPersian}
            />

            <div className="mt-6">
              <EmptyState
                icon={Package}
                title={copy.noOrders}
                description={
                  copy.noOrdersDescription
                }
                action={copy.explore}
                href={`/${locale}/products`}
                isPersian={isPersian}
              />
            </div>
          </div>

          <div className="rounded-[30px] border border-[#d8b967]/10 bg-[linear-gradient(155deg,rgba(10,45,33,.70),rgba(3,18,13,.62))] p-5 sm:p-7">
            <div className="flex items-center gap-2 text-[#dcc174]/65">
              <Sparkles
                className="h-4 w-4"
                strokeWidth={1.5}
              />

              <p
                className={
                  isPersian
                    ? "font-sans text-[11px] font-medium tracking-normal"
                    : "text-[10px] font-medium tracking-[0.12em]"
                }
              >
                {copy.quickAccess}
              </p>
            </div>

            <div className="mt-6 space-y-3">
              {[
                {
                  key:
                    "orders" as SectionKey,
                  icon: Package,
                },
                {
                  key:
                    "tracking" as SectionKey,
                  icon: Route,
                },
                {
                  key:
                    "treasury" as SectionKey,
                  icon: Heart,
                },
              ].map((item) => {
                const Icon =
                  item.icon;

                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() =>
                      chooseSection(
                        item.key,
                      )
                    }
                    className="group flex w-full items-center gap-3 rounded-[18px] border border-[#d8b967]/[0.08] bg-[#041911]/44 px-4 py-3.5 text-start transition duration-300 hover:border-[#d8b967]/20 hover:bg-[#0a2d21]/58"
                  >
                    <span className="grid h-9 w-9 place-items-center rounded-[13px] border border-[#d8b967]/10 bg-[#09291e]/48 text-[#d9bd70]/62">
                      <Icon
                        className="h-[17px] w-[17px]"
                        strokeWidth={1.5}
                      />
                    </span>

                    <span
                      className={
                        isPersian
                          ? "font-sans flex-1 text-[12px] font-medium tracking-normal text-[#dfd0ad]/72"
                          : "flex-1 text-xs font-medium text-[#dfd0ad]/72"
                      }
                    >
                      {labels[item.key]}
                    </span>

                    {isPersian ? (
                      <ChevronLeft className="h-4 w-4 text-[#cdb56e]/35" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-[#cdb56e]/35" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderTracking(): ReactNode {
    return (
      <div className="space-y-8">
        <SectionHeader
          eyebrow={copy.tracking}
          title={copy.trackingTitle}
          description={
            copy.trackingDescription
          }
          isPersian={isPersian}
        />

        <div className="relative overflow-hidden rounded-[30px] border border-[#d8b967]/11 bg-[linear-gradient(145deg,rgba(8,38,28,.68),rgba(3,18,13,.66))] p-5 sm:p-8">
          <form
            onSubmit={submitTracking}
            className="max-w-xl"
          >
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute start-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#cdb56b]/40"
                  strokeWidth={1.5}
                />

                <input
                  value={trackingCode}
                  onChange={(event) =>
                    setTrackingCode(
                      event.target.value,
                    )
                  }
                  placeholder={
                    copy.trackingPlaceholder
                  }
                  autoComplete="off"
                  className={
                    isPersian
                      ? "font-sans h-12 w-full rounded-[16px] border border-[#d7b968]/12 bg-[#03150f]/58 ps-11 pe-4 text-[13px] tracking-normal text-[#eee0bf] outline-none transition placeholder:text-[#b8aa89]/28 focus:border-[#d7b968]/30"
                      : "h-12 w-full rounded-[16px] border border-[#d7b968]/12 bg-[#03150f]/58 ps-11 pe-4 text-[13px] text-[#eee0bf] outline-none transition placeholder:text-[#b8aa89]/28 focus:border-[#d7b968]/30"
                  }
                />
              </div>

              <button
                type="submit"
                className={
                  isPersian
                    ? "font-sans inline-flex h-12 items-center justify-center rounded-[16px] border border-[#e0c577]/22 bg-[linear-gradient(180deg,#183e2f,#0d2d21)] px-6 text-[12px] font-medium tracking-normal text-[#efd992] transition hover:border-[#ead184]/38"
                    : "inline-flex h-12 items-center justify-center rounded-[16px] border border-[#e0c577]/22 bg-[linear-gradient(180deg,#183e2f,#0d2d21)] px-6 text-xs font-medium text-[#efd992] transition hover:border-[#ead184]/38"
                }
              >
                {copy.trackingButton}
              </button>
            </div>

            <p
              className={
                isPersian
                  ? "font-sans mt-4 text-[11px] leading-6 tracking-normal text-[#bbad8c]/44"
                  : "mt-4 text-[11px] leading-6 text-[#bbad8c]/44"
              }
            >
              {copy.trackingHelp}
            </p>
          </form>
        </div>
      </div>
    );
  }

  function renderAccount(): ReactNode {
    return (
      <div className="space-y-8">
        <SectionHeader
          eyebrow={copy.account}
          title={copy.accountTitle}
          description={
            copy.accountDescription
          }
          isPersian={isPersian}
        />

        <div className="grid gap-5 xl:grid-cols-2">
          <section className="rounded-[28px] border border-[#d8b967]/10 bg-[#051b14]/48 p-5 sm:p-7">
            <h3
              className={
                isPersian
                  ? "font-persian-title text-[16px] text-[#eee1c2]/90"
                  : "text-sm font-semibold text-[#eee1c2]/90"
              }
            >
              {copy.personalInfo}
            </h3>

            <div className="mt-4">
              <InfoRow
                label={copy.name}
                icon={UserRound}
                isPersian={isPersian}
              />
              <InfoRow
                label={copy.phone}
                icon={Phone}
                isPersian={isPersian}
              />
              <InfoRow
                label={copy.email}
                icon={Mail}
                isPersian={isPersian}
              />
            </div>

            <p
              className={
                isPersian
                  ? "font-sans mt-4 text-[10px] leading-6 tracking-normal text-[#b8aa8a]/38"
                  : "mt-4 text-[10px] leading-5 text-[#b8aa8a]/38"
              }
            >
              {copy.authPending}
            </p>
          </section>

          <section className="rounded-[28px] border border-[#d8b967]/10 bg-[linear-gradient(150deg,rgba(9,39,29,.62),rgba(3,18,13,.56))] p-5 sm:p-7">
            <div className="flex items-start gap-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[15px] border border-[#d8b967]/12 bg-[#0a2c20]/54 text-[#dbc075]/68">
                <ShieldCheck
                  className="h-5 w-5"
                  strokeWidth={1.5}
                />
              </span>

              <div>
                <h3
                  className={
                    isPersian
                      ? "font-persian-title text-[16px] text-[#eee1c2]/90"
                      : "text-sm font-semibold text-[#eee1c2]/90"
                  }
                >
                  {copy.security}
                </h3>

                <p
                  className={
                    isPersian
                      ? "font-sans mt-3 text-[11px] leading-7 tracking-normal text-[#c2b492]/52 sm:text-xs"
                      : "mt-3 text-xs leading-6 text-[#c2b492]/52"
                  }
                >
                  {
                    copy.securityDescription
                  }
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  function renderSupport(): ReactNode {
    const links = [
      {
        label: copy.contact,
        href: `/${locale}/contact`,
      },
      {
        label: copy.shipping,
        href:
          `/${locale}/policies/shipping`,
      },
      {
        label: copy.privacy,
        href:
          `/${locale}/policies/privacy`,
      },
      {
        label: copy.terms,
        href:
          `/${locale}/policies/terms`,
      },
    ];

    return (
      <div className="space-y-8">
        <SectionHeader
          eyebrow={copy.support}
          title={copy.supportTitle}
          description={
            copy.supportDescription
          }
          isPersian={isPersian}
        />

        <div className="grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
          <section className="rounded-[30px] border border-[#d8b967]/12 bg-[linear-gradient(150deg,rgba(11,48,35,.72),rgba(3,18,13,.68))] p-6 sm:p-8">
            <LifeBuoy
              className="h-8 w-8 text-[#dfc67d]/72"
              strokeWidth={1.4}
            />

            <h3
              className={
                isPersian
                  ? "font-persian-title mt-5 text-[18px] text-[#f0e3c5]"
                  : "mt-5 text-lg font-semibold text-[#f0e3c5]"
              }
            >
              {copy.hereForYou}
            </h3>

            <p
              className={
                isPersian
                  ? "font-sans mt-3 text-[12px] leading-8 tracking-normal text-[#c9bb98]/58 sm:text-[13px]"
                  : "mt-3 text-xs leading-7 text-[#c9bb98]/58 sm:text-[13px]"
              }
            >
              {
                copy.hereForYouDescription
              }
            </p>
          </section>

          <section className="grid gap-3 rounded-[30px] border border-[#d8b967]/10 bg-[#051b14]/48 p-5 sm:grid-cols-2 sm:p-7">
            {links.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group flex items-center justify-between gap-3 rounded-[18px] border border-[#d8b967]/[0.08] bg-[#041911]/42 px-4 py-4 transition hover:border-[#d8b967]/20 hover:bg-[#09291e]/56"
              >
                <span
                  className={
                    isPersian
                      ? "font-sans text-[12px] font-medium tracking-normal text-[#dfd0ad]/70"
                      : "text-xs font-medium text-[#dfd0ad]/70"
                  }
                >
                  {item.label}
                </span>

                {isPersian ? (
                  <ChevronLeft className="h-4 w-4 text-[#ceb66d]/35" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-[#ceb66d]/35" />
                )}
              </Link>
            ))}
          </section>
        </div>
      </div>
    );
  }

  function renderSection(): ReactNode {
    if (active === "overview") {
      return renderOverview();
    }

    if (active === "tracking") {
      return renderTracking();
    }

    if (active === "account") {
      return renderAccount();
    }

    if (active === "support") {
      return renderSupport();
    }

    if (active === "orders") {
      return (
        <div className="space-y-8">
          <SectionHeader
            eyebrow={copy.orders}
            title={copy.recentOrders}
            description={
              copy.recentOrdersDescription
            }
            isPersian={isPersian}
          />

          <EmptyState
            icon={Package}
            title={copy.noOrders}
            description={
              copy.noOrdersDescription
            }
            action={copy.explore}
            href={`/${locale}/products`}
            isPersian={isPersian}
          />
        </div>
      );
    }

    if (active === "treasury") {
      return (
        <div className="space-y-8">
          <SectionHeader
            eyebrow={copy.treasury}
            title={copy.treasuryTitle}
            description={
              copy.treasuryDescription
            }
            isPersian={isPersian}
          />

          <TreasuryPanel
            locale={locale}
            isPersian={isPersian}
            emptyTitle={copy.treasuryEmpty}
            emptyDescription={
              copy.treasuryEmptyDescription
            }
            collectionsLabel={copy.collections}
          />
        </div>
      );
    }

    if (active === "addresses") {
      return (
        <div className="space-y-8">
          <SectionHeader
            eyebrow={copy.addresses}
            title={copy.addressesTitle}
            description={
              copy.addressesDescription
            }
            isPersian={isPersian}
          />

          <EmptyState
            icon={MapPin}
            title={copy.addressEmpty}
            description={
              copy.addressEmptyDescription
            }
            isPersian={isPersian}
          />
        </div>
      );
    }

    return (
      <div className="space-y-8">
        <SectionHeader
          eyebrow={copy.notifications}
          title={copy.notificationsTitle}
          description={
            copy.notificationsDescription
          }
          isPersian={isPersian}
        />

        <EmptyState
          icon={Bell}
          title={copy.notificationsEmpty}
          description={
            copy.notificationsEmptyDescription
          }
          isPersian={isPersian}
        />
      </div>
    );
  }

  return (
    <main
      dir={isPersian ? "rtl" : "ltr"}
      className="relative min-h-screen overflow-hidden bg-[#03120d] pb-20 pt-28 text-[#eee2c7] sm:pt-32"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_-8%,rgba(24,112,81,.18),transparent_34%),radial-gradient(circle_at_88%_32%,rgba(210,175,84,.04),transparent_28%),linear-gradient(180deg,#041710_0%,#03120d_42%,#020e0a_100%)]"
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <header className="relative overflow-hidden rounded-[34px] border border-[#d8b967]/12 bg-[linear-gradient(145deg,rgba(8,40,29,.76),rgba(3,18,13,.86)_62%,rgba(7,32,24,.70))] px-5 py-7 shadow-[0_32px_120px_rgba(0,0,0,.24)] sm:px-8 sm:py-9 lg:px-10">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute end-[-100px] top-[-120px] h-72 w-72 rounded-full bg-[#d7b85f]/[0.04] blur-3xl"
          />

          <div className="relative flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="flex items-center gap-3">
                <span className="h-px w-9 bg-[linear-gradient(90deg,transparent,rgba(219,189,111,.52))]" />

                <p
                  className={
                    isPersian
                      ? "font-sans text-[11px] font-medium leading-6 tracking-normal text-[#dcc57f]/65 sm:text-xs"
                      : "text-[10px] font-medium tracking-[0.16em] text-[#dcc57f]/65 sm:text-[11px]"
                  }
                >
                  {copy.eyebrow}
                </p>
              </div>

              <h1
                className={
                  isPersian
                    ? "font-persian-title mt-4 text-[32px] text-[#f3e8ce] sm:text-[42px]"
                    : "mt-4 text-3xl font-semibold text-[#f3e8ce] sm:text-4xl"
                }
              >
                {copy.title}
              </h1>

              <p
                className={
                  isPersian
                    ? "font-sans mt-4 max-w-xl text-[13px] leading-8 tracking-normal text-[#d0c19f]/62 sm:text-sm"
                    : "mt-4 max-w-xl text-sm leading-7 text-[#d0c19f]/62"
                }
              >
                {copy.subtitle}
              </p>
            </div>

            <div className="flex items-center gap-4 rounded-[24px] border border-[#d9bb6b]/10 bg-[#041a13]/48 p-3.5 pe-5">
              <div className="grid h-14 w-14 place-items-center rounded-[18px] border border-[#d9bb6b]/16 bg-[linear-gradient(145deg,#12392b,#08251b)]">
                <span className="font-serif text-[18px] font-semibold tracking-[0.08em] text-[#e4c97d]">
                  E
                </span>
              </div>

              <div>
                <p
                  className={
                    isPersian
                      ? "font-persian-title text-[15px] text-[#eadcba]/88"
                      : "text-sm font-semibold text-[#eadcba]/88"
                  }
                >
                  {copy.member}
                </p>

                <p
                  className={
                    isPersian
                      ? "font-sans mt-1 text-[10px] tracking-normal text-[#bdaf8e]/44"
                      : "mt-1 text-[10px] text-[#bdaf8e]/44"
                  }
                >
                  {copy.privateSpace}
                </p>
              </div>
            </div>
          </div>
        </header>

        <div className="mt-5 overflow-x-auto pb-1 lg:hidden">
          <div className="flex min-w-max gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const selected =
                active === item.key;

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() =>
                    chooseSection(item.key)
                  }
                  className={
                    selected
                      ? "flex items-center gap-2 rounded-full border border-[#dfc374]/24 bg-[#0d3427]/76 px-4 py-2.5 text-[#ecd48e]"
                      : "flex items-center gap-2 rounded-full border border-[#d8b967]/[0.08] bg-[#061c15]/54 px-4 py-2.5 text-[#bdae8b]/52"
                  }
                >
                  <Icon
                    className="h-4 w-4"
                    strokeWidth={1.5}
                  />
                  <span
                    className={
                      isPersian
                        ? "font-sans text-[11px] font-medium tracking-normal"
                        : "text-[11px] font-medium"
                    }
                  >
                    {labels[item.key]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-6 grid items-start gap-6 lg:grid-cols-[278px_minmax(0,1fr)]">
          <aside className="sticky top-28 hidden overflow-hidden rounded-[30px] border border-[#d8b967]/10 bg-[linear-gradient(160deg,rgba(7,32,24,.70),rgba(3,17,12,.72))] p-3 shadow-[0_24px_80px_rgba(0,0,0,.18)] lg:block">
            <p
              className={
                isPersian
                  ? "font-sans px-3 pb-3 pt-2 text-[10px] font-medium tracking-normal text-[#cdb988]/42"
                  : "px-3 pb-3 pt-2 text-[9px] font-medium tracking-[0.14em] text-[#cdb988]/42"
              }
            >
              {copy.navTitle}
            </p>

            <nav
              aria-label={copy.navTitle}
              className="space-y-1"
            >
              {navItems.map(
                (item, index) => {
                  const Icon =
                    item.icon;
                  const selected =
                    active === item.key;

                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() =>
                        chooseSection(
                          item.key,
                        )
                      }
                      className={
                        selected
                          ? "flex w-full items-center gap-3 rounded-[19px] border border-[#d8b967]/16 bg-[linear-gradient(135deg,rgba(16,57,42,.86),rgba(8,35,26,.72))] px-3.5 py-3.5 text-start"
                          : "flex w-full items-center gap-3 rounded-[19px] border border-transparent px-3.5 py-3.5 text-start transition hover:border-[#d8b967]/[0.08] hover:bg-[#09261c]/52"
                      }
                    >
                      <span
                        className={
                          selected
                            ? "grid h-10 w-10 place-items-center rounded-[14px] border border-[#e0c374]/14 bg-[#103426]/62 text-[#e4cb82]"
                            : "grid h-10 w-10 place-items-center rounded-[14px] border border-[#d8b967]/[0.07] bg-[#061c15]/40 text-[#bdae88]/42"
                        }
                      >
                        <Icon
                          className="h-[18px] w-[18px]"
                          strokeWidth={1.5}
                        />
                      </span>

                      <span
                        className={
                          isPersian
                            ? selected
                              ? "font-sans flex-1 text-[12px] font-medium tracking-normal text-[#ecd9aa]"
                              : "font-sans flex-1 text-[12px] font-medium tracking-normal text-[#c9bb99]/60"
                            : selected
                              ? "flex-1 text-xs font-medium text-[#ecd9aa]"
                              : "flex-1 text-xs font-medium text-[#c9bb99]/60"
                        }
                      >
                        {labels[item.key]}
                      </span>

                      <span className="font-sans text-[9px] tabular-nums text-[#c5b27f]/24">
                        {String(
                          index + 1,
                        ).padStart(2, "0")}
                      </span>
                    </button>
                  );
                },
              )}
            </nav>
          </aside>

          <section
            id="profile-main-panel"
            className="scroll-mt-28 rounded-[32px] border border-[#d8b967]/10 bg-[linear-gradient(160deg,rgba(5,27,20,.68),rgba(3,17,12,.64))] p-5 shadow-[0_24px_90px_rgba(0,0,0,.16)] sm:p-7 lg:min-h-[720px] lg:p-9"
          >
            {renderSection()}
          </section>
        </div>
      </div>
    </main>
  );
}
