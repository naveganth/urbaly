"use client"

import * as React from "react"
import { InsetLayout } from "@/components/inset-layout"
export default function Home() {
  const [activeTab, setActiveTab] = React.useState("Mapa")

  return (
    <InsetLayout
      activeTab={activeTab}
      onSelectTab={setActiveTab}
    ></InsetLayout>
  )
}
