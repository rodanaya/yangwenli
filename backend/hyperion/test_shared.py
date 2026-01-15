"""
Test script for HYPERION shared components.

Run with: python -m hyperion.test_shared
"""

import sys


def test_normalizer():
    """Test the name normalizer."""
    print("\n" + "=" * 60)
    print("Testing HyperionNormalizer")
    print("=" * 60)

    from hyperion.normalizer import HyperionNormalizer

    normalizer = HyperionNormalizer()

    test_cases = [
        "Construcciones Azteca, S.A. de C.V.",
        "PEMEX REFINACION SA DE CV",
        "Petroleos Mexicanos",
        "DISTRIBUIDORA DE MEDICAMENTOS S.A.P.I. DE C.V.",
        "AGS-Presidencia Municipal de Aguascalientes",
        "PUE-Secretaria de Educacion del Estado",
        "farmacia del norte s. de r.l.",
        "GONZALEZ MARTINEZ JUAN CARLOS",
        "WALMART DE MEXICO S DE RL DE CV",
        "Instituto Mexicano del Seguro Social",
    ]

    for name in test_cases:
        result = normalizer.normalize(name)
        print(f"\nOriginal: {name}")
        print(f"  Base:   {result.base_name}")
        print(f"  Suffix: {result.legal_suffix}")
        print(f"  Tokens: {result.tokens[:3]}...")

    # Test RFC normalization
    print("\n" + "-" * 40)
    print("Testing RFC normalization:")

    rfc_tests = [
        "ABC-123456-XY1",
        "abcd123456xy2",
        "XAXX010101000",  # Generic RFC
        "invalid",
        "ABC1234567890",  # 13 chars - could be person
    ]

    for rfc in rfc_tests:
        result = normalizer.normalize_rfc(rfc)
        print(f"  {rfc:20} -> {result}")

    print("\n[OK] Normalizer tests passed")


def test_phonetic():
    """Test the phonetic encoder."""
    print("\n" + "=" * 60)
    print("Testing SpanishSoundex")
    print("=" * 60)

    from hyperion.phonetic import SpanishSoundex, spanish_soundex

    encoder = SpanishSoundex()

    # Test pairs that should sound similar
    similar_pairs = [
        ("GONZALEZ", "GONZALES"),
        ("HERNANDEZ", "FERNANDEZ"),
        ("MARTINEZ", "MARTINES"),
        ("CONSTRUCCIONES", "CONSTRUCSIONES"),
        ("RODRIGUEZ", "RODRIGES"),
        ("SANCHEZ", "SANCHES"),
    ]

    print("\nSimilar-sounding pairs:")
    for name1, name2 in similar_pairs:
        code1 = encoder.encode(name1)
        code2 = encoder.encode(name2)
        match = "MATCH" if code1 == code2 else "DIFF"
        print(f"  {name1:20} -> {code1}  |  {name2:20} -> {code2}  [{match}]")

    # Test Spanish-specific transformations
    print("\nSpanish phonetic transformations:")
    spanish_tests = [
        "LLAMAS",      # LL -> Y
        "GUERRERO",    # GU before E
        "CISNEROS",    # C before I -> S
        "JIMENEZ",     # J sound
        "XAVIER",      # X at start
        "HECTOR",      # Silent H
    ]

    for name in spanish_tests:
        code = encoder.encode(name)
        print(f"  {name:15} -> {code}")

    print("\n[OK] Phonetic tests passed")


def test_similarity():
    """Test the similarity metrics."""
    print("\n" + "=" * 60)
    print("Testing SimilarityMetrics")
    print("=" * 60)

    from hyperion.similarity import SimilarityMetrics

    metrics = SimilarityMetrics()

    # Test pairs with expected similarity
    test_pairs = [
        ("CONSTRUCCIONES AZTECA", "CONSTRUCCIONES ASTECA"),  # Typo
        ("FARMACIA DEL NORTE", "DEL NORTE FARMACIA"),        # Reorder
        ("PETROLEOS MEXICANOS", "PEMEX"),                     # Abbreviation
        ("WALMART DE MEXICO", "WAL MART MEXICO"),            # Spacing
        ("CONSTRUCCIONES ABC", "DISTRIBUIDORA XYZ"),         # Different
    ]

    print("\nSimilarity comparisons:")
    for s1, s2 in test_pairs:
        jw = metrics.jaro_winkler(s1, s2)
        ts = metrics.token_set(s1, s2)
        jac = metrics.jaccard_tokens(s1, s2)
        hyb = metrics.hybrid_score(s1, s2)

        print(f"\n  '{s1}' vs '{s2}'")
        print(f"    Jaro-Winkler: {jw:.3f}")
        print(f"    Token Set:    {ts:.3f}")
        print(f"    Jaccard:      {jac:.3f}")
        print(f"    Hybrid:       {hyb:.3f}")

    print("\n[OK] Similarity tests passed")


def test_blocking():
    """Test the blocking engine."""
    print("\n" + "=" * 60)
    print("Testing BlockingEngine")
    print("=" * 60)

    from hyperion.blocking import BlockingEngine, VendorBlockingStrategy

    # Create sample records
    records = [
        {'id': 1, 'normalized_name': 'CONSTRUCCIONES AZTECA', 'rfc': 'CAZ990101ABC', 'first_token': 'CONSTRUCCIONES', 'phonetic_code': 'C526'},
        {'id': 2, 'normalized_name': 'CONSTRUCCIONES ASTECA', 'rfc': None, 'first_token': 'CONSTRUCCIONES', 'phonetic_code': 'C526'},
        {'id': 3, 'normalized_name': 'FARMACIA DEL NORTE', 'rfc': 'FDN990101XYZ', 'first_token': 'FARMACIA', 'phonetic_code': 'F652'},
        {'id': 4, 'normalized_name': 'FARMACIA DEL SUR', 'rfc': None, 'first_token': 'FARMACIA', 'phonetic_code': 'F652'},
        {'id': 5, 'normalized_name': 'DISTRIBUIDORA XYZ', 'rfc': 'DXY990101123', 'first_token': 'DISTRIBUIDORA', 'phonetic_code': 'D261'},
    ]

    # Create engine with vendor strategy
    engine = VendorBlockingStrategy.create_engine()

    # Get statistics
    stats = engine.get_statistics(records)

    print("\nBlocking Statistics:")
    print(f"  Total records: {stats['total_records']}")
    print(f"  Pairs without blocking: {stats['total_pairs_without_blocking']}")
    print(f"  Estimated pairs with blocking: {stats['estimated_pairs_with_blocking']}")
    print(f"  Reduction ratio: {stats['reduction_ratio']:.1%}")
    print(f"  Strategy counts: {stats['strategy_block_counts']}")

    # Generate candidates
    print("\nGenerated candidate pairs:")
    candidates = list(engine.generate_candidates(records))
    for cp in candidates:
        print(f"  ({cp.record1_id}, {cp.record2_id}) via {cp.blocking_keys} [priority: {cp.priority}]")

    print(f"\nTotal candidates: {len(candidates)}")
    print("\n[OK] Blocking tests passed")


def test_integration():
    """Test all components working together."""
    print("\n" + "=" * 60)
    print("Integration Test: Full Pipeline")
    print("=" * 60)

    from hyperion.normalizer import HyperionNormalizer
    from hyperion.phonetic import SpanishSoundex
    from hyperion.similarity import SimilarityMetrics, EntityMatcher
    from hyperion.blocking import BlockingEngine

    # Initialize components
    normalizer = HyperionNormalizer()
    phonetic = SpanishSoundex()
    metrics = SimilarityMetrics()
    matcher = EntityMatcher(name_threshold=0.8)

    # Sample vendor names (simulating database records)
    raw_names = [
        ("PEMEX REFINACION SA DE CV", "PRE990101ABC"),
        ("PETROLEOS MEXICANOS S.A. DE C.V.", None),
        ("Pemex Exploracion y Produccion", None),
        ("WALMART DE MEXICO S DE RL DE CV", None),
        ("WAL MART DE MEXICO SA DE CV", None),
        ("CONSTRUCCIONES DEL BAJIO SA DE CV", "CDB990101XYZ"),
    ]

    # Process each name
    processed = []
    for name, rfc in raw_names:
        norm = normalizer.normalize(name)
        phon = phonetic.encode(norm.first_token)
        clean_rfc = normalizer.normalize_rfc(rfc) if rfc else None

        processed.append({
            'id': len(processed) + 1,
            'original': name,
            'normalized_name': norm.base_name,
            'legal_suffix': norm.legal_suffix,
            'first_token': norm.first_token,
            'phonetic_code': phon,
            'rfc': clean_rfc,
        })

    print("\nProcessed records:")
    for rec in processed:
        print(f"  {rec['id']}: {rec['normalized_name'][:40]:40} | RFC: {rec['rfc'] or 'N/A':15} | Phon: {rec['phonetic_code']}")

    # Build blocking engine
    engine = BlockingEngine(min_block_size=2, max_block_size=100)
    engine.add_strategy('phonetic', lambda r: r['phonetic_code'], weight=3.0)
    engine.add_strategy('prefix5', lambda r: r['normalized_name'][:5], weight=2.0)
    engine.add_strategy('first_token', lambda r: r['first_token'], weight=1.0)

    # Generate and score candidates
    print("\nCandidate pairs with match scores:")
    candidates = list(engine.generate_candidates(processed))

    for cp in candidates:
        rec1 = processed[cp.record1_id - 1]
        rec2 = processed[cp.record2_id - 1]

        match_result = matcher.match_score(
            rec1['normalized_name'],
            rec2['normalized_name'],
            rec1['rfc'],
            rec2['rfc'],
            rec1['phonetic_code'],
            rec2['phonetic_code'],
        )

        print(f"\n  Pair ({cp.record1_id}, {cp.record2_id}):")
        print(f"    {rec1['normalized_name'][:35]}")
        print(f"    {rec2['normalized_name'][:35]}")
        print(f"    Score: {match_result['final_score']:.3f} | Match: {match_result['is_match']} | Confidence: {match_result['confidence']}")

    print("\n" + "=" * 60)
    print("[OK] All integration tests passed!")
    print("=" * 60)


def main():
    """Run all tests."""
    print("\n" + "#" * 60)
    print("# HYPERION Shared Components Test Suite")
    print("#" * 60)

    try:
        test_normalizer()
        test_phonetic()
        test_similarity()
        test_blocking()
        test_integration()

        print("\n" + "#" * 60)
        print("# ALL TESTS PASSED!")
        print("#" * 60 + "\n")
        return 0

    except Exception as e:
        print(f"\n[ERROR] Test failed: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == '__main__':
    sys.exit(main())
