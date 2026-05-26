from __future__ import annotations

import json
import logging
from pathlib import Path

from pydantic import BaseModel, field_validator

logger = logging.getLogger(__name__)


class DatasetQuestion(BaseModel):
    question_id: str
    question: str
    answer: str
    supporting_docs: list[str]
    dataset: str

    @field_validator("supporting_docs")
    @classmethod
    def at_least_one_doc(cls, v: list[str]) -> list[str]:
        if not v:
            raise ValueError("supporting_docs must not be empty")
        return v


def load_jsonl(path: str | Path) -> list[DatasetQuestion]:
    questions: list[DatasetQuestion] = []
    for i, line in enumerate(Path(path).read_text().splitlines(), start=1):
        line = line.strip()
        if not line:
            continue
        try:
            questions.append(DatasetQuestion.model_validate(json.loads(line)))
        except Exception as exc:
            logger.warning("Skipping line %d in %s: %s", i, path, exc)
    return questions
