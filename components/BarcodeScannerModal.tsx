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
        // Try to get camera with fallback options
        const constraints = {
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 640 },
            height: { ideal: 480 }
          },
          audio: false
        };
        
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setIsActive(true);
          canvas = document.createElement('canvas');
          ctx = canvas.getContext('2d');
          setError(''); // Clear any previous errors
          scanLoop();
        }
      } catch (e) {
        console.error('Camera access error:', e);
        // Try fallback without specific camera constraints
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            await videoRef.current.play();
            setIsActive(true);
            canvas = document.createElement('canvas');
            ctx = canvas.getContext('2d');
            setError(''); 
            scanLoop();
          }
        } catch (fallbackError) {
          setError('Не удалось получить доступ к камере. Проверьте разрешения браузера.');
          console.error('Fallback camera access failed:', fallbackError);
        }
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
      
      if (v.videoWidth === 0 || v.videoHeight === 0) {
        // Video not ready yet
        raf = requestAnimationFrame(scanLoop);
        return;
      }
      
      canvas.width = v.videoWidth;
      canvas.height = v.videoHeight;
      ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
      
      try {
        if ('BarcodeDetector' in window) {
          // Use native API when available
          // @ts-ignore
          const detector = new window.BarcodeDetector({ 
            formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'qr_code', 'data_matrix'] 
          });
          const barcodes = await detector.detect(canvas);
          if (barcodes && barcodes.length > 0) {
            const code = barcodes[0].rawValue;
            console.log('Barcode detected:', code);
            onDetected(code);
            return stop();
          }
        } else {
          // Fallback: show message that manual input is needed
          console.log('BarcodeDetector not supported in this browser');
        }
      } catch (error) {
        console.error('Barcode detection error:', error);
      }
      
      if (isActive) {
        raf = requestAnimationFrame(scanLoop);
      }
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
        {!('BarcodeDetector' in window) && (
          <div className="text-yellow-400 text-sm mb-2 p-2 bg-yellow-900 bg-opacity-20 rounded">
            ⚠️ Автоматическое сканирование не поддерживается в этом браузере. Камера будет показана для ручного ввода.
          </div>
        )}
        <div className="relative w-full aspect-[3/4] bg-black rounded overflow-hidden border border-yellow-700">
          <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
          {isActive && (
            <div className="absolute inset-0 border-2 border-green-500 m-6 rounded pointer-events-none">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-green-400 text-sm bg-black bg-opacity-70 px-2 py-1 rounded">
                  Наведите на штрих-код
                </div>
              </div>
            </div>
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


