"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Upload, FileVideo, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"

export function UploadVideo() {
  const router = useRouter()

  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)

  const [videosList, setVideosList] = useState<string[]>([])
  const [selectedVideo, setSelectedVideo] = useState("")

  // Fetch existing videos
  const fetchVideos = async () => {
    try {
      const res = await fetch("http://localhost:5000/videos")
      if (!res.ok) throw new Error(res.statusText)
      setVideosList(await res.json())
    } catch (e: any) {
      console.error(e)
      setError("Unable to load video list")
    }
  }
  useEffect(() => {
    fetchVideos()
  }, [])

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }
  const handleDragLeave = () => {
    setIsDragging(false)
  }
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped?.type.startsWith("video/")) {
      setFile(dropped)
      setError(null)
    } else {
      setError("Please upload a valid video file")
    }
  }

  // File‑input handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sel = e.target.files?.[0]
    if (sel?.type.startsWith("video/")) {
      setFile(sel)
      setError(null)
    } else {
      setError("Please upload a valid video file")
    }
  }

  // XHR upload with real progress
  const handleUpload = () => {
    if (!file) return
    setUploading(true)
    setError(null)
    setProgress(0)

    const form = new FormData()
    form.append("file", file)

    const xhr = new XMLHttpRequest()
    xhr.open("POST", "http://localhost:5000/upload")
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        setProgress(Math.round((e.loaded / e.total) * 100))
      }
    }
    xhr.onload = () => {
      setUploading(false)
      if (xhr.status === 200) {
        setProgress(100)
        fetchVideos()
      } else {
        setError(`Upload failed: ${xhr.statusText}`)
      }
    }
    xhr.onerror = () => {
      setUploading(false)
      setError("Network error during upload")
    }
    xhr.send(form)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Upload Basketball Video</CardTitle>
          <CardDescription>
            Upload a video of basketball shots to analyze made and missed shots
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* ← Drag‑&‑Drop Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-12 text-center ${
              isDragging ? "border-primary bg-primary/10" : "border-border"
            } transition-colors`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => document.getElementById("video-upload")?.click()}
          >
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="rounded-full bg-primary/10 p-4">
                <FileVideo className="h-10 w-10 text-primary" />
              </div>
              <p className="text-lg font-medium">
                {isDragging
                  ? "Drop your video here"
                  : "Drag & drop a video here"}
              </p>
              <p className="text-sm text-muted-foreground">
                Or click to browse files
              </p>
              <input
                type="file"
                id="video-upload"
                accept="video/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          </div>

          {/* ← File Preview */}
          {file && (
            <div className="mt-4 flex items-center gap-2 rounded-md border p-3">
              <FileVideo className="h-5 w-5 text-primary" />
              <div className="flex-1 truncate">
                <p className="text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
            </div>
          )}

          {/* ← Error */}
          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* ← Upload Progress */}
          {uploading && (
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Uploading…</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button
            className="w-full"
            onClick={handleUpload}
            disabled={!file || uploading}
          >
            <Upload className="mr-2 h-4 w-4" />
            {uploading ? `Uploading ${progress}%` : "Upload Video"}
          </Button>
        </CardFooter>
      </Card>

      {/* Select + Start Analysis */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Select Video to Analyze</CardTitle>
          <CardDescription>
            Choose one of the videos you’ve already uploaded
          </CardDescription>
        </CardHeader>

        <CardContent>
          <select
            className="block w-full rounded border p-2"
            value={selectedVideo}
            onChange={(e) => setSelectedVideo(e.target.value)}
          >
            <option value="">— pick a video —</option>
            {videosList.map((fname) => (
              <option key={fname} value={fname}>
                {fname}
              </option>
            ))}
          </select>
        </CardContent>

        <CardFooter>
          <Button
            className="w-full"
            disabled={!selectedVideo}
            onClick={() =>
              router.push(`/?tab=analyze&video=${encodeURIComponent(selectedVideo)}`)
            }
          >
            Start Analysis
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
