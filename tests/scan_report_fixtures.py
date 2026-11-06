"""Synthetic scorecards only; deliberately embedded identifiers test sanitation."""

from io import BytesIO
from uuid import uuid4

from PIL import Image, PngImagePlugin

from services.scan_report_service import AnonymousScanReport

IDENTIFIER = "private-identity@example.com"


def png_card():
    output = BytesIO()
    info = PngImagePlugin.PngInfo()
    info.add_text("Author", IDENTIFIER)
    info.add_itxt("XML:com.adobe.xmp", IDENTIFIER)
    with Image.new("RGB", (30, 20), "white") as image:
        image.putpixel((5, 5), (0, 100, 0))
        image.save(output, format="PNG", pnginfo=info)
    return output.getvalue()


def report(image=None, media_type="image/png", **overrides):
    return AnonymousScanReport(**{
        "image": png_card() if image is None else image, "media_type": media_type,
        "retry_key": uuid4(), "category": "unreadable_scores", "stage": "parse", "http_status": 422,
        **overrides,
    })


def pdf_card(pages=2):
    # Build a real PDF with visible names, invisible text, properties, XMP and an attachment.
    stream = b"BT /F1 12 Tf 10 60 Td (Visible Player 5 4 3) Tj 3 Tr 0 -20 Td (" + IDENTIFIER.encode() + b") Tj ET"
    objects = [
        b"<< /Type /Catalog /Pages 2 0 R /Metadata 7 0 R /Names << /EmbeddedFiles << /Names [(private-name.txt) 8 0 R] >> >> >>",
        f"<< /Type /Pages /Kids [{' '.join(['3 0 R'] * pages)}] /Count {pages} >>".encode(),
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 180 90] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        b"<< /Length " + str(len(stream)).encode() + b" >>\nstream\n" + stream + b"\nendstream",
        b"<< /Author (" + IDENTIFIER.encode() + b") /CreationDate (D:20261001010000) >>",
        b"<< /Type /Metadata /Subtype /XML /Length 8 >>\nstream\nprivate!\nendstream",
        b"<< /Type /Filespec /F (private-name.txt) /EF << /F 9 0 R >> >>",
        b"<< /Type /EmbeddedFile /Length 8 >>\nstream\nprivate!\nendstream",
    ]
    data = b"%PDF-1.7\n"
    offsets = []
    for number, obj in enumerate(objects, 1):
        offsets.append(len(data))
        data += f"{number} 0 obj\n".encode() + obj + b"\nendobj\n"
    xref = len(data)
    data += b"xref\n0 10\n0000000000 65535 f \n"
    data += b"".join(f"{offset:010d} 00000 n \n".encode() for offset in offsets)
    return data + f"trailer\n<< /Size 10 /Root 1 0 R /Info 6 0 R >>\nstartxref\n{xref}\n%%EOF".encode()
