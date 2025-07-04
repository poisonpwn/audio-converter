from datetime import time
from fastapi import FastAPI, Form, File, Body, HTTPException, UploadFile
from typing import Annotated
from pathlib import Path
from tempfile import NamedTemporaryFile
from fastapi.responses import FileResponse
from ffmpeg_asyncio import FFmpeg
from starlette.background import BackgroundTask
import re
from yt_dlp import YoutubeDL
from string import ascii_letters, digits
from random import choices
import logging

app = FastAPI()
CODEC_MAP = {
    "mp3": "libmp3lame",
    "wav": "pcm_s16le",
    "ogg": "libvorbis",
    "flac": "flac",
    "aac": "aac",
    "m4a": "aac",
}

CHARS = ascii_letters + digits

logger = logging.getLogger("uvicorn.error")
logger.setLevel(logging.DEBUG)


YOUTUBE_REGEX = re.compile(
    r"^(?:https?://)?(?:www\.)?"
    r"(?:youtube\.com/(?:watch\?v=|shorts/)|youtu\.be/)"
    r"([a-zA-Z0-9_-]{11})"
)


@app.get("/yt-download/")
async def yt_download(url: str):
    logger.debug(url)
    match = YOUTUBE_REGEX.match(url)
    logger.debug(match)

    if not match:
        raise HTTPException(status_code=422, detail="invalid youtube url")

    output_file = Path(f"{''.join(choices(CHARS, k=12))}.m4a")
    opts = {
        "format": "bestaudio",
        "outtmpl": f"{output_file.stem}.%(ext)s",
        "postprocessors": [
            {
                "key": "FFmpegExtractAudio",
                "preferredcodec": "aac",
                "preferredquality": "192",
            }
        ],
        "quiet": True,
    }

    try:
        with YoutubeDL(opts) as ydl:
            ydl.download([url])

        return FileResponse(
            output_file.name,
            headers={"Content-Disposition": "attachment; filename=download.aac"},
            background=BackgroundTask(output_file.unlink),
        )
    except Exception:
        raise HTTPException(status_code=500, detail="download failed")


@app.post("/process/")
async def process(
    input_file: Annotated[UploadFile, File()],
    output_fmt: Annotated[str, Form()],
    start: Annotated[time | None, Form()] = None,
    end: Annotated[time | None, Form()] = None,
):
    trim_options = {}
    if start is not None and end is not None:
        if end <= start:
            raise HTTPException(status_code=422, detail="end specified before start")
        trim_options = {"ss": start.isoformat()[:8], "to": end.isoformat()[:8]}

    input_path = (
        Path(input_file.filename) if input_file.filename is not None else Path()
    )

    if input_path.suffix is None:
        raise HTTPException(status_code=422, detail="Unknown File Format")

    if (invalid_fmt := input_path.suffix[1:]) not in CODEC_MAP or (
        invalid_fmt := output_fmt
    ) not in CODEC_MAP:
        raise HTTPException(
            status_code=422, detail=f"Unsupported File Format: {invalid_fmt}"
        )

    with (
        NamedTemporaryFile() as input_tmpfile,
        NamedTemporaryFile(suffix=f".{output_fmt}", delete=False) as output_file,
    ):
        try:
            input_tmpfile.write(await input_file.read())
            proc = (
                FFmpeg()
                .option("y")
                .input(input_tmpfile.name)
                .output(output_file.name, acodec=CODEC_MAP[output_fmt], **trim_options)
            )
            await proc.execute()
            return FileResponse(
                output_file.name,
                headers={
                    "Content-Disposition": f"attachment; filename=converted.{output_fmt}"
                },
                background=BackgroundTask(output_file.close),
            )
        except Exception:
            raise HTTPException(status_code=412, detail="Conversion Error")
