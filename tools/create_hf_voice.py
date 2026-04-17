import argparse
import numpy as np
import torch
import torchaudio
import sys
import types
# More aggressive mocking for SpeechBrain's lazy-loading of integrations on Windows
mock_m = types.ModuleType('mock_m')
sys.modules['k2'] = mock_m
for sub in ['k2', 'k2_fsa', 'nlp']:
    sys.modules[f'speechbrain.integrations.{sub}'] = mock_m
from speechbrain.inference.speaker import EncoderClassifier

# Ensure stdout uses UTF-8 to prevent charmap errors on Windows
if sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

def main():
    parser = argparse.ArgumentParser(description="Tạo file speaker embedding (.npy) từ file audio để dùng cho SpeechT5 (Hugging Face TTS).")
    parser.add_argument("input_audio", help="Đường dẫn đến file âm thanh chứa giọng nói muốn clone (ví dụ: my_voice.wav)")
    parser.add_argument("output_npy", help="Đường dẫn file đầu ra (ví dụ: my_voice.npy)")
    args = parser.parse_args()

    print("Đang tải mô hình trích xuất giọng nói (speechbrain)...")
    classifier = EncoderClassifier.from_hparams(
        source="speechbrain/spkrec-xvect-voxceleb", 
        savedir="tmpdir"
    )

    print(f"Đang xử lý file: {args.input_audio}")
    signal, fs = torchaudio.load(args.input_audio, backend="soundfile")
    
    # Pre-process: SpeechBrain mong đợi âm thanh 16kHz dạng mono
    if fs != 16000:
        resampler = torchaudio.transforms.Resample(orig_freq=fs, new_freq=16000)
        signal = resampler(signal)
    
    # Chuyển sang mono nếu là stereo
    if signal.shape[0] > 1:
        signal = torch.mean(signal, dim=0, keepdim=True)

    print("Đang trích xuất đặc trưng (X-vector)...")
    embeddings = classifier.encode_batch(signal)
    
    # Convert tensor (1, 1, 512) -> numpy array (1, 512)
    embeddings = embeddings.squeeze(1).detach().cpu().numpy()

    np.save(args.output_npy, embeddings)
    print(f"✅ Đã tạo thành công file embedding: {args.output_npy}")
    print("-> Bây giờ bạn có thể nhập đường dẫn file này vào ô 'Speaker Embeddings' trên giao diện ứng dụng!")

if __name__ == "__main__":
    main()
