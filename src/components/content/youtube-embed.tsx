import { getYouTubeId } from "@/lib/youtube";

export function YouTubeEmbed({ url, title }: { url: string; title?: string }) {
  const id = getYouTubeId(url);
  if (!id) {
    return (
      <p className="text-sm text-muted-foreground">
        Video unavailable:{" "}
        <a href={url} className="underline" target="_blank" rel="noreferrer">
          open link
        </a>
      </p>
    );
  }
  return (
    <div className="overflow-hidden rounded-lg border">
      <iframe
        className="aspect-video w-full"
        src={`https://www.youtube-nocookie.com/embed/${id}`}
        title={title || "YouTube video"}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        loading="lazy"
      />
    </div>
  );
}
