import { useState } from "react";

const HUES = ["#C4573A", "#7F9B77", "#D9A03A", "#5F7FA3", "#A86B8C", "#4E7C76"];

// Global memory cache of image URLs that have already loaded.
// Prevents remounted components in virtual scrolling from flashing or re-animating.
const loadedUrls = new Set<string>();

/** Square illustration with a typographic plate as an intentional fallback. */
export function Illustration({
  src,
  word,
  topic = 0,
  className = "",
  eager = false,
  alt,
  veiled = false,
  veilHint = "Chạm để xem",
  onVeilClick,
}: {
  src: string | null;
  word: string;
  topic?: number;
  className?: string;
  eager?: boolean;
  alt?: string;
  /** Cover the picture without unloading it, so it is back in one frame when uncovered. */
  veiled?: boolean;
  veilHint?: string;
  /** Tap on the cover: the caller decides whether that uncovers for a second or opens the card. */
  onVeilClick?: (e: React.MouseEvent) => void;
}) {
  const isPrecached = src ? loadedUrls.has(src) : false;
  const [state, setState] = useState<"loading" | "ok" | "error">(isPrecached ? "ok" : "loading");
  const showImg = src && state !== "error";
  const isLoaded = showImg && (isPrecached || state === "ok");

  return (
    <figure className={`illo ${isLoaded ? "is-loaded" : ""} ${isPrecached ? "is-cached" : ""} ${veiled ? "is-veiled" : ""} ${className}`}>
      {showImg ? (
        <img
          src={src}
          alt={alt ?? ""}
          loading={eager || isPrecached ? "eager" : "lazy"}
          decoding="async"
          draggable={false}
          onLoad={() => {
            if (src) loadedUrls.add(src);
            setState("ok");
          }}
          onError={() => setState("error")}
        />
      ) : (
        <div className="plate" style={{ "--hue": HUES[topic % HUES.length], "--len": Math.max(4, word.length) } as React.CSSProperties} aria-hidden="true">
          <span className="plate-initial">{word.slice(0, 1)}</span>
          <span className="plate-word">{word}</span>
          <i className="plate-rule" />
        </div>
      )}
      {veiled && (
        <span className="illo-veil" onClick={onVeilClick} aria-hidden={!onVeilClick}>
          <span className="illo-veil-mark">?</span>
          <span className="illo-veil-hint">{veilHint}</span>
        </span>
      )}
    </figure>
  );
}
