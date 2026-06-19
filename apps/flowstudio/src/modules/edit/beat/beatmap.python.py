#!/usr/bin/env python3
"""L2 beat analysis sidecar — librosa.

Reads an audio file, emits a beat map JSON on stdout:
  { bpm, duration, beats[], downbeats[], sections[], source }

Usage:  python3 beatmap.python.py /path/to/song.wav
Deps:   pip install librosa numpy soundfile

Kept deliberately dependency-light and deterministic so the TS layer can shell
out to it the same way on macOS (this Mac) and in CI. Downbeats are the cut
grid the assembler snaps to.
"""
import json
import sys

import numpy as np


def analyze(path: str) -> dict:
    import librosa  # imported late so a missing dep yields a clean message

    y, sr = librosa.load(path, mono=True)
    duration = float(librosa.get_duration(y=y, sr=sr))

    tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr, trim=False)
    bpm = float(np.atleast_1d(tempo)[0])
    beats = librosa.frames_to_time(beat_frames, sr=sr).tolist()

    # Downbeats: assume 4/4 and take every 4th beat as a bar start. This is a
    # robust heuristic for the dance/pop material FlowStudio targets; a true
    # meter tracker can replace this later without changing the JSON contract.
    downbeats = beats[::4] if beats else []

    # Sections via spectral-novelty segmentation, labeled by relative energy so
    # captions can target the chorus (the loudest recurring section).
    try:
        bounds = librosa.segment.agglomerative(
            librosa.feature.mfcc(y=y, sr=sr), max(2, min(8, round(duration / 12)))
        )
        bound_times = librosa.frames_to_time(bounds, sr=sr).tolist()
    except Exception:
        bound_times = [0.0]

    rms = librosa.feature.rms(y=y)[0]
    rms_times = librosa.frames_to_time(np.arange(len(rms)), sr=sr)
    sections = []
    seg_starts = sorted(set([0.0] + [t for t in bound_times if 0.0 < t < duration]))
    energies = []
    for i, start in enumerate(seg_starts):
        end = seg_starts[i + 1] if i + 1 < len(seg_starts) else duration
        mask = (rms_times >= start) & (rms_times < end)
        energies.append(float(np.mean(rms[mask])) if mask.any() else 0.0)
    if energies:
        hi = max(energies)
        for start, e in zip(seg_starts, energies):
            label = "chorus" if e >= 0.85 * hi else "verse" if e >= 0.5 * hi else "intro"
            sections.append({"start": round(start, 3), "label": label})

    return {
        "bpm": round(bpm, 2),
        "duration": round(duration, 3),
        "beats": [round(b, 3) for b in beats],
        "downbeats": [round(b, 3) for b in downbeats],
        "sections": sections,
        "source": "librosa",
    }


def main() -> int:
    if len(sys.argv) < 2:
        print(json.dumps({"error": "usage: beatmap.python.py <audio>"}), file=sys.stderr)
        return 2
    try:
        print(json.dumps(analyze(sys.argv[1])))
        return 0
    except ModuleNotFoundError as e:
        print(json.dumps({"error": f"missing dep: {e.name} (pip install librosa numpy soundfile)"}), file=sys.stderr)
        return 3
    except Exception as e:  # noqa: BLE001 — surface any failure as JSON for the TS layer
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
