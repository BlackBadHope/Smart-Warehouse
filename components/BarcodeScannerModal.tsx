import React, { useEffect, useRef, useState } from 'react';
import { ASCII_COLORS } from '../constants';

interface Props {
  show: boolean;
  onClose: () => void;
  onDetected: (code: string) => void;
}

const BarcodeScannerModal: React.FC<Props> = ({ show, onClose, onDetected }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string>('');
  const [isActive, setIsActive] = useState<boolean>(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let raf = 0;
    let canvas: HTMLCanvasElement | null = null;
    let ctx: CanvasRenderingContext2D | null = null;

    const start = async () => {
      if (!show) return;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setIsActive(true);
          canvas = document.createElement('canvas');
          ctx = canvas.getContext('2d');
          scanLoop();
        }
      } catch (e) {
        setError('Не удалось получить доступ к камере.');
      }
    };

    const stop = () => {
      setIsActive(false);
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
      if (raf) cancelAnimationFrame(raf);
    };

    const scanLoop = async () => {
      if (!videoRef.current || !ctx || !canvas) return;
      const v = videoRef.current;
      canvas.width = v.videoWidth;
      canvas.height = v.videoHeight;
      ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
      try {
        if ('BarcodeDetector' in window) {
          // Use native API when available
          // @ts-ignore
          const detector = new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'code_128', 'upc_a', 'qr_code'] });
          const barcodes = await detector.detect(canvas);
          if (barcodes && barcodes.length > 0) {
            onDetected(barcodes[0].rawValue || barcodes[0].rawValue);
            return stop();
          }
        }
      } catch {}
      raf = requestAnimationFrame(scanLoop);
    };

    start();
    return () => {
      stop();
    };
  }, [show]);

  if (!show) return null;

  return (
    <div className={`fixed inset-0 ${ASCII_COLORS.bg} bg-opacity-90 flex items-center justify-center z-50 p-4`}>
      <div className={`${ASCII_COLORS.modalBg} p-4 rounded-lg shadow-xl w-full max-w-md border-2 ${ASCII_COLORS.border}`}>
        <h3 className={`${ASCII_COLORS.accent} text-lg font-bold mb-3`}>Scan Barcode</h3>
        {error && <div className="text-red-400 text-sm mb-2">{error}</div>}
        <div className="relative w-full aspect-[3/4] bg-black rounded overflow-hidden border border-yellow-700">
          <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
          {isActive && (
            <div className="absolute inset-0 border-2 border-green-500 m-6 rounded pointer-events-none" />
          )}
        </div>
        <div className="flex justify-end gap-2 mt-3">
          <button onClick={onClose} className={`${ASCII_COLORS.buttonBg} ${ASCII_COLORS.text} p-2 px-3 rounded ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border}`}>[CANCEL]</button>
        </div>
      </div>
    </div>
  );
};

export default BarcodeScannerModal;


