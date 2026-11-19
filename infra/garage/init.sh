#!/bin/sh
# Идемпотентная инициализация Garage через Admin API v2: раскладка узла, ключ доступа, бакет.
set -eu
apk add --no-cache curl jq >/dev/null

API="http://garage:3903/v2"
AUTH="Authorization: Bearer ${GARAGE_ADMIN_TOKEN}"
call() { curl -fsS -H "$AUTH" -H 'Content-Type: application/json' "$@"; }

until call "$API/GetClusterHealth" >/dev/null 2>&1; do sleep 1; done

if [ "$(call "$API/GetClusterLayout" | jq '.roles | length')" = "0" ]; then
  NODE=$(call "$API/GetClusterStatus" | jq -r '.nodes[0].id')
  call -X POST "$API/UpdateClusterLayout" \
    -d "{\"roles\":[{\"id\":\"$NODE\",\"zone\":\"dev\",\"capacity\":1000000000,\"tags\":[]}]}" >/dev/null
  VERSION=$(call "$API/GetClusterLayout" | jq '.version + 1')
  call -X POST "$API/ApplyClusterLayout" -d "{\"version\":$VERSION}" >/dev/null
  echo "layout applied (v$VERSION)"
fi

call "$API/GetKeyInfo?id=${S3_ACCESS_KEY}" >/dev/null 2>&1 || {
  call -X POST "$API/ImportKey" \
    -d "{\"accessKeyId\":\"${S3_ACCESS_KEY}\",\"secretAccessKey\":\"${S3_SECRET_KEY}\",\"name\":\"keeper-dev\"}" >/dev/null
  echo "key imported"
}

BUCKET_ID=$(call "$API/GetBucketInfo?globalAlias=${S3_BUCKET}" 2>/dev/null | jq -r '.id' || true)
if [ -z "$BUCKET_ID" ]; then
  BUCKET_ID=$(call -X POST "$API/CreateBucket" -d "{\"globalAlias\":\"${S3_BUCKET}\"}" | jq -r '.id')
  echo "bucket ${S3_BUCKET} created"
fi

call -X POST "$API/AllowBucketKey" \
  -d "{\"bucketId\":\"$BUCKET_ID\",\"accessKeyId\":\"${S3_ACCESS_KEY}\",\"permissions\":{\"read\":true,\"write\":true,\"owner\":true}}" >/dev/null
echo "garage ready: bucket=${S3_BUCKET}"
