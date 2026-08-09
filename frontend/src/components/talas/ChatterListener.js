import React, { useEffect, useRef, useState } from 'react';
import { AudioWaveform, Mic, MicOff, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { formatNumber } from '../../lib/units';
import { Eyebrow, StatusChip } from './Primitives';

/**
 * DENEYSEL: Telefon mikrofonuyla sesi dinleyip baskın titreşim (chatter)
 * frekansını FFT ile bulur. 150–5.000 Hz aralığındaki en güçlü tepe alınır.
 */
export function ChatterListener({ onDetect }) {
  const [state, setState] = useState('idle'); // idle | listening | error
  const [peak, setPeak] = useState(0);
  const [level, setLevel] = useState(0);
  const refs = useRef({});

  const stop = () => {
    const r = refs.current;
    if (r.raf) cancelAnimationFrame(r.raf);
    if (r.stream) r.stream.getTracks().forEach((t) => t.stop());
    if (r.ctx && r.ctx.state !== 'closed') r.ctx.close();
    refs.current = {};
    setState('idle');
  };

  useEffect(() => stop, []);

  const start = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setState('error');
      toast.error('Bu tarayıcı mikrofon erişimini desteklemiyor');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      const Ctx = window.AudioContext || window.webkitAudioContext;
      const ctx = new Ctx();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 8192;
      src.connect(analyser);
      const bins = new Float32Array(analyser.frequencyBinCount);
      const binHz = ctx.sampleRate / analyser.fftSize;
      refs.current = { stream, ctx, analyser, raf: null };
      setState('listening');

      const loop = () => {
        analyser.getFloatFrequencyData(bins);
        let best = -Infinity;
        let bestIdx = -1;
        const from = Math.max(1, Math.floor(150 / binHz));
        const to = Math.min(bins.length - 1, Math.floor(5000 / binHz));
        for (let i = from; i <= to; i += 1) {
          if (bins[i] > best) { best = bins[i]; bestIdx = i; }
        }
        if (bestIdx > 0 && best > -85) {
          setPeak(bestIdx * binHz);
          setLevel(Math.max(0, Math.min(100, (best + 100) * 1.6)));
        }
        refs.current.raf = requestAnimationFrame(loop);
      };
      loop();
    } catch (err) {
      setState('error');
      toast.error('Mikrofon izni verilmedi', { description: 'Tarayıcı ayarlarından izin verebilirsiniz' });
    }
  };

  return (
    <div className="overflow-hidden rounded-theme border border-border bg-card" data-testid="chatter-listener">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-theme bg-muted text-accent">
          <AudioWaveform className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-card-foreground">Mikrofonla titreşim dinle</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Deneysel · telefonu tezgâha yaklaştırın</p>
        </div>
        <StatusChip tone={state === 'listening' ? 'warn' : 'neutral'}>
          {state === 'listening' ? 'Dinliyor' : state === 'error' ? 'İzin yok' : 'Kapalı'}
        </StatusChip>
      </div>

      {state === 'listening' ? (
        <div className="px-4 py-4">
          <Eyebrow>Baskın frekans</Eyebrow>
          <p className="num-xl mt-1 text-primary" data-testid="detected-hz">{formatNumber(peak, 0)} Hz</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-accent" style={{ width: `${level}%` }} />
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Ses seviyesi · kesme sırasında en yüksek tepeyi bekleyin
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-2 divide-x divide-border border-t border-border">
        <button
          type="button"
          onClick={state === 'listening' ? stop : start}
          data-testid="listen-toggle"
          className="flex items-center justify-center gap-2 px-3 py-3 text-xs font-bold text-primary transition-colors active:bg-muted/60"
        >
          {state === 'listening' ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          {state === 'listening' ? 'Durdur' : 'Dinlemeye başla'}
        </button>
        <button
          type="button"
          disabled={!(peak > 0)}
          onClick={() => {
            onDetect(Math.round(peak));
            stop();
            toast.success(`${formatNumber(peak, 0)} Hz kullanıldı`, { description: 'Kararlı devir önerileri güncellendi' });
          }}
          data-testid="use-detected-hz"
          className="flex items-center justify-center gap-2 px-3 py-3 text-xs font-bold text-accent transition-colors active:bg-muted/60 disabled:opacity-40"
        >
          <Sparkles className="h-4 w-4" />
          Bu frekansı kullan
        </button>
      </div>
    </div>
  );
}
