import json
import sys
from pathlib import Path

try:
    from langchain_community.document_loaders import PyPDFLoader
    from langchain_community.document_loaders import Docx2txtLoader
    from langchain_community.document_loaders import UnstructuredPowerPointLoader
except ImportError:
    PyPDFLoader = Docx2txtLoader = UnstructuredPowerPointLoader = None

try:
    import pytesseract
    from PIL import Image
except ImportError:
    pytesseract = None


def load_pdf(path: Path) -> str:
    if PyPDFLoader is None:
        raise RuntimeError('langchain-community is required for PDF extraction')
    loader = PyPDFLoader(str(path))
    docs = loader.load()
    return '\n'.join(doc.page_content for doc in docs)


def load_docx(path: Path) -> str:
    if Docx2txtLoader is None:
        raise RuntimeError('langchain-community is required for DOCX extraction')
    loader = Docx2txtLoader(str(path))
    docs = loader.load()
    return '\n'.join(doc.page_content for doc in docs)


def load_ppt(path: Path) -> str:
    if UnstructuredPowerPointLoader is None:
        raise RuntimeError('langchain-community is required for PPT extraction')
    loader = UnstructuredPowerPointLoader(str(path))
    docs = loader.load()
    return '\n'.join(doc.page_content for doc in docs)


def load_image(path: Path) -> str:
    if pytesseract is None:
        raise RuntimeError('pytesseract is required for image OCR')
    image = Image.open(str(path))
    return pytesseract.image_to_string(image, lang='ara+eng')


def main():
    if len(sys.argv) < 3:
        print('Usage: text_extractor.py <path> <extension>', file=sys.stderr)
        sys.exit(1)

    file_path = Path(sys.argv[1])
    extension = sys.argv[2].lower()

    if not file_path.exists():
        print('File not found', file=sys.stderr)
        sys.exit(1)

    try:
        if extension == 'pdf':
            content = load_pdf(file_path)
        elif extension == 'docx':
            content = load_docx(file_path)
        elif extension in {'ppt', 'pptx'}:
            content = load_ppt(file_path)
        elif extension in {'png', 'jpg', 'jpeg'}:
            content = load_image(file_path)
        else:
            content = file_path.read_text(encoding='utf-8', errors='ignore')
    except Exception as error:  # pylint: disable=broad-except
        print(json.dumps({'error': str(error)}), file=sys.stderr)
        sys.exit(1)

    print(content)


if __name__ == '__main__':
    main()
