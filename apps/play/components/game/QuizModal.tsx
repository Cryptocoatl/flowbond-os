'use client';
// QuizModal — the guide's question, read aloud. On open, the voice reads the
// question and then each answer in turn; the answer being spoken lights up
// (karaoke). Hovering an answer re-reads it and lights it; clicking answers.
// Options are shuffled (source lists the correct answer first). Retry-friendly.
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Quiz } from '@/lib/kai/worlds';
import type { VoiceCfg, useSpeech } from './useSpeech';

type Speech = ReturnType<typeof useSpeech>;

export function QuizModal({
  quiz,
  emoji,
  lang,
  voice,
  speech,
  onCorrect,
  onClose,
}: {
  quiz: Quiz;
  emoji: string;
  lang: 'es' | 'en';
  voice: { pitch: number; rate: number };
  speech: Speech;
  onCorrect: () => void;
  onClose: () => void;
}) {
  const cfg: VoiceCfg = { ...voice, lang };

  // Pair each option with whether it's correct (index 0 is right), then shuffle.
  const options = useMemo(() => {
    const arr = quiz.options.map((o, i) => ({ text: o[lang], correct: i === 0 }));
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quiz, lang]);

  const [reading, setReading] = useState<number | null>(null); // -1 = question, 0..n = option
  const [wrong, setWrong] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const doneRef = useRef(false);

  // On open: read the question, then each answer in order, lighting each up.
  useEffect(() => {
    const items = [
      { text: quiz.q[lang], onStart: () => setReading(-1) },
      ...options.map((o, i) => ({
        text: o.text,
        onStart: () => setReading(i),
        onEnd: () => setReading((r) => (r === i ? null : r)),
      })),
    ];
    speech.speakSequence(items, cfg);
    return () => speech.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const readOne = (i: number) => {
    if (doneRef.current) return;
    setReading(i);
    speech.speak(options[i].text, cfg, { onEnd: () => setReading((r) => (r === i ? null : r)) });
  };

  const pick = (i: number) => {
    if (done) return;
    if (options[i].correct) {
      doneRef.current = true;
      setDone(true);
      setWrong(null);
      speech.stop();
      speech.speak(lang === 'es' ? '¡Correcto!' : 'Correct!', cfg);
      window.setTimeout(onCorrect, 800);
    } else {
      setWrong(i);
      readOne(i);
    }
  };

  return (
    <div className="pointer-events-auto fixed inset-0 z-[70] grid place-items-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="glass w-full max-w-md animate-fade-up p-6">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-3xl">{emoji}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => speech.speak(quiz.q[lang], cfg, { onStart: () => setReading(-1), onEnd: () => setReading(null) })}
              className="rounded-full border border-white/15 px-3 py-1 text-sm text-kai-text"
              title={lang === 'es' ? 'Leer la pregunta' : 'Read the question'}
            >
              🔊
            </button>
            <button onClick={() => { speech.stop(); onClose(); }} className="rounded-full border border-white/15 px-3 py-1 text-sm text-kai-muted">
              ✕
            </button>
          </div>
        </div>

        <h2
          onClick={() => speech.speak(quiz.q[lang], cfg, { onStart: () => setReading(-1), onEnd: () => setReading(null) })}
          className={[
            'mb-4 cursor-pointer rounded-lg px-2 py-1 font-display text-lg font-semibold transition-colors',
            reading === -1 ? 'bg-kai-gold/20 text-kai-gold' : 'text-kai-text hover:bg-white/5',
          ].join(' ')}
        >
          {quiz.q[lang]}
        </h2>

        <div className="space-y-2">
          {options.map((o, i) => {
            const isWrong = wrong === i;
            const isRight = done && o.correct;
            const isReading = reading === i;
            return (
              <button
                key={i}
                onClick={() => pick(i)}
                onPointerEnter={() => readOne(i)}
                className={[
                  'w-full rounded-xl2 border px-4 py-3 text-left text-sm transition-all duration-200',
                  isRight
                    ? 'border-kai-jade/60 bg-kai-jade/20 text-kai-jade'
                    : isWrong
                      ? 'animate-shake border-red-400/50 bg-red-400/10 text-red-200'
                      : isReading
                        ? 'scale-[1.02] border-kai-gold/60 bg-kai-gold/20 text-kai-gold shadow-[0_0_20px_-4px_rgba(244,194,90,0.6)]'
                        : 'border-white/10 bg-white/[0.03] text-kai-text hover:bg-white/[0.06]',
                ].join(' ')}
              >
                {o.text}
              </button>
            );
          })}
        </div>

        {wrong !== null && !done && (
          <p className="mt-3 text-center text-[12px] text-kai-muted">
            {lang === 'es' ? 'Casi… vuelve a intentar 💛' : 'Almost… try again 💛'}
          </p>
        )}
        {done && (
          <p className="mt-3 text-center text-[13px] font-medium text-kai-jade">
            {lang === 'es' ? '¡Correcto! 🌟' : 'Correct! 🌟'}
          </p>
        )}
        <p className="mt-3 text-center text-[10px] text-kai-faint">
          {lang === 'es' ? 'Pasa el mouse por una respuesta para escucharla' : 'Hover an answer to hear it'}
        </p>
      </div>
    </div>
  );
}
