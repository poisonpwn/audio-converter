'use client';

import { useRef, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { YtUrlInput } from '@/components/ytUrlInput';
import clsx from 'clsx';
import { UploadButton } from '@/components/uploadButton';
import { ClearButton } from '@/components/clearButton';
import { FormatSelector } from '@/components/formatSelector';


const BASE_URL = "http://localhost:8000";
const PROCESS_ENDPOINT = `${BASE_URL}/process/`;
const YT_DOWNLOAD_ENDPOINT = `${BASE_URL}/yt-download/`;

export default function AudioUploadForm() {
    const [audioUrl, setAudioUrl] = useState<string>("");
    const wavesurfer = useRef<WaveSurfer | null>(null);
    const [start, setStart] = useState(0);
    const [end, setEnd] = useState(0);
    const [outputFormat, setOutputFormat] = useState('aac');
    const regions = useRef<RegionsPlugin | null>(null);
    const [awaitingSubmitResponse, setAwaitingSubmitResponse] = useState(false);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [urlInput, setUrlInput] = useState("");
    const [waveformLoading, setWaveformLoading] = useState(true);
    const [awaitingYoutubeDownload, setWaitingYoutubeDownload] = useState(false);

    // Initialize Wavesurfer
    useEffect(() => {
        setWaveformLoading(true); // reset waveformLoading at every change to audioUrl
        if (!audioUrl) return;

        if (wavesurfer.current) {
            wavesurfer.current.destroy();
        }

        if (regions.current) {
            regions.current.destroy();
        }

        const rgp = RegionsPlugin.create();
        rgp.on('region-clicked', (region, e) => {
            e.stopPropagation();
            region.play();
        })

        rgp.on('region-updated', (region) => {
            setStart(region.start);
            setEnd(region.end);
        });

        regions.current = rgp;

        const ws = WaveSurfer.create({
            container: '#waveform',
            waveColor: '#4f46e5',
            progressColor: '#6366f1',
            plugins: [rgp],
            mediaControls: true,
            barWidth: 2,
            barGap: 1,
            barRadius: 2,
        });

        ws.on('decode', (duration) => {
            setEnd(duration);
            setWaveformLoading(false);
            (new Promise((resolve) => setTimeout(resolve, 70))).then(() => {
                regions.current?.clearRegions();
                regions.current?.addRegion({
                    start: 0,
                    end: duration,
                    color: 'rgba(99, 102, 241, 0.2)',
                    resize: true,
                });
            });
        });

        wavesurfer.current = ws;
        ws.load(audioUrl);

    }, [audioUrl]);


    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (audioUrl) {
            window.URL.revokeObjectURL(audioUrl);
        }

        const url = window.URL.createObjectURL(file);
        setAudioUrl(url);
        setUrlInput("");
    };

    const handleUrlDone = async () => {
        setWaitingYoutubeDownload(true);
        setAudioUrl('');
        try {
            const response = await fetch(`${YT_DOWNLOAD_ENDPOINT}?url=${encodeURIComponent(urlInput)}`);

            if (!response.ok) { throw Error("youtube download failed") };
            const filename = response.headers.get('Content-Disposition')?.split("filename=")[1] ?? `downloaded.m4a`;

            if (fileInputRef.current?.files) {
                const container = new DataTransfer();
                const file = new File([await response.blob()], filename);
                container.items.add(file);
                fileInputRef.current.files = container.files;
                const url = window.URL.createObjectURL(file);
                setAudioUrl(url);
            }
        } finally {
            setWaitingYoutubeDownload(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget;
        const formData = new FormData(form);

        setAwaitingSubmitResponse(true);
        try {
            const start = new Date(0);
            start.setSeconds((formData.get('start') ?? 0) as number);
            const end = new Date(0);
            end.setSeconds((formData.get('end') ?? 0) as number);

            formData.set("output_fmt", outputFormat);

            formData.set('start', start.toISOString().substring(11, 19));
            formData.set('end', end.toISOString().substring(11, 19));

            const response = await fetch(PROCESS_ENDPOINT, { body: formData, method: "post" });
            if (!response.ok) console.log(response);

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = response.headers.get('Content-Disposition')?.split("filename=")[1] ?? `converted.${outputFormat}`;
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } finally {
            setAwaitingSubmitResponse(false);
        }
    };


    return (
        <div className="h-screen flex items-center justify-center bg-muted">
            <div className="w-full max-w-2xl">
                <form onSubmit={handleSubmit} className="space-y-6 p-6">
                    <div className="flex items-end gap-2">
                        <input
                            ref={fileInputRef}
                            id="audio-file"
                            type="file"
                            name="input_file"
                            accept="audio/*"
                            onChange={handleFileChange}
                            className="hidden"
                        />

                        <UploadButton
                            onClick={() => fileInputRef.current?.click()}
                            disabled={awaitingSubmitResponse}
                        />

                        <div className="flex-1 space-y-2">
                            <Label htmlFor="audio-url">or URL</Label>
                            <YtUrlInput
                                id="audio-url"
                                type="url"
                                name="input_url"
                                value={urlInput}
                                onDone={handleUrlDone}
                                onChange={(e) => { setUrlInput(e.target.value) }}
                                placeholder="eg. https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                                disabled={!!audioUrl || awaitingSubmitResponse}
                            />
                        </div>


                        {(audioUrl && !awaitingSubmitResponse) && (
                            <ClearButton
                                onClick={() => { setAudioUrl(""); setUrlInput("") }}
                            />
                        )}
                    </div>

                    <FormatSelector format={outputFormat} onFormatChange={setOutputFormat} label="Output Format" />

                    {(audioUrl || awaitingYoutubeDownload) && (
                        <div className="space-y-4 p-4 border rounded-lg">
                            {waveformLoading && (
                                <div className="flex items-center justify-center z-10 rounded-lg">
                                    <Loader2 className="w-10 h-10 text-gray-400 animate-spin" />
                                </div>
                            )}
                            <div id="waveform" className={clsx("bg-muted rounded-lg p-4", waveformLoading && "hidden")} />
                            <input type="hidden" name="start" value={start} />
                            <input type="hidden" name="end" value={end} />
                        </div>
                    )}

                    <Button
                        type="submit"
                        className="w-full bg-indigo-600 hover:bg-indigo-700"
                        disabled={!audioUrl || awaitingSubmitResponse || awaitingYoutubeDownload}
                    >
                        {awaitingSubmitResponse && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {awaitingSubmitResponse ? "Processing" : "Process Audio"}
                    </Button>
                </form>
            </div>
        </div>
    );
};
