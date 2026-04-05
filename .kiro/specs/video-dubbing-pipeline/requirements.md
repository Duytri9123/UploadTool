# Requirements Document

## Introduction

Nâng cấp pipeline xử lý video dubbing từ tiếng Trung sang tiếng Việt. Pipeline thay thế `openai-whisper` bằng `faster-whisper` (~4x nhanh hơn trên CPU), bổ sung multi-provider TTS (Edge-TTS với fallback gTTS), batch translation với multi-provider fallback (DeepSeek → OpenAI → HuggingFace → Google), và AudioMixer để ghép audio. Toàn bộ pipeline giữ nguyên streaming NDJSON progress và tương thích với Web UI Flask+SocketIO hiện tại.

## Glossary

- **Pipeline**: Toàn bộ luồng xử lý video từ transcription → translation → TTS → audio mixing
- **FasterWhisperTranscriber**: Component thực hiện speech-to-text sử dụng thư viện `faster-whisper`
- **BatchTranslator**: Component dịch văn bản theo batch với multi-provider fallback
- **MultiProviderTTS**: Component tổng hợp giọng nói tiếng Việt với fallback giữa Edge-TTS và gTTS
- **AudioMixer**: Component ghép TTS audio clips vào video với căn chỉnh timestamp
- **Segment**: Một đoạn audio/text có trường `start` (giây), `end` (giây), và `text`
- **NDJSON**: Newline-Delimited JSON — định dạng streaming progress event
- **VAD**: Voice Activity Detection — bộ lọc phát hiện vùng có giọng nói
- **int8**: Kiểu dữ liệu 8-bit integer dùng để quantize model, giảm bộ nhớ và tăng tốc trên CPU
- **TTS**: Text-to-Speech — tổng hợp giọng nói từ văn bản

## Requirements

### Requirement 1: Transcription với FasterWhisperTranscriber

**User Story:** As a developer, I want to replace openai-whisper with faster-whisper, so that transcription runs ~4x faster on CPU-only hardware.

#### Acceptance Criteria

1. WHEN a video file is provided, THE FasterWhisperTranscriber SHALL transcribe the audio and return a list of Segments with `start`, `end`, and `text` fields
2. WHEN loading the model, THE FasterWhisperTranscriber SHALL use `compute_type="int8"` to optimize for CPU performance
3. WHEN VAD filter is enabled in configuration, THE FasterWhisperTranscriber SHALL skip silent audio regions and exclude them from the returned Segments
4. WHEN transcription completes, THE FasterWhisperTranscriber SHALL write a source-language SRT file to the output directory
5. IF the audio extraction step fails, THEN THE FasterWhisperTranscriber SHALL emit an error-level NDJSON event and halt the Pipeline

### Requirement 2: Batch Translation với MultiProvider Fallback

**User Story:** As a developer, I want batch translation with automatic provider fallback, so that translation succeeds even when a primary provider is unavailable.

#### Acceptance Criteria

1. WHEN texts are provided for translation, THE BatchTranslator SHALL translate all texts in a single batch call per provider attempt
2. WHEN a translation provider returns an error or empty result, THE BatchTranslator SHALL automatically retry with the next provider in the fallback chain: DeepSeek → OpenAI → HuggingFace → Google
3. WHEN all configured providers fail, THE BatchTranslator SHALL return the original source texts unchanged
4. THE BatchTranslator SHALL preserve the order of input texts in the output list, such that output[i] is the translation of input[i]
5. WHEN a preferred provider is specified in the request, THE BatchTranslator SHALL attempt that provider first before following the default fallback chain
6. WHEN translation completes, THE BatchTranslator SHALL write a Vietnamese SRT file to the output directory

### Requirement 3: TTS với MultiProviderTTS

**User Story:** As a developer, I want multi-provider TTS with automatic fallback, so that Vietnamese audio is generated reliably even when Edge-TTS is unavailable.

#### Acceptance Criteria

1. WHEN Vietnamese text is provided, THE MultiProviderTTS SHALL generate an audio file using Edge-TTS as the primary provider
2. WHEN Edge-TTS fails or is unavailable, THE MultiProviderTTS SHALL fall back to gTTS to generate the audio file
3. WHEN an audio file is generated, THE MultiProviderTTS SHALL produce a non-empty audio file at the specified output path
4. IF both Edge-TTS and gTTS fail for a segment, THEN THE MultiProviderTTS SHALL skip that segment and continue processing remaining segments

### Requirement 4: Audio Mixing với AudioMixer

**User Story:** As a developer, I want to mix TTS audio clips into the video at correct timestamps, so that the dubbed audio is synchronized with the original video.

#### Acceptance Criteria

1. WHEN TTS audio clips and a source video are provided, THE AudioMixer SHALL produce an output video file containing the mixed audio track
2. WHEN placing TTS clips, THE AudioMixer SHALL delay each clip by its corresponding Segment `start` time in milliseconds
3. WHEN `keep_bg_music` is enabled, THE AudioMixer SHALL mix the original audio at `bg_volume` level with the TTS audio track
4. WHEN `keep_bg_music` is disabled, THE AudioMixer SHALL use only the TTS audio track in the output video
5. IF no TTS clips are successfully generated, THEN THE AudioMixer SHALL emit an error-level NDJSON event and halt the Pipeline

### Requirement 5: Streaming NDJSON Progress

**User Story:** As a developer, I want the pipeline to emit streaming NDJSON progress events, so that the Web UI can display real-time progress to the user.

#### Acceptance Criteria

1. WHEN the Pipeline is executing, THE Pipeline SHALL yield NDJSON lines where each line is a valid JSON object
2. WHEN a pipeline step starts or completes, THE Pipeline SHALL emit an event containing an `overall` field with an integer percentage value between 0 and 100
3. WHEN the Pipeline completes successfully, THE Pipeline SHALL emit a final event with `overall=100`
4. WHEN an error occurs during any pipeline step, THE Pipeline SHALL emit an event with `level="error"` containing a descriptive message
5. WHEN a step produces a log message, THE Pipeline SHALL emit an event with a `log` field and a `level` field indicating severity (`info`, `success`, `warning`, `error`)

### Requirement 6: Tương thích Web UI và Cấu hình

**User Story:** As a developer, I want the upgraded pipeline to remain compatible with the existing Flask+SocketIO Web UI and config.yml, so that no frontend changes are required.

#### Acceptance Criteria

1. THE Pipeline SHALL expose a `process_video_full(data: dict)` generator function with the same signature as the existing implementation
2. WHEN reading translation provider credentials, THE Pipeline SHALL load them from the `translation` section of `config.yml`
3. WHEN the `translate_provider` key is present in the request data, THE Pipeline SHALL pass it to THE BatchTranslator as the preferred provider
4. THE Pipeline SHALL accept the same input keys as the existing implementation: `video_path`, `model`, `language`, `burn_subs`, `blur_original`, `voice_convert`, `tts_voice`, `tts_engine`, `keep_bg_music`, `bg_volume`, `translate_provider`
5. WHERE subtitle burning is enabled, THE Pipeline SHALL produce a `{stem}_subbed.mp4` output file in the output directory
6. WHERE voice conversion is enabled, THE Pipeline SHALL produce a `{stem}_vi_voice.mp4` output file in the output directory
