"""Read PDF answer markers with coordinates; never infer a verified answer.

Yellow rectangles and bold text are different evidence types. Every result still
needs visual review; images, handwriting and unusual layouts may not be captured.
"""
import argparse
import hashlib
import json
import re
from pathlib import Path

import pdfplumber


def yellow(color):
    return isinstance(color, (list, tuple)) and len(color) == 3 and color[0] > .8 and color[1] > .8 and color[2] < .35


def marked(char, rectangles):
    x = (char["x0"] + char["x1"]) / 2
    y = (char["top"] + char["bottom"]) / 2
    return any(r["x0"] <= x <= r["x1"] and r["top"] <= y <= r["bottom"] for r in rectangles)


def inspect(source):
    records = []
    current = None
    option = None
    section = "Bagian awal (tanpa judul eksplisit)"
    with pdfplumber.open(source) as pdf:
        for page_number, page in enumerate(pdf.pages, 1):
            rectangles = [r for r in page.rects if yellow(r.get("non_stroking_color"))]
            for line in page.extract_text_lines():
                text = line["text"].strip()
                if re.match(r"^(?:UTM|UAM)\b.*(?:6517|2019|2022)", text, re.I):
                    section, current, option = text, None, None
                    continue
                number = re.match(r"^(\d{1,3})[.)]\s+(.*)", text)
                # These source PDFs use a hanging indent for numbered questions.
                # Exclude dates and numbered content indented within an option.
                if number and line["x0"] < 100:
                    current = {"section": section, "originalNumber": number[1], "firstPage": page_number, "firstLine": number[2], "options": []}
                    records.append(current)
                    option = None
                    continue
                label = re.match(r"^([a-e])[.)]\s*(.*)", text, re.I)
                if label and current and line["x0"] < 140:
                    option = {"label": label[1].upper(), "lines": []}
                    current["options"].append(option)
                if option is None:
                    continue
                chars = [c for c in line["chars"] if c["text"].strip()]
                bold = [c for c in chars if "bold" in c.get("fontname", "").lower()]
                highlighted = [c for c in chars if marked(c, rectangles)]
                option["lines"].append({"page": page_number, "text": text, "box": [round(line[k], 2) for k in ("x0", "top", "x1", "bottom")], "yellowText": "".join(c["text"] for c in highlighted), "yellowChars": len(highlighted), "boldChars": len(bold), "totalChars": len(chars)})
    for record in records:
        record["yellowLabels"] = [o["label"] for o in record["options"] if any(l["yellowChars"] > 0 for l in o["lines"])]
        record["boldLabels"] = [o["label"] for o in record["options"] if any(l["totalChars"] >= 4 and l["boldChars"] / l["totalChars"] >= .8 for l in o["lines"])]
    return records


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("source")
    parser.add_argument("--out", required=True)
    args = parser.parse_args()
    source = Path(args.source)
    records = inspect(source)
    output = Path(args.out)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps({"status": "marker-evidence-not-scientific-verification", "source": source.as_posix(), "sourceHash": hashlib.sha256(source.read_bytes()).hexdigest(), "limitations": "Text/rectangle extraction only; bold is not automatically an answer; visually inspect all mapped markers. No source PDF is modified.", "records": records}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    for r in records:
        print(f"{r['section']} #{r['originalNumber']} p{r['firstPage']} yellow={','.join(r['yellowLabels']) or '-'} bold={','.join(r['boldLabels']) or '-'}")
