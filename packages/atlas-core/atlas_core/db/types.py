from typing import Any

from sqlalchemy import types
from sqlalchemy.dialects.postgresql import TSVECTOR as _TSVECTOR


class TSVectorType(types.TypeDecorator[Any]):
    impl = _TSVECTOR
    cache_ok = True
