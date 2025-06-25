'use client';

import { useRef, useEffect, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions';

const ENDPOINT = 'http://localhost:8000/process/';

export default function AudioUploadForm() {
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const wavesurfer = useRef<WaveSurfer | null>(null);
    const [start, setStart] = useState(0);
    const [end, setEnd] = useState(0);
    const regions = useRef<RegionsPlugin | null>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const url = URL.createObjectURL(file);

        setAudioUrl(url);
        wavesurfer.current?.load(url);
    };

    const handleSubmit = async (formData: FormData) => {
        const start = new Date(0);
        start.setSeconds((formData.get('start') ?? 0) as number);
        const end = new Date(0);
        end.setSeconds((formData.get('end') ?? 0) as number);

        console.log(start);
        console.log(end);
        formData.set("output_fmt", 'aac');
        const file = formData.get('input_file');

        if (!file) {
            return;
        }

        formData.set('start', start.toISOString().substring(11, 19));
        formData.set('end', end.toISOString().substring(11, 19));

        const response = await fetch(ENDPOINT, { body: formData, method: "post" });

        if (!response.ok) {
            throw Error("request failed");
        }
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = response.headers.get('Content-Disposition')?.split("filename=")[0] ?? `converted.${output_fmt}`;
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
    };

    const tree = (
        <form action={handleSubmit} className="space-y-4">
            <label className="block text-sm font-medium mb-2">
                Audio File
                <input
                    type="file"
                    name="input_file"
                    accept="audio/*"
                    onChange={handleFileChange}
                    className="mt-1 block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                    required
                />
            </label>

            {audioUrl && <div className="space-y-4 m-5">
                <div id="waveform" className="bg-gray-50 rounded-lg p-4" />

                <input type="hidden" name="start" value={start} />
                <input type="hidden" name="end" value={end} />
            </div>}

            <button
                type="submit"
                className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
                Upload Audio
            </button>
        </form>
    );


    // Initialize Wavesurfer
    useEffect(() => {
        if (!audioUrl || wavesurfer.current) {
            return;
        }

        const rgp = RegionsPlugin.create();
        regions.current = rgp;
        wavesurfer.current = WaveSurfer.create({
            container: '#waveform',
            waveColor: '#4f46e5',
            progressColor: '#6366f1',
            plugins: [rgp],
            mediaControls: true,
        });


        wavesurfer.current.on('decode', (duration) => {
            setEnd(duration);
            regions.current?.addRegion({
                start: 0,
                end: duration,
                color: 'rgba(99, 102, 241, 0.2)',
                resizeStart: true,
                resizeEnd: true,
            });
        });

        regions.current?.on('region-clicked', (region, e) => {
            e.stopPropagation() // prevent triggering a click on the waveform
            region.play();
        });

        regions.current?.on('region-updated', (region) => {
            setStart(region.start);
            setEnd(region.end);
        });

        wavesurfer.current.load(audioUrl);
    }, [audioUrl]);

    return tree;
}
