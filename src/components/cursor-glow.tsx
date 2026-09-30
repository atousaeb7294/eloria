"use client";

import { useEffect } from "react";
import { mountCursorGlow } from "@/lib/cursor-glow";

export function CursorGlow() {
  useEffect(mountCursorGlow, []);
  return null;
}
