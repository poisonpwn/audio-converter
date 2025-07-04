'use client';

import { Input } from '@/components/ui/input';
import { clsx } from 'clsx';

const YOUTUBE_REGEX = /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:(?:watch\?v=|embed\/|v\/|shorts\/)|(?:.*?&)?v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})$/;

type YtInputProps = Omit<React.ComponentProps<"input">, "value" | "onBlur" | "onKeyEvent"> & { value: string, onDone: () => void };

export function YtUrlInput({ value, className, onDone, ...props }: YtInputProps) {
    const isInvalid = value.length > 0 && !YOUTUBE_REGEX.test(value);
    const handleDone = () => {
        if (value.length > 0 && !isInvalid) { onDone() }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key == "Enter") {
            handleDone();
        }
    }

    return <Input
        type="url"
        value={value}
        onBlur={handleDone}
        onKeyDown={handleKeyDown}
        className={clsx(className, isInvalid && "border-red-500 ring-2 ring-red-500 focus-visible:ring-red-500")}
        {...props}
    />;
};
