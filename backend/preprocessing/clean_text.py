import re
import string
import nltk
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize
from nltk.stem import WordNetLemmatizer

# ── Download NLTK Resources (runs once) ──────────────────────────────────────
nltk.download("punkt",        quiet=True)
nltk.download("punkt_tab",    quiet=True)
nltk.download("stopwords",    quiet=True)
nltk.download("wordnet",      quiet=True)
nltk.download("omw-1.4",      quiet=True)

# ── Init ──────────────────────────────────────────────────────────────────────
lemmatizer  = WordNetLemmatizer()
STOP_WORDS  = set(stopwords.words("english"))

# Keep these even though they're stopwords — they carry disaster meaning
KEEP_WORDS  = {"no", "not", "very", "above", "below", "up", "down", "out", "over"}
STOP_WORDS  -= KEEP_WORDS


# ── Core Cleaning Function ────────────────────────────────────────────────────
def clean_text(text: str) -> str:
    """
    Full NLP preprocessing pipeline:
      1. Lowercase
      2. Remove URLs, emails, numbers
      3. Remove punctuation
      4. Tokenize
      5. Remove stopwords
      6. Lemmatize

    Args:
        text: Raw incident description string

    Returns:
        Cleaned and lemmatized string
    """
    if not isinstance(text, str) or not text.strip():
        return ""

    # 1. Lowercase
    text = text.lower()

    # 2. Remove URLs and emails
    text = re.sub(r"http\S+|www\S+|https\S+", "", text)
    text = re.sub(r"\S+@\S+", "", text)

    # 3. Remove numbers (standalone digits)
    text = re.sub(r"\b\d+\b", "", text)

    # 4. Remove punctuation
    text = text.translate(str.maketrans("", "", string.punctuation))

    # 5. Remove extra whitespace
    text = re.sub(r"\s+", " ", text).strip()

    # 6. Tokenize
    tokens = word_tokenize(text)

    # 7. Remove stopwords + lemmatize
    tokens = [
        lemmatizer.lemmatize(token)
        for token in tokens
        if token not in STOP_WORDS and len(token) > 1
    ]

    return " ".join(tokens)


def clean_text_batch(texts: list) -> list:
    """Clean a list of texts. Used during training."""
    return [clean_text(t) for t in texts]


# ── Test ──────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    samples = [
        "Heavy rainfall since morning. Water entered nearby houses. People are trapped near Sector 17.",
        "A 6.2 magnitude earthquake hit the coastal region at 3:45 AM. Buildings collapsed.",
        "Wildfire spreading rapidly! Over 500 acres burned near highway 101. Evacuate NOW!",
        "Chemical leak reported at factory in Noida. Strong smell, people feeling dizzy.",
    ]

    print("── Text Cleaning Test ────────────────────────────────")
    for s in samples:
        print(f"\nOriginal : {s}")
        print(f"Cleaned  : {clean_text(s)}")
    print("──────────────────────────────────────────────────────")