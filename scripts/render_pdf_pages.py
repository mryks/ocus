"""Render halaman sumber untuk pemeriksaan visual lokal; tidak mengubah PDF asli."""
import argparse
from pathlib import Path
import pypdfium2 as pdfium

parser = argparse.ArgumentParser()
parser.add_argument("source")
parser.add_argument("--pages", type=int, nargs="+", required=True)
parser.add_argument("--out", required=True)
args = parser.parse_args()
prefix = Path(args.out)
prefix.parent.mkdir(parents=True, exist_ok=True)
document = pdfium.PdfDocument(args.source)
try:
    for number in args.pages:
        page = document[number - 1]
        bitmap = page.render(scale=1.5)
        output = prefix.parent / f"{prefix.name}-page-{number}.png"
        bitmap.to_pil().save(output)
        bitmap.close()
        page.close()
        print(output)
finally:
    document.close()
