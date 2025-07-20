import { cn } from '@/lib/utils';
import { useRef, useEffect } from 'react';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.js';


type WaveformProps = {
    audioUrl: string | null,
    onTrimRangeUpdate: (start: number, end: number) => void,
    onDone: () => void,
    className: string | null,
}

export function Waveform({ audioUrl, onTrimRangeUpdate, onDone, className }: WaveformProps) {
    const waveformContainer = useRef<HTMLDivElement | null>(null);
    const wavesurfer = useRef<WaveSurfer | null>(null);

    useEffect(() => {
        if (!waveformContainer.current || wavesurfer.current) return;
        const rgp = RegionsPlugin.create();

        console.log("recreate");
        rgp.on('region-clicked', (region, e) => {
            e.stopPropagation();
            region.play();
        })

        rgp.on('region-updated', (region) => {
            onTrimRangeUpdate(region.start, region.end);
        });


        const ws = WaveSurfer.create({
            container: waveformContainer.current,
            waveColor: '#4f46e5',
            progressColor: '#6366f1',
            plugins: [rgp],
            mediaControls: true,
            barWidth: 2,
            barGap: 1,
            barRadius: 2,
        });

        ws.on('decode', (duration) => {
            onTrimRangeUpdate(0, duration);
            onDone();
            (new Promise((resolve) => setTimeout(resolve, 70))).then(() => {
                rgp.clearRegions();
                rgp.addRegion({
                    start: 0,
                    end: duration,
                    color: 'rgba(99, 102, 241, 0.2)',
                    resize: true,
                });
            });
        });

        wavesurfer.current = ws;
    }, [onDone, onTrimRangeUpdate]);

    useEffect(() => {
        if (!audioUrl) return;
        console.log('reload');

        wavesurfer.current?.load(audioUrl);
    }, [audioUrl]);


    return <div ref={waveformContainer} className={cn("bg-muted rounded-lg p-4", className)} />;
};

