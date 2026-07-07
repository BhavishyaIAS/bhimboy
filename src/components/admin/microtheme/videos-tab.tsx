"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { YouTubeEmbed } from "@/components/content/youtube-embed";
import { DragHandle, SortableList } from "@/components/admin/sortable-list";
import {
  addVideo,
  deleteVideo,
  reorderVideos,
  updateVideo,
} from "@/lib/actions/videos";
import type { Video } from "@/lib/database.types";

export function VideosTab({
  microthemeId,
  videos,
}: {
  microthemeId: string;
  videos: Video[];
}) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const result = editingId
        ? await updateVideo({ id: editingId, youtubeUrl: url, title })
        : await addVideo({ microthemeId, youtubeUrl: url, title });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(editingId ? "Video updated" : "Video added");
      setUrl("");
      setTitle("");
      setEditingId(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border p-4">
        <p className="mb-3 text-sm font-medium">
          {editingId ? "Edit video" : "Add a YouTube video"}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="video-url">YouTube URL</Label>
            <Input
              id="video-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=…"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="video-title">Title (shown to students)</Label>
            <Input
              id="video-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Panchayati Raj — full lecture"
            />
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <Button size="sm" onClick={submit} disabled={pending || !url.trim()}>
            <Plus className="h-4 w-4" />
            {pending ? "Saving…" : editingId ? "Save changes" : "Add video"}
          </Button>
          {editingId && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setEditingId(null);
                setUrl("");
                setTitle("");
              }}
            >
              Cancel
            </Button>
          )}
        </div>
      </div>

      {videos.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No videos yet — paste a YouTube link above.
        </p>
      ) : (
        <SortableList
          items={videos}
          className="space-y-3"
          onReorder={(ids) => {
            void reorderVideos({ orderedIds: ids }).then(() => router.refresh());
          }}
          renderItem={(v, drag) => (
            <div className="flex gap-2 rounded-xl border p-3">
              <DragHandle
                attributes={drag.handleAttributes}
                listeners={drag.handleListeners}
                className="mt-1 self-start"
              />
              <div className="min-w-0 flex-1">
                <div className="max-w-md">
                  <YouTubeEmbed url={v.youtube_url} title={v.title} />
                </div>
                <p className="mt-2 text-sm font-medium">
                  {v.title || <span className="text-muted-foreground">Untitled</span>}
                </p>
              </div>
              <div className="flex flex-col gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  title="Edit"
                  onClick={() => {
                    setEditingId(v.id);
                    setUrl(v.youtube_url);
                    setTitle(v.title);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  title="Delete"
                  onClick={() => {
                    if (!window.confirm("Delete this video?")) return;
                    void deleteVideo({ id: v.id }).then((r) => {
                      if (!r.ok) toast.error(r.error);
                      router.refresh();
                    });
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        />
      )}
    </div>
  );
}
