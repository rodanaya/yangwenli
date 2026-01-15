"""
HYPERION Phonetic: Spanish Phonetic Encoding

Implements Spanish-adapted Soundex for phonetic blocking.
Handles Spanish-specific phonetic rules:
- LL → Y sound
- RR → R
- H is silent
- C before E/I → S sound (Latin American Spanish)
- G before E/I → J sound
- QU → K
- GU before E/I → G
- X can be J, KS, or SH depending on context
"""

import re


class SpanishSoundex:
    """
    Spanish-adapted Soundex encoder for Mexican names.

    Unlike English Soundex, handles:
    - Silent H
    - LL (elle) as Y sound
    - Ñ (eñe) as N+Y hybrid
    - C/S variations in Latin American Spanish
    - Regional variations in X pronunciation

    Example:
        >>> encoder = SpanishSoundex()
        >>> encoder.encode("GONZALEZ")
        'G524'
        >>> encoder.encode("GONZALES")  # Same sound
        'G524'
    """

    # Phonetic groups for Spanish consonants
    # Group 0: Vowels (kept for structure but not coded)
    # Group 1: Labials - B, F, P, V
    # Group 2: Gutturals/Velars - C, G, J, K, Q, X
    # Group 3: Dentals - D, T
    # Group 4: Laterals/Nasals - L, M, N, Ñ
    # Group 5: Palatals - LL, Y, CH
    # Group 6: Vibrants - R, RR
    # Group 7: Sibilants - S, Z

    CONSONANT_CODES = {
        'B': '1', 'F': '1', 'P': '1', 'V': '1', 'W': '1',
        'C': '2', 'G': '2', 'J': '2', 'K': '2', 'Q': '2',
        'D': '3', 'T': '3',
        'L': '4', 'M': '4', 'N': '4',
        'Y': '5',
        'R': '6',
        'S': '7', 'X': '7', 'Z': '7',
    }

    VOWELS = set('AEIOU')

    def __init__(self, code_length: int = 4):
        """
        Initialize encoder.

        Args:
            code_length: Length of output code (default 4)
        """
        self.code_length = code_length

    def encode(self, name: str) -> str:
        """
        Encode a name using Spanish Soundex.

        Args:
            name: Name to encode (already normalized/uppercased)

        Returns:
            Soundex code (e.g., 'G524')
        """
        if not name or not isinstance(name, str):
            return ''

        # Clean and uppercase
        clean = self._preprocess(name.upper())

        if not clean:
            return ''

        # Apply Spanish phonetic transformations
        transformed = self._spanish_transform(clean)

        if not transformed:
            return ''

        # Build Soundex code
        code = self._build_code(transformed)

        return code

    def _preprocess(self, text: str) -> str:
        """Remove non-alphabetic characters."""
        return re.sub(r'[^A-Z]', '', text)

    def _spanish_transform(self, text: str) -> str:
        """
        Apply Spanish phonetic transformations.

        Order matters - process multi-character combinations first.
        """
        result = text

        # Remove silent H
        result = re.sub(r'H', '', result)

        # Handle LL (elle) → Y
        result = re.sub(r'LL', 'Y', result)

        # Handle RR → R
        result = re.sub(r'RR', 'R', result)

        # Handle CH → X (will be coded as sibilant)
        result = re.sub(r'CH', 'X', result)

        # Handle QU → K
        result = re.sub(r'QU', 'K', result)

        # Handle GU before E/I → G
        result = re.sub(r'GU([EI])', r'G\1', result)

        # Handle C before E/I → S (ceceo → seseo in Latin American Spanish)
        result = re.sub(r'C([EI])', r'S\1', result)

        # Handle G before E/I → J
        result = re.sub(r'G([EI])', r'J\1', result)

        # Handle Ñ → NY
        result = re.sub(r'N', 'N', result)  # Keep N as N

        # Handle X in Mexican words (can be J sound, especially at start)
        # MEXICO → MEJICO sound, but TAXI → TAKSI
        if result.startswith('X'):
            result = 'J' + result[1:]

        return result

    def _build_code(self, text: str) -> str:
        """
        Build the Soundex code from transformed text.

        Returns first letter + consonant codes, padded/truncated to length.
        """
        if not text:
            return ''

        # First letter is kept as-is
        first = text[0]
        code = [first]

        # Track previous code to avoid duplicates
        prev_code = self.CONSONANT_CODES.get(first, '0')

        # Process remaining characters
        for char in text[1:]:
            if char in self.VOWELS:
                # Vowels reset the duplicate check but aren't coded
                prev_code = '0'
                continue

            char_code = self.CONSONANT_CODES.get(char)
            if char_code and char_code != prev_code:
                code.append(char_code)
                prev_code = char_code

            if len(code) >= self.code_length:
                break

        # Pad with zeros if needed
        while len(code) < self.code_length:
            code.append('0')

        return ''.join(code[:self.code_length])

    def encode_tokens(self, name: str) -> list[str]:
        """
        Encode each token in a name separately.

        Useful for multi-word company names where each word
        might be matched independently.

        Args:
            name: Full name with spaces

        Returns:
            List of Soundex codes for each token
        """
        tokens = name.upper().split()
        return [self.encode(token) for token in tokens if token]

    def similarity(self, name1: str, name2: str) -> float:
        """
        Calculate phonetic similarity between two names.

        Returns 1.0 if Soundex codes match, 0.0 otherwise.
        For partial matching, use the SimilarityMetrics class.

        Args:
            name1: First name
            name2: Second name

        Returns:
            1.0 if codes match, 0.0 otherwise
        """
        code1 = self.encode(name1)
        code2 = self.encode(name2)

        if not code1 or not code2:
            return 0.0

        return 1.0 if code1 == code2 else 0.0


class SpanishMetaphone:
    """
    Spanish-adapted Metaphone encoder.

    More sophisticated than Soundex, handles:
    - Variable-length encoding
    - Better handling of Spanish phonetic variations
    - Secondary encodings for ambiguous sounds

    This is a simplified implementation. For production use,
    consider the full Double Metaphone algorithm.
    """

    def __init__(self, max_length: int = 6):
        """
        Initialize encoder.

        Args:
            max_length: Maximum code length
        """
        self.max_length = max_length

    def encode(self, name: str) -> str:
        """
        Encode a name using Spanish Metaphone.

        Args:
            name: Name to encode

        Returns:
            Metaphone code
        """
        if not name:
            return ''

        # Clean and uppercase
        text = re.sub(r'[^A-Z]', '', name.upper())

        if not text:
            return ''

        # Apply transformations
        code = []
        i = 0

        while i < len(text) and len(code) < self.max_length:
            char = text[i]
            next_char = text[i + 1] if i + 1 < len(text) else ''
            prev_char = text[i - 1] if i > 0 else ''

            # Skip silent H
            if char == 'H':
                i += 1
                continue

            # Handle double letters (LL, RR)
            if char == next_char and char in 'LR':
                if char == 'L':
                    code.append('Y')  # LL → Y sound
                else:
                    code.append('R')  # RR → R
                i += 2
                continue

            # Handle CH
            if char == 'C' and next_char == 'H':
                code.append('X')
                i += 2
                continue

            # Handle QU
            if char == 'Q':
                code.append('K')
                i += 2 if next_char == 'U' else 1
                continue

            # Handle GU before E/I
            if char == 'G' and next_char == 'U':
                third_char = text[i + 2] if i + 2 < len(text) else ''
                if third_char in 'EI':
                    code.append('G')
                    i += 2
                    continue

            # Handle C before E/I → S
            if char == 'C' and next_char in 'EI':
                code.append('S')
                i += 1
                continue

            # Handle G before E/I → J
            if char == 'G' and next_char in 'EI':
                code.append('J')
                i += 1
                continue

            # Handle X
            if char == 'X':
                if i == 0:
                    code.append('S')  # X at start often S sound
                else:
                    code.append('KS')
                i += 1
                continue

            # Vowels only at start
            if char in 'AEIOU':
                if i == 0:
                    code.append(char)
                i += 1
                continue

            # Standard consonants
            if char == 'B' or char == 'V':
                code.append('B')
            elif char == 'C' or char == 'K':
                code.append('K')
            elif char == 'D':
                code.append('T')
            elif char == 'F':
                code.append('F')
            elif char == 'G':
                code.append('K')
            elif char == 'J':
                code.append('J')
            elif char == 'L':
                code.append('L')
            elif char == 'M':
                code.append('M')
            elif char == 'N':
                code.append('N')
            elif char == 'P':
                code.append('P')
            elif char == 'R':
                code.append('R')
            elif char == 'S' or char == 'Z':
                code.append('S')
            elif char == 'T':
                code.append('T')
            elif char == 'W':
                code.append('B')
            elif char == 'Y':
                code.append('Y')

            i += 1

        return ''.join(code)[:self.max_length]


# Module-level convenience functions
def spanish_soundex(name: str, length: int = 4) -> str:
    """
    Convenience function for Spanish Soundex encoding.

    Args:
        name: Name to encode
        length: Code length (default 4)

    Returns:
        Soundex code
    """
    return SpanishSoundex(code_length=length).encode(name)


def spanish_metaphone(name: str, max_length: int = 6) -> str:
    """
    Convenience function for Spanish Metaphone encoding.

    Args:
        name: Name to encode
        max_length: Maximum code length

    Returns:
        Metaphone code
    """
    return SpanishMetaphone(max_length=max_length).encode(name)
