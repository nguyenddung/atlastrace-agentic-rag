"""Bilingual (English / Vietnamese) text normalisation shared by indexing and querying."""

from __future__ import annotations

import re
import unicodedata

VI_CHARS = re.compile(r"[ăâđêôơưáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]", re.IGNORECASE)
TOKEN = re.compile(r"[a-z0-9]+")
SENTENCE = re.compile(r"(?<=[.!?])\s+(?=[\"'“(]?[A-ZÀ-Ỹ0-9])")

# Function words that carry no retrieval signal. Vietnamese entries are written
# without tone marks because matching happens after deaccenting.
STOP_WORDS = frozenset(
    """
    a an and are as at be been but by did do does for from had has have how i if in into is it its
    of on or that the their there these this those to was were what when where which who whom whose why will with
    many much name named called known kind type also one can could would should not than then they them he she his her
    after before during about other some such most more only
    la cua va co cac nhung duoc trong cho mot nao gi bao nhieu ai khi o tai voi nay do da se thi ma de tu ve nhu
    hay khong boi vao ra len den nhat cung nhieu it hon rat theo sau truoc giua neu vi con ban
    """.split()
)


def deaccent(value: str) -> str:
    """Strip tone marks and fold đ, so 'triển khai' and 'trien khai' match."""
    value = value.replace("đ", "d").replace("Đ", "D")
    decomposed = unicodedata.normalize("NFD", value)
    return "".join(ch for ch in decomposed if unicodedata.category(ch) != "Mn")


def detect_language(value: str) -> str:
    """Vietnamese if the text carries Vietnamese-specific letters, otherwise English."""
    return "vi" if VI_CHARS.search(value) else "en"


def words(value: str) -> list[str]:
    return [token for token in TOKEN.findall(deaccent(value.lower())) if token not in STOP_WORDS and len(token) > 1 or token.isdigit()]


def tokenize(value: str) -> list[str]:
    """Unigrams plus adjacent bigrams.

    Vietnamese words are mostly two syllables ('bảo trì', 'đội xe'), so syllable
    bigrams recover much of the precision a word segmenter would give, without
    one. For English they act as cheap phrase matches.
    """
    unigrams = words(value)
    bigrams = [f"{left}_{right}" for left, right in zip(unigrams, unigrams[1:], strict=False)]
    return unigrams + bigrams


def split_sentences(value: str) -> list[str]:
    sentences = [part.strip() for part in SENTENCE.split(value.strip()) if part.strip()]
    return sentences or [value.strip()]
