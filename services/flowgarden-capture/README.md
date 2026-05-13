# FlowGarden Capture Agent

Pulls periodic snapshots from your Tapo camera via RTSP and feeds them into FlowGarden.

## Quick start

### 1. Enable RTSP on your Tapo C104

On your **phone**, open the Tapo app:

1. Tap the camera → top-right gear icon → **Advanced Settings**
2. Tap **Camera Account**
3. Set a **username** and **password** (this is the RTSP auth — not your TP-Link account)
4. Go back to the camera's home screen — note the **local IP** shown at the bottom (e.g. `192.168.1.45`)

> Some firmware versions: go to **Local Storage** → enable RTSP there instead.

### 2. Create your .env

```bash
cp .env.example .env
```

Edit `.env`:

```
TAPO_IP=192.168.1.45       ← camera IP from the Tapo app
TAPO_USER=admin            ← username you set in Camera Account
TAPO_PASS=yourpassword     ← password you set in Camera Account
TAPO_STREAM=stream1        ← stream1 = 1080p, stream2 = lower res
DEVICE_ID=cam-lake-castle-back
ZONE_ID=zone-lake-castle-back
CAPTURE_INTERVAL_SECONDS=300
```

### 3. Make sure FlowGarden is running

```bash
# In another terminal
pnpm --filter @flowbond/flowgarden dev
# → http://localhost:3002
```

### 4. Run the capture agent

```bash
pnpm --filter @flowbond/flowgarden-capture dev
```

You'll see:

```
[FlowGarden Capture] Starting
  Camera   : 192.168.1.45 (stream1)
  Device ID: cam-lake-castle-back
  Zone     : zone-lake-castle-back
  Saves to : /path/to/apps/flowgarden/public/captures
  Interval : 300s

[2026-05-13T...] Capturing frame from 192.168.1.45...
[2026-05-13T...] OK — saved cam-lake-castle-back_2026-05-13T10-00-00.jpg
```

The snapshot appears immediately on the FlowGarden dashboard at http://localhost:3002/flowgarden.

## Test the RTSP connection manually

```bash
# Using the bundled ffmpeg-static binary
./node_modules/ffmpeg-static/ffmpeg \
  -rtsp_transport tcp \
  -timeout 10000000 \
  -i "rtsp://USERNAME:PASSWORD@CAMERA_IP:554/stream1" \
  -vframes 1 -q:v 2 /tmp/test.jpg -y

# Open the test frame
open /tmp/test.jpg
```

If you get a connection error, check:
- Camera IP is reachable: `ping CAMERA_IP`
- Username/password are correct (set in Tapo app → Camera Account)
- Try `stream2` if stream1 times out

## Snapshot files

Snapshots are saved to `apps/flowgarden/public/captures/`:

```
cam-lake-castle-back_2026-05-13T10-00-00.jpg   ← timestamped archive
cam-lake-castle-back_latest.jpg                 ← always the freshest frame
```

The dashboard reads `_latest.jpg` — so you always see the current view.

## Move to Raspberry Pi later

1. Copy this service to the Pi
2. Change `FLOWGARDEN_API_URL` to your deployed FlowGarden URL
3. The same ffmpeg-static binary works on Linux ARM (Raspberry Pi 4)
4. Run with `pm2 start "pnpm start" --name flowgarden-capture`

## Add more cameras

Duplicate this service or add a loop in `src/index.ts` for multiple `DEVICE_ID` / `TAPO_IP` configs.
