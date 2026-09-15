import { Pause, Play, RotateCcw, SkipForward } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { Button, ProgressRing } from '@/components/ui/primitives';
import { usePrefs } from '@/store/usePrefs';
import { useToasts } from '@/store/useToasts';

type Phase = 'focus' | 'break' | 'longBreak';

const LABEL: Record<Phase, string> = {
  focus: 'Focus',
  break: 'Short break',
  longBreak: 'Long break',
};

function clock(seconds: number): string {
  const safe = Math.max(0, seconds);
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function Pomodoro({ compact = false }: { compact?: boolean }) {
  const focusMinutes = usePrefs((state) => state.pomodoroFocus);
  const breakMinutes = usePrefs((state) => state.pomodoroBreak);
  const longBreakMinutes = usePrefs((state) => state.pomodoroLongBreak);
  const push = useToasts((state) => state.push);

  const [phase, setPhase] = useState<Phase>('focus');
  const [remaining, setRemaining] = useState(focusMinutes * 60);
  const [running, setRunning] = useState(false);
  const [completedRounds, setCompletedRounds] = useState(0);
  const deadline = useRef<number | null>(null);

  const durationFor = useCallback(
    (next: Phase) =>
      (next === 'focus' ? focusMinutes : next === 'break' ? breakMinutes : longBreakMinutes) * 60,
    [focusMinutes, breakMinutes, longBreakMinutes],
  );

  const switchTo = useCallback(
    (next: Phase, autostart: boolean) => {
      setPhase(next);
      setRemaining(durationFor(next));
      deadline.current = autostart ? Date.now() + durationFor(next) * 1000 : null;
      setRunning(autostart);
    },
    [durationFor],
  );

  // Reset when the preference changes while idle.
  useEffect(() => {
    if (!running) setRemaining(durationFor(phase));
  }, [durationFor, phase, running]);

  // Deadline-based so a backgrounded tab does not drift.
  useEffect(() => {
    if (!running) return;
    if (deadline.current === null) deadline.current = Date.now() + remaining * 1000;
    const tick = () => {
      const left = Math.round(((deadline.current ?? 0) - Date.now()) / 1000);
      if (left <= 0) {
        setRunning(false);
        deadline.current = null;
        setRemaining(0);
        if (phase === 'focus') {
          const rounds = completedRounds + 1;
          setCompletedRounds(rounds);
          const next: Phase = rounds % 4 === 0 ? 'longBreak' : 'break';
          push(`Focus round done. ${LABEL[next]} next.`, { tone: 'success' });
          switchTo(next, false);
        } else {
          push('Break over. Back to it.');
          switchTo('focus', false);
        }
        return;
      }
      setRemaining(left);
    };
    tick();
    const timer = window.setInterval(tick, 250);
    return () => window.clearInterval(timer);
  }, [running, phase, completedRounds, push, switchTo, remaining]);

  const total = durationFor(phase);
  const percent = total ? ((total - remaining) / total) * 100 : 0;

  return (
    <div className={cn('flex items-center gap-5', compact ? 'flex-row' : 'flex-col')}>
      <ProgressRing percent={percent} size={compact ? 92 : 168} stroke={compact ? 7 : 11}>
        <span className={cn('tabular font-display font-semibold', compact ? 'text-lg' : 'text-3xl')}>
          {clock(remaining)}
        </span>
        <span className="text-2xs text-steel">{LABEL[phase]}</span>
      </ProgressRing>

      <div className={cn('flex items-center gap-2', compact ? '' : 'flex-col')}>
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size={compact ? 'sm' : 'md'}
            onClick={() => {
              if (running) {
                setRunning(false);
                deadline.current = null;
              } else {
                deadline.current = Date.now() + remaining * 1000;
                setRunning(true);
              }
            }}
          >
            {running ? <Pause size={15} /> : <Play size={15} />}
            {running ? 'Pause' : remaining === total ? 'Start' : 'Resume'}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Reset timer"
            onClick={() => switchTo(phase, false)}
          >
            <RotateCcw size={15} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Skip to next phase"
            onClick={() => switchTo(phase === 'focus' ? 'break' : 'focus', false)}
          >
            <SkipForward size={15} />
          </Button>
        </div>
        {compact ? null : (
          <p className="text-2xs text-steel">
            {completedRounds} focus {completedRounds === 1 ? 'round' : 'rounds'} today
          </p>
        )}
      </div>
    </div>
  );
}
