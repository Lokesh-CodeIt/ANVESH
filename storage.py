import os
import re
import uuid
import logging
from typing import Tuple

logger = logging.getLogger("medauth.storage")

UPLOAD_BASE_DIR = os.getenv(
    "SUBMISSION_UPLOADS_DIR",
    os.path.abspath(os.path.join(os.path.dirname(__file__), "uploads", "submissions")),
)

# Ensure upload directory exists
os.makedirs(UPLOAD_BASE_DIR, exist_ok=True)

# File constraints
MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024  # 25 MB per file
ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".dcm", ".pdf", ".txt"}
ALLOWED_MIME_TYPES = {
    "image/png",
    "image/jpeg",
    "application/dicom",
    "application/octet-stream",  # Sometimes sent for .dcm files
    "application/pdf",
    "text/plain",
}


def sanitize_filename(filename: str) -> str:
    """Strip directory traversal elements and non-alphanumeric characters from filename."""
    base = os.path.basename(filename)
    clean = re.sub(r"[^\w\.\-\_]", "_", base)
    return clean[:120] if clean else "file"


def validate_file_content(content_bytes: bytes, filename: str, declared_mime: str) -> Tuple[bool, str, str]:
    """
    Validate extension, declared mime, magic bytes, and size.
    Returns (is_valid, category, error_message).
    Category is either 'radiograph' or 'clinical_report'.
    """
    if len(content_bytes) == 0:
        return False, "", "File is empty (0 bytes)."

    if len(content_bytes) > MAX_FILE_SIZE_BYTES:
        return False, "", f"File exceeds maximum allowed size of 25 MB ({len(content_bytes)} bytes)."

    ext = os.path.splitext(filename.lower())[1]
    if ext not in ALLOWED_EXTENSIONS:
        return False, "", f"File extension '{ext}' is not supported. Supported: .png, .jpg, .jpeg, .dcm, .pdf, .txt"

    # Magic byte signatures validation
    if ext == ".png":
        if not content_bytes.startswith(b"\x89PNG\r\n\x1a\n"):
            return False, "", "Corrupt or malformed PNG image: missing PNG magic signature."
        return True, "radiograph", ""

    elif ext in {".jpg", ".jpeg"}:
        if not content_bytes.startswith(b"\xff\xd8\xff"):
            return False, "", "Corrupt or malformed JPEG image: missing JPEG SOI signature."
        return True, "radiograph", ""

    elif ext == ".pdf":
        if not content_bytes.startswith(b"%PDF-"):
            return False, "", "Corrupt or malformed PDF document: missing %PDF- header."
        return True, "clinical_report", ""

    elif ext == ".txt":
        # Check text file doesn't contain binary null bytes
        if b"\x00" in content_bytes[:4096]:
            return False, "", "File contains binary characters and is not a valid plain text document."
        try:
            content_bytes.decode("utf-8")
        except UnicodeDecodeError:
            try:
                content_bytes.decode("latin-1")
            except Exception:
                return False, "", "Unable to decode text document encoding."
        return True, "clinical_report", ""

    elif ext == ".dcm":
        # Standard DICOM header check: 128 bytes preamble followed by "DICM"
        if len(content_bytes) > 132 and content_bytes[128:132] == b"DICM":
            return True, "radiograph", ""
        # Some headerless DICOM files exist, but verify min length
        if len(content_bytes) > 256:
            return True, "radiograph", ""
        return False, "", "Malformed DICOM image: missing standard DICM header signature."

    return False, "", f"Unsupported file format: {ext}"


def save_submission_file(
    submission_ref: str,
    original_filename: str,
    content_bytes: bytes,
) -> Tuple[str, str]:
    """
    Saves file bytes to disk under safe path outside static web root.
    Returns (stored_filename, absolute_file_path).
    Guarantees no path traversal and generates unique storage filename.
    """
    clean_name = sanitize_filename(original_filename)
    sub_dir = os.path.join(UPLOAD_BASE_DIR, sanitize_filename(submission_ref))
    os.makedirs(sub_dir, exist_ok=True)

    random_id = uuid.uuid4().hex[:12]
    stored_filename = f"{random_id}_{clean_name}"
    target_path = os.path.abspath(os.path.join(sub_dir, stored_filename))

    # Path traversal assertion
    if not target_path.startswith(os.path.abspath(UPLOAD_BASE_DIR)):
        raise ValueError("Security violation: path traversal attempt detected.")

    with open(target_path, "wb") as f:
        f.write(content_bytes)

    logger.info("Saved submission file: %s for %s (%d bytes)", stored_filename, submission_ref, len(content_bytes))
    return stored_filename, target_path


def delete_submission_file_on_disk(file_path: str) -> None:
    """Safely delete file from disk during removal or cleanup."""
    try:
        resolved = os.path.abspath(file_path)
        if resolved.startswith(os.path.abspath(UPLOAD_BASE_DIR)) and os.path.isfile(resolved):
            os.remove(resolved)
            logger.info("Removed submission file from disk: %s", resolved)
    except Exception as exc:
        logger.warning("Error removing file from disk %s: %s", file_path, exc)


def get_mime_type_for_file(filename: str, fallback: str = "application/octet-stream") -> str:
    """Resolve correct standard MIME type from extension."""
    ext = os.path.splitext(filename.lower())[1]
    mime_map = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".pdf": "application/pdf",
        ".txt": "text/plain",
        ".dcm": "application/dicom",
    }
    return mime_map.get(ext, fallback)

