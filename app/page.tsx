"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const lessons = [
  { title: "A Quiet Walk Through London", subtitle: "Evening story · RP English", length: "03:08", src: "/audio/quiet-london.mp3" },
  { title: "The Art of a Proper Afternoon Tea", subtitle: "Culture · Posh British English", length: "02:42", src: "/audio/afternoon-tea.mp3" },
  { title: "Rain at the Country House", subtitle: "Sleep story · Gentle RP English", length: "03:24", src: "/audio/country-rain.mp3" },
];

const sleepOptions = [60, 120, 180];
type RepeatMode = "all" | "one" | "off";

const fmt = (seconds: number) => {
  if (!Number.isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
};

export default function Home() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const musicRef = useRef<HTMLAudioElement>(null);
  const sleepTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(0.85);
  const [repeat, setRepeat] = useState<RepeatMode>("all");
  const [sleep, setSleep] = useState(60);
  const [remaining, setRemaining] = useState(0);
  const [musicOn, setMusicOn] = useState(false);
  const lesson = lessons[index];

  const repeatLabel = useMemo(() => repeat === "all" ? "全部循环" : repeat === "one" ? "单曲循环" : "不循环", [repeat]);

  useEffect(() => {
    const saved = localStorage.getItem("dreamlingo-state");
    if (saved) {
      try {
        const state = JSON.parse(saved);
        setIndex(Math.min(state.index ?? 0, lessons.length - 1));
        setSpeed(state.speed ?? 0.85);
        setRepeat(state.repeat ?? "all");
      } catch { /* ignore damaged local state */ }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("dreamlingo-state", JSON.stringify({ index, speed, repeat }));
  }, [index, speed, repeat]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed;
  }, [speed]);

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: lesson.title,
      artist: "DreamLingo · Posh British English",
      album: "Sleep English",
    });
    navigator.mediaSession.setActionHandler("play", () => audioRef.current?.play());
    navigator.mediaSession.setActionHandler("pause", () => audioRef.current?.pause());
    navigator.mediaSession.setActionHandler("previoustrack", () => changeTrack(-1));
    navigator.mediaSession.setActionHandler("nexttrack", () => changeTrack(1));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  useEffect(() => {
    if (!remaining) return;
    const tick = setInterval(() => setRemaining(v => Math.max(0, v - 1)), 1000);
    return () => clearInterval(tick);
  }, [remaining > 0]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) await audio.play(); else audio.pause();
  };

  const changeTrack = (delta: number) => {
    const wasPlaying = !audioRef.current?.paused;
    setIndex(i => (i + delta + lessons.length) % lessons.length);
    setCurrent(0);
    window.setTimeout(() => { if (wasPlaying) audioRef.current?.play(); }, 0);
  };

  const seek = (amount: number) => {
    if (audioRef.current) audioRef.current.currentTime = Math.max(0, Math.min(duration, audioRef.current.currentTime + amount));
  };

  const cycleRepeat = () => setRepeat(v => v === "all" ? "one" : v === "one" ? "off" : "all");

  const startSleepTimer = () => {
    const pos = sleepOptions.indexOf(sleep);
    const next = remaining ? sleepOptions[(pos + 1) % sleepOptions.length] : sleep;
    setSleep(next);
    if (sleepTimer.current) clearTimeout(sleepTimer.current);
    setRemaining(next * 60);
    if (next) sleepTimer.current = setTimeout(() => {
      audioRef.current?.pause();
      musicRef.current?.pause();
      setMusicOn(false);
    }, next * 60 * 1000);
  };

  const toggleMusic = async () => {
    const music = musicRef.current;
    if (!music) return;
    if (music.paused) {
      music.volume = 0.1;
      await music.play();
      setMusicOn(true);
    } else {
      music.pause();
      setMusicOn(false);
    }
  };

  const ended = () => {
    if (repeat === "one") { audioRef.current?.play(); return; }
    if (repeat === "all" || index < lessons.length - 1) changeTrack(1);
    else setPlaying(false);
  };

  return (
    <main className="shell">
      <div className="aurora auroraOne" /><div className="aurora auroraTwo" />
      <header>
        <div><p className="eyebrow">GOOD EVENING</p><h1>DreamLingo</h1></div>
        <button className="moonButton" aria-label="夜间模式">☾</button>
      </header>

      <section className="hero" aria-label="当前播放">
        <div className={`orb ${playing ? "isPlaying" : ""}`}><span>DL</span><i /></div>
        <p className="lessonCount">LESSON {index + 1} OF {lessons.length}</p>
        <h2>{lesson.title}</h2>
        <p className="subtitle">{lesson.subtitle}</p>

        <div className="timeline">
          <input aria-label="播放进度" type="range" min="0" max={duration || 1} step="0.1" value={current} onChange={e => { if (audioRef.current) audioRef.current.currentTime = Number(e.target.value); }} style={{ "--progress": `${duration ? (current / duration) * 100 : 0}%` } as React.CSSProperties} />
          <div><span>{fmt(current)}</span><span>{duration ? fmt(duration) : lesson.length}</span></div>
        </div>

        <div className="transport">
          <button onClick={() => changeTrack(-1)} aria-label="上一课">‹</button>
          <button onClick={() => seek(-15)} className="seek" aria-label="后退15秒"><b>15</b><span>↶</span></button>
          <button onClick={togglePlay} className="play" aria-label={playing ? "暂停" : "播放"}>{playing ? "Ⅱ" : "▶"}</button>
          <button onClick={() => seek(15)} className="seek" aria-label="前进15秒"><b>15</b><span>↷</span></button>
          <button onClick={() => changeTrack(1)} aria-label="下一课">›</button>
        </div>
      </section>

      <section className="tools" aria-label="播放设置">
        <button onClick={cycleRepeat}><span className="toolIcon">↻</span><b>{repeatLabel}</b><small>点击切换</small></button>
        <button onClick={startSleepTimer}><span className="toolIcon">☾</span><b>{sleep / 60} 小时</b><small>{remaining ? `剩余 ${fmt(remaining)}` : "点击启动"}</small></button>
        <button onClick={() => setSpeed(v => v === 1.25 ? 0.75 : Math.round((v + 0.25) * 100) / 100)}><span className="speedIcon">{speed}×</span><b>播放速度</b><small>舒缓语速</small></button>
        <button onClick={toggleMusic}><span className="toolIcon">♫</span><b>背景音乐</b><small>{musicOn ? "Drifting Asleep · 开" : "点击开启"}</small></button>
      </section>

      <section className="queue">
        <div className="queueHead"><div><p className="eyebrow">TONIGHT&apos;S JOURNEY</p><h3>睡前英语</h3></div><span>{lessons.length} lessons</span></div>
        {lessons.map((item, i) => <button key={item.title} onClick={() => setIndex(i)} className={i === index ? "activeLesson" : ""}><span className="lessonNumber">{i === index && playing ? "♪" : i + 1}</span><span className="lessonMeta"><b>{item.title}</b><small>{item.subtitle}</small></span><span>{item.length}</span></button>)}
      </section>

      <audio ref={audioRef} src={lesson.src} preload="metadata" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onTimeUpdate={e => setCurrent(e.currentTarget.currentTime)} onLoadedMetadata={e => { setDuration(e.currentTarget.duration); e.currentTarget.playbackRate = speed; }} onEnded={ended} />
      <audio ref={musicRef} src="/audio/drifting-asleep.mp3" preload="metadata" loop />
    </main>
  );
}
