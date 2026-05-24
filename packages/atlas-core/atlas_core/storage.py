"""Object store wrapper: upload/download via S3-compatible API (MinIO / R2)."""

from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class ObjectStore:
    endpoint_url: str
    bucket: str
    access_key: str
    secret_key: str

    @classmethod
    def from_env(cls) -> "ObjectStore":
        return cls(
            endpoint_url=_require("OBJECT_STORE_ENDPOINT"),
            bucket=_require("OBJECT_STORE_BUCKET"),
            access_key=_require("OBJECT_STORE_ACCESS_KEY"),
            secret_key=_require("OBJECT_STORE_SECRET_KEY"),
        )

    async def upload(self, key: str, data: bytes) -> str:
        import aioboto3

        session = aioboto3.Session()
        async with session.client(
            "s3",
            endpoint_url=self.endpoint_url,
            aws_access_key_id=self.access_key,
            aws_secret_access_key=self.secret_key,
        ) as s3:
            await s3.put_object(Bucket=self.bucket, Key=key, Body=data)
        return key

    async def download(self, key: str) -> bytes:
        import aioboto3

        session = aioboto3.Session()
        async with session.client(
            "s3",
            endpoint_url=self.endpoint_url,
            aws_access_key_id=self.access_key,
            aws_secret_access_key=self.secret_key,
        ) as s3:
            resp = await s3.get_object(Bucket=self.bucket, Key=key)
            return await resp["Body"].read()  # type: ignore[no-any-return]

    async def ensure_bucket(self) -> None:
        import aioboto3
        from botocore.exceptions import ClientError

        session = aioboto3.Session()
        async with session.client(
            "s3",
            endpoint_url=self.endpoint_url,
            aws_access_key_id=self.access_key,
            aws_secret_access_key=self.secret_key,
        ) as s3:
            try:
                await s3.head_bucket(Bucket=self.bucket)
            except ClientError:
                await s3.create_bucket(Bucket=self.bucket)


def _require(var: str) -> str:
    val = os.environ.get(var)
    if not val:
        raise RuntimeError(f"Required env var {var!r} is not set")
    return val
