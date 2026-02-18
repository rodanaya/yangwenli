# Contributing to RUBLI

Thank you for your interest in contributing to RUBLI! This document provides guidelines and instructions for contributing.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment. We expect all contributors to:

- Be respectful and considerate in communications
- Welcome newcomers and help them learn
- Focus on constructive feedback
- Accept responsibility for mistakes and learn from them

## How to Contribute

### Reporting Bugs

If you find a bug, please open an issue with:

1. **Clear title** describing the problem
2. **Steps to reproduce** the issue
3. **Expected behavior** vs actual behavior
4. **Environment details** (OS, Python version, Node version)
5. **Screenshots** if applicable

### Suggesting Features

Feature requests are welcome! Please:

1. Check if the feature already exists or has been requested
2. Describe the feature and its use case
3. Explain why this would benefit the project

### Pull Requests

1. **Fork** the repository
2. **Create a branch** from `main` for your feature or fix
3. **Make your changes** following our coding standards
4. **Write tests** for new functionality
5. **Run existing tests** to ensure nothing breaks
6. **Submit a PR** with a clear description

## Development Setup

### Prerequisites

- Python 3.10+
- Node.js 18+
- SQLite 3

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### Frontend Setup

```bash
cd frontend
npm install
```

### Running Tests

```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
npm test
```

## Coding Standards

### Python (Backend)

- Follow PEP 8 style guide
- Use type hints for function parameters and returns
- Write docstrings for public functions
- Use parameterized queries for all SQL (prevent injection)
- Validate all user inputs

```python
# Good
def get_contracts(
    sector_id: int | None = None,
    year: int | None = None
) -> list[dict]:
    """Fetch contracts with optional filters.

    Args:
        sector_id: Filter by sector (1-12)
        year: Filter by year (2002-2025)

    Returns:
        List of contract dictionaries
    """
    cursor.execute(
        "SELECT * FROM contracts WHERE sector_id = ?",
        (sector_id,)
    )
```

### TypeScript (Frontend)

- Use TypeScript strict mode
- Define interfaces for API responses
- Use React hooks appropriately
- Follow component naming conventions (PascalCase)

```typescript
// Good
interface Contract {
  id: number;
  vendorName: string;
  amount: number;
  riskScore: number;
}

function ContractCard({ contract }: { contract: Contract }) {
  // ...
}
```

### Data Validation Rules

Always enforce these rules:

| Value Range | Action |
|-------------|--------|
| > 100B MXN | **REJECT** - Data error |
| > 10B MXN | **FLAG** - Mark for review |
| <= 10B MXN | Accept normally |

### Security Requirements

- Never expose RFC (tax IDs) in list responses
- Sanitize CSV exports to prevent formula injection
- Use rate limiting on expensive endpoints
- Validate and sanitize all inputs

## Project Structure

```
rubli/
├── backend/
│   ├── api/               # FastAPI application
│   │   ├── routers/       # Endpoint definitions
│   │   └── dependencies.py
│   ├── scripts/           # ETL and utilities
│   └── tests/             # Backend tests
│
├── frontend/
│   ├── src/
│   │   ├── pages/         # Page components
│   │   ├── components/    # Reusable components
│   │   ├── api/           # API client
│   │   └── hooks/         # Custom hooks
│   └── __tests__/         # Frontend tests
│
└── docs/                  # Documentation
```

## Commit Messages

Use clear, descriptive commit messages:

```
feat: Add vendor network analysis endpoint
fix: Correct risk score calculation for single-bid contracts
docs: Update API documentation
test: Add tests for export sanitization
refactor: Simplify sector classification logic
```

## Review Process

1. All PRs require at least one review
2. CI checks must pass (tests, linting)
3. Documentation must be updated if needed
4. Breaking changes require discussion

## Questions?

If you have questions about contributing, please:

1. Check existing documentation
2. Search closed issues for similar questions
3. Open a new issue with your question

---

*"The most important thing is not to win, but to understand."* - RUBLI
