"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { UploadVideo } from "@/components/upload-video"
import { VideoPlayer, ShotEvent } from "@/components/video-player"
import { ShotDashboard } from "@/components/shot-dashboard"

interface ShotStats { made: number; missed: number }
interface AnalysisData {
  freeThrow:   ShotStats
  layup:       ShotStats
  midrange:    ShotStats
  threePoint:  ShotStats
  dunk:        ShotStats
  shotList:    ShotEvent[]
  complete?:   boolean
}

export function TabView({ initialTab }: { initialTab: string }) {
  const searchParams = useSearchParams()
  const router       = useRouter()
  const [activeTab, setActiveTab] = useState(initialTab)
  const [shotData, setShotData]   = useState<AnalysisData | null>(null)

  // sync URL → tab
  useEffect(() => {
    const t = searchParams.get("tab")
    if (t && t !== activeTab) setActiveTab(t)
  }, [searchParams, activeTab])

  // when Analyze tab is active, poll every 2s
  useEffect(() => {
    if (activeTab !== "analyze") return;

    const filenameraw = searchParams.get("video");
    if (!filenameraw) return;
    const filename = filenameraw;


    let id: NodeJS.Timeout

    async function poll() {
      try {
        const res = await fetch(
          `http://localhost:5000/analyze?filename=${encodeURIComponent(
            filename
          )}`
        )
        if (!res.ok) throw new Error("No results")
        const data: AnalysisData = await res.json()
        setShotData(data)
        if (data.complete) clearInterval(id)
      } catch (e) {
        console.error("poll error", e)
      }
    }

    // kick off immediately, then every 2s
    poll()
    id = setInterval(poll, 2000)

    return () => clearInterval(id)
  }, [activeTab, searchParams])

  // preserve ?video on tab switch
  const onTabChange = (val: string) => {
    const vid = searchParams.get("video")
    setActiveTab(val)
    let url = `/?tab=${val}`
    if (vid) url += `&video=${encodeURIComponent(vid)}`
    router.push(url, { scroll: false })
  }

  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
      {/* … Upload trigger … */}
      <TabsList className="grid w-full grid-cols-2 mb-8">
        <TabsTrigger value="upload">Upload Video</TabsTrigger>
        <TabsTrigger value="analyze">Analyze Shots</TabsTrigger>
      </TabsList>

      <TabsContent value="upload">
        <UploadVideo />
      </TabsContent>

      <TabsContent value="analyze">
        {shotData ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              {searchParams.get("video") && (
                <VideoPlayer
                  src={`http://localhost:5000/video/${searchParams.get(
                    "video"
                  )}`}
                  events={shotData.shotList}
                />
              )}
            </div>
            <ShotDashboard data={shotData} />
          </div>
        ) : (
          <p className="p-4 text-center">Loading statistics…</p>
        )}
      </TabsContent>
    </Tabs>
  )
}
