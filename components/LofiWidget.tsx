"use client";

import * as React from "react";

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

export function LofiWidget() {
  const [open, setOpen] = React.useState(false);
  const [ready, setReady] = React.useState(false);
  const [isPlaying, setIsPlaying] = React.useState(false);

  const playerRef = React.useRef<any>(null);
  const iframeId = "lofi-player-iframe";

  // Cargar API de YouTube + crear player una vez
  React.useEffect(() => {
    const ensureScript = () => {
      const existing = document.getElementById("yt-iframe-api");
      if (existing) return;

      const tag = document.createElement("script");
      tag.id = "yt-iframe-api";
      tag.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(tag);
    };

    const createPlayer = () => {
      if (!window.YT || !window.YT.Player) return;

      if (playerRef.current) return; // ya creado

      playerRef.current = new window.YT.Player(iframeId, {
        videoId: "jfKfPfyJRdk",
        playerVars: {
          autoplay: 1,
          mute: 1,
          controls: 1,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
        },
        events: {
          onReady: () => {
            setReady(true);
            // Intentamos arrancar muteado
            try {
              playerRef.current.mute();
              playerRef.current.playVideo();
              setIsPlaying(true);
            } catch {}
          },
          onStateChange: (e: any) => {
            // YT.PlayerState.PLAYING = 1, PAUSED = 2, ENDED = 0, BUFFERING = 3, CUED = 5
            const st = e?.data;
            setIsPlaying(st === 1 || st === 3);
          },
        },
      });
    };

    // Si ya está cargada la API
    if (window.YT && window.YT.Player) {
      createPlayer();
      return;
    }

    // Si no, la cargamos
    ensureScript();
    window.onYouTubeIframeAPIReady = () => createPlayer();

    // cleanup opcional (no destruimos para mantenerlo vivo mientras navegas)
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-[9999]">
      <div className="w-[320px] overflow-hidden rounded-2xl border bg-background/95 shadow-xl backdrop-blur">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
          <p className="truncate text-sm font-semibold">Lo-fi radio</p>

          <button
            onClick={() => setOpen((v) => !v)}
            className="rounded-lg border px-2 py-1 text-xs font-medium"
            aria-label={open ? "Minimizar Lo-fi" : "Maximizar Lo-fi"}
            title={open ? "Minimizar" : "Maximizar"}
          >
            {open ? "—" : "▢"}
          </button>
        </div>

        {/* Cuerpo */}
        <div className="relative">
          {/* Minimizado: mostrar SOLO si está reproduciendo */}
          {!open ? (
            <div className="px-3 py-3 text-xs text-muted-foreground">
              {!ready ? "Cargando…" : isPlaying ? "Reproduciendo…" : ""}
            </div>
          ) : null}

          {/* Un único “contenedor” para que la API cree el iframe dentro */}
          <div
            className={
              open
                ? "block aspect-video w-full"
                : "absolute left-0 top-0 h-[1px] w-[1px] opacity-0 pointer-events-none"
            }
          >
            {/* Este div lo reemplaza YouTube por el iframe */}
            <div id={iframeId} className="h-full w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
