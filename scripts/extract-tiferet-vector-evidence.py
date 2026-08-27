from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from typing import Any

import pdfplumber


def rounded(value: Any) -> Any:
    if isinstance(value, float):
        return round(value, 4)
    if isinstance(value, (list, tuple)):
        return [rounded(item) for item in value]
    return value


def line_record(line: dict[str, Any]) -> list[Any]:
    return rounded(
        [
            line["x0"],
            line["top"],
            line["x1"],
            line["bottom"],
            line.get("linewidth", 0),
            bool(line.get("stroke")),
        ]
    )


def rectangle_record(rectangle: dict[str, Any]) -> list[Any]:
    return rounded(
        [
            rectangle["x0"],
            rectangle["top"],
            rectangle["x1"],
            rectangle["bottom"],
            rectangle.get("linewidth", 0),
            bool(rectangle.get("stroke")),
            bool(rectangle.get("fill")),
            rectangle.get("stroking_color"),
            rectangle.get("non_stroking_color"),
        ]
    )


def curve_record(curve: dict[str, Any]) -> dict[str, Any]:
    return {
        "bounds": rounded([curve["x0"], curve["top"], curve["x1"], curve["bottom"]]),
        "linewidth": rounded(curve.get("linewidth", 0)),
        "stroke": bool(curve.get("stroke")),
        "fill": bool(curve.get("fill")),
        "path": rounded(curve.get("path", [])),
    }


def image_record(image: dict[str, Any]) -> list[Any]:
    return rounded([image["x0"], image["top"], image["x1"], image["bottom"]])


def word_record(word: dict[str, Any]) -> list[Any]:
    return rounded([word["text"], word["x0"], word["top"], word["x1"], word["bottom"]])


def is_half_gray(value: Any) -> bool:
    return isinstance(value, (list, tuple)) and len(value) == 3 and all(
        abs(float(channel) - 0.5) <= 0.0001 for channel in value
    )


def is_wall_mass_candidate(rectangle: dict[str, Any]) -> bool:
    return (
        bool(rectangle.get("fill"))
        and is_half_gray(rectangle.get("non_stroking_color"))
        and min(float(rectangle["width"]), float(rectangle["height"])) >= 5.5
        and max(float(rectangle["width"]), float(rectangle["height"])) >= 30
    )


def wall_mass_record(rectangle: dict[str, Any]) -> list[float]:
    return rounded([rectangle["x0"], rectangle["top"], rectangle["x1"], rectangle["bottom"]])


def bounds_for_rectangles(rectangles: list[list[float]]) -> dict[str, float] | None:
    if not rectangles:
        return None
    return {
        "x0": min(rectangle[0] for rectangle in rectangles),
        "top": min(rectangle[1] for rectangle in rectangles),
        "x1": max(rectangle[2] for rectangle in rectangles),
        "bottom": max(rectangle[3] for rectangle in rectangles),
    }


def fingerprint(value: Any) -> str:
    canonical = json.dumps(
        value,
        ensure_ascii=False,
        separators=(",", ":"),
        sort_keys=True,
    ).encode("utf-8")
    return hashlib.sha256(canonical).hexdigest()


def normalized_wall_masses(
    page_wall_masses: list[dict[str, Any]], mirrored: bool = False
) -> list[dict[str, Any]]:
    normalized_pages: list[dict[str, Any]] = []
    for page in page_wall_masses:
        bounds = page["bounds"]
        rectangles = page["rectangles"]
        if bounds is None:
            normalized_rectangles: list[list[float]] = []
        elif mirrored:
            normalized_rectangles = [
                rounded(
                    [
                        bounds["x1"] - rectangle[2],
                        rectangle[1] - bounds["top"],
                        bounds["x1"] - rectangle[0],
                        rectangle[3] - bounds["top"],
                    ]
                )
                for rectangle in rectangles
            ]
        else:
            normalized_rectangles = [
                rounded(
                    [
                        rectangle[0] - bounds["x0"],
                        rectangle[1] - bounds["top"],
                        rectangle[2] - bounds["x0"],
                        rectangle[3] - bounds["top"],
                    ]
                )
                for rectangle in rectangles
            ]
        normalized_pages.append(
            {
                "page": page["page"],
                "rectangles": sorted(normalized_rectangles),
            }
        )
    return normalized_pages


def extract_document(source_path: Path) -> tuple[list[dict[str, Any]], str, str, str]:
    pages: list[dict[str, Any]] = []
    geometry_pages: list[dict[str, Any]] = []
    page_wall_masses: list[dict[str, Any]] = []
    with pdfplumber.open(source_path) as pdf:
        for page_index, page in enumerate(pdf.pages, start=1):
            lines = [line_record(line) for line in page.lines]
            rectangles = [rectangle_record(rectangle) for rectangle in page.rects]
            curves = [curve_record(curve) for curve in page.curves]
            images = [image_record(image) for image in page.images]
            words = [word_record(word) for word in page.extract_words(use_text_flow=False)]
            wall_mass_candidates = sorted(
                wall_mass_record(rectangle) for rectangle in page.rects if is_wall_mass_candidate(rectangle)
            )
            plan_bounds = bounds_for_rectangles(wall_mass_candidates)
            page_record = {
                "page": page_index,
                "widthPoints": rounded(page.width),
                "heightPoints": rounded(page.height),
                "characterCount": len(page.chars),
                "wordCount": len(words),
                "lineCount": len(lines),
                "rectangleCount": len(rectangles),
                "curveCount": len(curves),
                "imageCount": len(images),
                "wallMassCandidateCount": len(wall_mass_candidates),
                "planBoundsPoints": plan_bounds,
                "lines": lines,
                "rectangles": rectangles,
                "curves": curves,
                "images": images,
                "words": words,
                "wallMassCandidates": wall_mass_candidates,
            }
            pages.append(page_record)
            geometry_pages.append(
                {
                    "widthPoints": page_record["widthPoints"],
                    "heightPoints": page_record["heightPoints"],
                    "lines": lines,
                    "rectangles": rectangles,
                    "curves": curves,
                    "images": images,
                }
            )
            page_wall_masses.append(
                {
                    "page": page_index,
                    "bounds": plan_bounds,
                    "rectangles": wall_mass_candidates,
                }
            )

    return (
        pages,
        fingerprint(geometry_pages),
        fingerprint(normalized_wall_masses(page_wall_masses)),
        fingerprint(normalized_wall_masses(page_wall_masses, mirrored=True)),
    )


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Extract auditable Tiferet PDF vector evidence.")
    parser.add_argument("--source-dir", required=True, type=Path)
    parser.add_argument("--inventory", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--geometry-dir", required=True, type=Path)
    return parser.parse_args()


def main() -> None:
    arguments = parse_arguments()
    inventory = json.loads(arguments.inventory.read_text(encoding="utf-8"))
    documents_by_id = {document["driveFileId"]: document for document in inventory["documents"]}
    source_paths = sorted(arguments.source_dir.glob("*.pdf"))
    arguments.geometry_dir.mkdir(parents=True, exist_ok=True)
    arguments.output.parent.mkdir(parents=True, exist_ok=True)

    summary_documents: list[dict[str, Any]] = []
    validated_bytes = 0
    for source_path in source_paths:
        drive_file_id = source_path.stem
        source_document = documents_by_id.get(drive_file_id)
        if source_document is None:
            raise ValueError(f"Unknown source PDF: {drive_file_id}")
        source_bytes = source_path.read_bytes()
        expected_size = source_document["sizeBytes"]
        if len(source_bytes) != expected_size:
            raise ValueError(
                f"Source byte-size mismatch for {drive_file_id}: {len(source_bytes)} != {expected_size}"
            )

        pages, geometry_fingerprint, wall_mass_fingerprint, mirrored_wall_mass_fingerprint = extract_document(
            source_path
        )
        source_sha256 = hashlib.sha256(source_bytes).hexdigest()
        geometry_file = arguments.geometry_dir / f"{drive_file_id}.json"
        geometry_payload = {
            "schemaVersion": 1,
            "driveFileId": drive_file_id,
            "sourcePath": source_document["path"],
            "sourceSha256": source_sha256,
            "geometryFingerprint": geometry_fingerprint,
            "wallMassFingerprint": wall_mass_fingerprint,
            "mirroredWallMassFingerprint": mirrored_wall_mass_fingerprint,
            "coordinateSystem": "pdf-points-top-left",
            "pages": pages,
        }
        geometry_file.write_text(
            json.dumps(geometry_payload, ensure_ascii=False, separators=(",", ":")),
            encoding="utf-8",
        )
        summary_documents.append(
            {
                "driveFileId": drive_file_id,
                "sourcePath": source_document["path"],
                "sourceSizeBytes": len(source_bytes),
                "sourceSha256": source_sha256,
                "pageCount": len(pages),
                "geometryFingerprint": geometry_fingerprint,
                "wallMassFingerprint": wall_mass_fingerprint,
                "mirroredWallMassFingerprint": mirrored_wall_mass_fingerprint,
                "geometryEvidenceFile": f"/tiferet/catalog/vectors/{drive_file_id}.json",
                "pages": [
                    {
                        key: page[key]
                        for key in (
                            "page",
                            "widthPoints",
                            "heightPoints",
                            "characterCount",
                            "wordCount",
                            "lineCount",
                            "rectangleCount",
                            "curveCount",
                            "imageCount",
                            "wallMassCandidateCount",
                            "planBoundsPoints",
                        )
                    }
                    for page in pages
                ],
            }
        )
        validated_bytes += len(source_bytes)

    fingerprint_counts: dict[str, int] = {}
    for document in summary_documents:
        fingerprint = document["geometryFingerprint"]
        fingerprint_counts[fingerprint] = fingerprint_counts.get(fingerprint, 0) + 1
    for document in summary_documents:
        document["exactGeometryGroupSize"] = fingerprint_counts[document["geometryFingerprint"]]
    wall_mass_ids_by_fingerprint: dict[str, list[str]] = {}
    for document in summary_documents:
        wall_mass_ids_by_fingerprint.setdefault(document["wallMassFingerprint"], []).append(
            document["driveFileId"]
        )
    for document in summary_documents:
        document["exactWallMassGroupSize"] = len(
            wall_mass_ids_by_fingerprint[document["wallMassFingerprint"]]
        )
        document["mirroredCandidateIds"] = [
            drive_file_id
            for drive_file_id in wall_mass_ids_by_fingerprint.get(
                document["mirroredWallMassFingerprint"], []
            )
            if drive_file_id != document["driveFileId"]
        ]

    catalog = {
        "schemaVersion": 1,
        "extractionMethod": "pdfplumber-vector-and-positioned-text",
        "coordinateSystem": "pdf-points-top-left",
        "validatedSourcePdfCount": len(summary_documents),
        "validatedSourceBytes": validated_bytes,
        "documents": summary_documents,
    }
    arguments.output.write_text(
        json.dumps(catalog, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(
        f"Extracted {len(summary_documents)} byte-validated PDFs "
        f"({validated_bytes} bytes) to {arguments.output}."
    )


if __name__ == "__main__":
    main()
