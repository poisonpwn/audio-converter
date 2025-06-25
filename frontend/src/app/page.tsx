'use client';

import { useRef, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

const PROCESS_ENDPOINT = 'http://localhost:8000/process/';

export default function AudioUploadForm() {
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const wavesurfer = useRef<WaveSurfer | null>(null);
    const [start, setStart] = useState(0);
    const [end, setEnd] = useState(0);
    const [outputFormat, setOutputFormat] = useState('aac');
    const regions = useRef<RegionsPlugin | null>(null);
    const [loading, setLoading] = useState(false);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const url = URL.createObjectURL(file);
        setAudioUrl(url);
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget;
        const formData = new FormData(form);

        setLoading(true);
        try {
            const start = new Date(0);
            start.setSeconds((formData.get('start') ?? 0) as number);
            const end = new Date(0);
            end.setSeconds((formData.get('end') ?? 0) as number);

            formData.set("output_fmt", outputFormat);

            formData.set('start', start.toISOString().substring(11, 19));
            formData.set('end', end.toISOString().substring(11, 19));

            setAudioUrl(null);
            const response = await fetch(PROCESS_ENDPOINT, { body: formData, method: "post" });
            if (!response.ok) throw Error("Request failed");

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = response.headers.get('Content-Disposition')?.split("filename=")[1] ?? `converted.${outputFormat}`;
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } finally {
            setLoading(false);
            form.reset();
        }
    };

    // Initialize Wavesurfer
    useEffect(() => {
        if (!audioUrl) return;
        if (wavesurfer.current) {
            wavesurfer.current?.load(audioUrl);
            return;
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
            regions.current?.clearRegions();
            regions.current?.addRegion({
                start: 0,
                end: duration,
                color: 'rgba(99, 102, 241, 0.2)',
                resize: true,
            });
        });

        wavesurfer.current = ws;
        ws.load(audioUrl);

    }, [audioUrl]);

    return (
        <div className="h-screen flex items-center justify-center bg-muted">
            <div className="w-full max-w-2xl">
                <form onSubmit={handleSubmit} className="space-y-6 p-6">
                    <div className="space-y-2">
                        <Label htmlFor="audio-file">Audio File</Label>
                        <Input
                            id="audio-file"
                            type="file"
                            name="input_file"
                            accept="audio/*"
                            onChange={handleFileChange}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Output Format</Label>
                        <Select value={outputFormat} onValueChange={setOutputFormat}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select format" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="aac">AAC</SelectItem>
                                <SelectItem value="mp3">MP3</SelectItem>
                                <SelectItem value="wav">WAV</SelectItem>
                                <SelectItem value="ogg">OGG</SelectItem>
                                <SelectItem value="flac">FLAC</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {audioUrl && (
                        <div className="space-y-4 p-4 border rounded-lg">
                            <div id="waveform" className="bg-muted rounded-lg p-4" />
                            <input type="hidden" name="start" value={start} />
                            <input type="hidden" name="end" value={end} />
                        </div>
                    )}

                    <Button
                        type="submit"
                        className="w-full bg-indigo-600 hover:bg-indigo-700"
                        disabled={!audioUrl || loading}
                    >
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {loading ? "Processing" : "Process Audio"}
                    </Button>
                </form>
            </div>
        </div>
    );
};
