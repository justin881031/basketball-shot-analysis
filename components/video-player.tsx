"use client";

import React, { useRef, useEffect, useState, useMemo, useCallback } from "react";
import { Play, Pause, SkipBack, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";

export interface ShotEvent {
  id: number;
  time: number;       // seconds
  type: string;
  made: boolean;
  timestamp: string;  // e.g. "0:05"
}

interface VideoPlayerProps {
  src: string;
  events: ShotEvent[];
}

export function VideoPlayer({ src, events }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentEvent, setCurrentEvent] = useState<ShotEvent | null>(null);

  // derive video title from src
  const videoTitle = useMemo(() => {
    const parts = src.split("/");
    return parts[parts.length - 1] || src;
  }, [src]);

  // Sort incoming events once, parsing timestamps if numeric `time` is missing
  const sortedEvents = useMemo(() => {
    // helper to parse "MM:SS" into seconds
    const parseTimestamp = (ts: string) => {
      const [m, s] = ts.split(':').map(Number);
      return m * 60 + s;
    };
    // derive an event list with numeric times
    return events
      .map(e => ({
        ...e,
        time: typeof e.time === 'number' ? e.time : parseTimestamp(e.timestamp)
      }))
      .sort((a, b) => a.time - b.time);
  }, [events]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateTime = () => {
      const t = video.currentTime;
      setCurrentTime(t);
      const evt = sortedEvents.find(e => Math.abs(e.time - t) < 0.5);
      if (evt && evt.time !== currentEvent?.time) {
        setCurrentEvent(evt);
        video.pause();
        setIsPlaying(false);
      } else if (currentEvent && Math.abs(currentEvent.time - t) > 1) {
        setCurrentEvent(null);
      }
    };

    const onLoaded = () => setDuration(video.duration);

    video.addEventListener("timeupdate", updateTime);
    video.addEventListener("loadedmetadata", onLoaded);
    return () => {
      video.removeEventListener("timeupdate", updateTime);
      video.removeEventListener("loadedmetadata", onLoaded);
    };
  }, [sortedEvents, currentEvent]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }, []);

  const handleSeek = useCallback((val: number[]) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = val[0];
    setCurrentTime(val[0]);
  }, []);

  const skipForward = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const now = video.currentTime;
    const next = sortedEvents.find(e => e.time > now + 0.1);
    console.log("Skipping forward from", now, "to", next?.time);
    if (next) {
      video.currentTime = next.time;
      setCurrentTime(next.time);
    }
  }, [sortedEvents]);

  const skipBack = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const now = video.currentTime;
    const earlier = sortedEvents.filter(e => e.time < now - 0.1);
    const prev = earlier[earlier.length - 1];
    console.log("Skipping back from", now, "to", prev?.time ?? 0);
    if (prev) {
      video.currentTime = prev.time;
      setCurrentTime(prev.time);
    } else {
      video.currentTime = 0;
      setCurrentTime(0);
    }
  }, [sortedEvents]);

  const formatTime = (t: number) => {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle>Shot Analysis - {videoTitle}</CardTitle>
        <CardDescription>Watch and analyze basketball shots</CardDescription>
      </CardHeader>
      <CardContent className="p-0 relative">
        <video
          ref={videoRef}
          className="w-full aspect-video bg-black"
          src={src}
          controls={false}
        />
        {currentEvent && (
          <div className="absolute top-4 right-4">
            <Badge
              variant={currentEvent.made ? "default" : "destructive"}
              className="text-lg px-4 py-2"
            >
              {currentEvent.type} Shot {currentEvent.made ? "Made" : "Missed"}
            </Badge>
          </div>
        )}
      </CardContent>
      <div className="p-4 space-y-4">
        <div className="flex justify-between text-sm">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
        <Slider
          value={[currentTime]}
          max={duration || 100}
          step={0.1}
          onValueChange={handleSeek}
        />
        <div className="flex justify-center items-center gap-2">
          <Button variant="outline" size="icon" onClick={skipBack}>
            <SkipBack className="h-4 w-4" />
          </Button>
          <Button size="icon" onClick={togglePlay}>
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button variant="outline" size="icon" onClick={skipForward}>
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <CardFooter className="flex justify-between text-sm text-muted-foreground">
        <span>Jump between shots using the skip buttons</span>
      </CardFooter>
    </Card>
  );
}
