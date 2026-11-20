"use client";

import React from "react";
import Dashboard from "@/components/Dashboard";

export default function DashboardView({ mode = "all" }) {
  return <Dashboard mode={mode} />;
}
