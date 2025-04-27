"use client"

import React from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CircleCheck, CircleX } from "lucide-react"
import { Badge } from "@/components/ui/badge"

// Types
interface ShotStats { made: number; missed: number }
interface ShotEvent { id: number; type: string; made: boolean; timestamp: string }

type TabKey = 'all' | 'ft' | 'layup' | 'mid' | '3pt' | 'dunk'
const tabKeys: TabKey[] = ['all','ft','layup','mid','3pt','dunk']
const labels: Record<TabKey,string> = {
  all: 'All', ft: 'FT', layup: 'Layup', mid: 'Midrange', '3pt': '3PT', dunk: 'Dunk'
}

interface ShotDashboardProps {
  data: {
    freeThrow:   ShotStats
    layup:       ShotStats
    midrange:    ShotStats
    threePoint:  ShotStats
    dunk:        ShotStats
    shotList:    ShotEvent[]
  }
}

export function ShotDashboard({ data }: ShotDashboardProps) {
  const { freeThrow, layup, midrange, threePoint, dunk, shotList } = data

  const totalMade   = freeThrow.made + layup.made + midrange.made + threePoint.made + dunk.made
  const totalMissed = freeThrow.missed + layup.missed + midrange.missed + threePoint.missed + dunk.missed
  const totalShots  = totalMade + totalMissed
  const pct = (made:number, tot:number) => tot ? Math.round((made/tot)*100) : 0

  // shot lists
  const lists: Record<TabKey, ShotEvent[]> = {
    all: shotList,
    ft: shotList.filter(e=>e.type==='Free Throw'),
    layup: shotList.filter(e=>e.type==='Layup'),
    mid: shotList.filter(e=>e.type==='Midrange'),
    '3pt': shotList.filter(e=>e.type==='3PT'),
    dunk: shotList.filter(e=>e.type==='Dunk')
  }

  // stats per tab
  const statsMap: Record<TabKey,ShotStats> = {
    all:     { made: totalMade, missed: totalMissed },
    ft:      freeThrow,
    layup:   layup,
    mid:     midrange,
    '3pt':   threePoint,
    dunk:    dunk,
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Shot Statistics</CardTitle>
        <CardDescription>Track made and missed shots</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid grid-cols-6 w-full">
            {tabKeys.map(key=>(
              <TabsTrigger key={key} value={key}>{labels[key]}</TabsTrigger>
            ))}
          </TabsList>

          {tabKeys.map(key=>{
            const stats = statsMap[key]
            const shots = lists[key]
            return (
              <TabsContent key={key} value={key} className="space-y-4 pt-4">
                {key==='all' ? (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {(['Free Throw','Layup','Midrange','3PT','Dunk'] as const).map((t,i)=>{
                        const stat =
                          t === '3PT'       ? threePoint :
                          t === 'Free Throw'? freeThrow :
                          t === 'Layup'     ? layup     :
                          t === 'Midrange'  ? midrange  :
                          /* dunk */          dunk
                        const made = stat.made
                        const missed = stat.missed
                        const total = made + missed
                        return (
                          <div key={i} className="rounded-lg border p-3">
                            <h3 className="font-medium">{t}</h3>
                            <div className="flex items-center gap-2 mt-2">
                              <CircleCheck className="flex-none h-4 w-4 text-green-500" />
                              <span>{made}</span>
                              <CircleX className="flex-none h-4 w-4 text-red-500" />
                              <span>{missed}</span>
                              <span className="ml-auto font-medium">{pct(made, total)}%</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    <div className="rounded-lg border p-4 bg-muted/50">
                      <h3 className="font-medium text-lg">Total Shots</h3>
                      <div className="grid grid-cols-3 gap-4 mt-4">
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">Made</p>
                          <p className="text-2xl font-bold text-green-500">{totalMade}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">Missed</p>
                          <p className="text-2xl font-bold text-red-500">{totalMissed}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">Pct</p>
                          <p className="text-2xl font-bold">{pct(totalMade,totalShots)}%</p>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-lg border p-3">
                        <h3 className="font-medium">Made</h3>
                        <p className="text-2xl font-bold text-green-500">{stats.made}</p>
                      </div>
                      <div className="rounded-lg border p-3">
                        <h3 className="font-medium">Missed</h3>
                        <p className="text-2xl font-bold text-red-500">{stats.missed}</p>
                      </div>
                    </div>
                  </>
                )}

                {/* Shot log */}
                <div className="rounded-lg border">
                  <div className="p-2 border-b bg-muted/50">
                    <h3 className="font-medium">Shot Log</h3>
                  </div>
                  <div className="divide-y max-h-[240px] overflow-y-auto">
                    {shots.map(s=>(
                      <div key={s.id} className="flex items-center justify-between p-2 hover:bg-muted/50">
                        <div className="flex items-center gap-2">
                          {s.made ? <CircleCheck className="h-4 w-4 text-green-500" /> : <CircleX className="h-4 w-4 text-red-500" />}
                          <span>{s.type}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">{s.timestamp}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>
            )
          })}
        </Tabs>
      </CardContent>
    </Card>
  )
}
