# Media tools

Apply `0003_media_studio.sql` to this app's independent D1 database, deploy the renderer and media Workflow, and set `MEDIA_ENABLED=true` after configuration.

## Capabilities

- Upload MP4/MOV/WebM up to 500 MB, 10 minutes, and 4K using chunked uploads.
- Inspect video in the private FFmpeg container.
- Transcribe uploaded speech with ElevenLabs Scribe v2, language `eng`.
- Edit timed captions and export with the selected look.
- Create two or four portrait-with-product variants through fal's inherited Nano Banana Pro edit integration, choosing placement and setting.
- Select a generated variant as a video portrait, save images, download files, or delete unused media.

## Credits

| Operation | Credits |
| --- | ---: |
| Uploaded-video transcription including first export | 1,000 per started minute |
| Additional background export | 500 per started minute |
| Two product avatar variations | 5,000 |
| Four product avatar variations | 10,000 |
| Download a finished file | 0 |

The first export of a generated video is included. Local browser export does not incur additional export credits.

## Storage

Free: 100 MB and 7 days. Starter: 2 GB and 30 days. Creator: 10 GB and 90 days. Studio: 20 GB and 180 days. Up to 300 files. Unsaved image variations last 7 days. Explicitly saved images remain during an active subscription and for 30 days afterward. Incomplete uploads are cleaned up after 24 hours. Active processing delays cleanup; new operations stop when storage is full.

Keep `SITE_URL` set to this app's exact origin. The renderer only accepts its private input URLs. The pool is capped at three `standard-2` instances and sleeps after one minute idle. A complete deployment requires the container image, not only a Worker version upload.
