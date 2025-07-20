import { Input } from '@/components/ui/input';
import { clsx } from 'clsx';
import { Ref, useImperativeHandle, useState } from 'react';

const YOUTUBE_REGEX = /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:(?:watch\?v=|embed\/|v\/|shorts\/)|(?:.*?&)?v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})$/;

export type YtUrlInputRef = {
    reset: () => void,
};

type YtInputProps = Omit<React.ComponentProps<"input">, "value" | "onBlur" | "onKeyEvent" | "onChange" | "ref"> & { onDone: (youtubeUrl: string) => void, ref: Ref<YtUrlInputRef> | undefined };

export function YtUrlInput({ className, onDone, ref, ...props }: YtInputProps) {
    const [youtubeUrl, setYoutubeUrl] = useState("");
    const isInvalid = youtubeUrl.length > 0 && !YOUTUBE_REGEX.test(youtubeUrl);

    const handleDone = () => {
        if (youtubeUrl.length > 0 && !isInvalid) { onDone(youtubeUrl) }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key == "Enter") {
            handleDone();
        }
    }

    const reset = () => setYoutubeUrl('');

    useImperativeHandle(ref, () => ({ reset }));

    return <Input
        type="url"
        value={youtubeUrl}
        onChange={(e) => setYoutubeUrl(e.target.value)}
        onBlur={handleDone}
        onKeyDown={handleKeyDown}
        className={clsx(className, isInvalid && "border-red-500 ring-2 ring-red-500 focus-visible:ring-red-500")}
        {...props}
    />;
};
