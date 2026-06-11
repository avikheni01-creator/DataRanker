# utils/file_utils.py — Helpers for saving uploads and managing temp directories

import os
import shutil
import tempfile
from contextlib import contextmanager
from typing import Generator

from fastapi import UploadFile


def save_upload(upload: UploadFile, dest: str) -> None:
    """Write an UploadFile to *dest* on disk."""
    try:
        with open(dest, "wb") as f:
            shutil.copyfileobj(upload.file, f)
    finally:
        upload.file.close()


@contextmanager
def temp_workspace() -> Generator[str, None, None]:
    """
    Context manager that creates a temporary directory and removes it on exit,
    even if an exception is raised inside the block.

    Usage::

        with temp_workspace() as tmpdir:
            path = os.path.join(tmpdir, "file.csv")
            ...
    """
    tmpdir = tempfile.mkdtemp()
    try:
        yield tmpdir
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)


def workspace_path(tmpdir: str, filename: str) -> str:
    """Return an absolute path inside *tmpdir* for *filename*."""
    return os.path.join(tmpdir, filename)


def read_bytes(path: str) -> bytes:
    """Read a file from disk and return its raw bytes."""
    with open(path, "rb") as f:
        return f.read()
