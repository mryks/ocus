"""Ekstraksi read-only per halaman. Tidak menafsirkan kunci, warna, atau batas paket."""
import json
import sys
from pypdf import PdfReader


def main():
    reader = PdfReader(sys.argv[1])
    if reader.is_encrypted:
        raise ValueError("PDF terenkripsi; diperlukan berkas yang dapat dibaca dengan izin pemilik.")
    pages = []
    for index, page in enumerate(reader.pages):
        text = page.extract_text(extraction_mode="layout") or ""
        pages.append({"page": index + 1, "text": text})
    sys.stdout.buffer.write(json.dumps({"pages": pages}, ensure_ascii=False).encode("utf-8"))


if __name__ == "__main__":
    main()
