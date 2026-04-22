import { useEffect, useRef, useState } from 'react';

export const useVisualizer = (audioRef: React.RefObject<HTMLAudioElement | null>) => {
  const [dataArray, setDataArray] = useState<Uint8Array | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (!audioRef.current) return;

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const source = audioContext.createMediaElementSource(audioRef.current);
    const analyser = audioContext.createAnalyser();

    analyser.fftSize = 256;
    source.connect(analyser);
    analyser.connect(audioContext.destination);

    analyserRef.current = analyser;
    const bufferLength = analyser.frequencyBinCount;
    const data = new Uint8Array(bufferLength);

    const update = () => {
      analyser.getByteFrequencyData(data);
      setDataArray(new Uint8Array(data));
      animationRef.current = requestAnimationFrame(update);
    };

    update();

    return () => {
      cancelAnimationFrame(animationRef.current!);
      source.disconnect();
      analyser.disconnect();
      audioContext.close();
    };
  }, [audioRef]);

  return dataArray;
};
