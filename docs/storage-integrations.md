# Storage integrations

Likh supports the built-in local storage driver and S3-compatible object
storage for production attachments.

## Local

Use `STORAGE_DRIVER=local` for local filesystem storage.

## AWS S3, MinIO, and Cloudflare R2

Use `STORAGE_DRIVER=s3` and configure:

- `AWS_S3_ACCESS_KEY_ID`
- `AWS_S3_SECRET_ACCESS_KEY`
- `AWS_S3_REGION`
- `AWS_S3_BUCKET`
- `AWS_S3_ENDPOINT`
- `AWS_S3_FORCE_PATH_STYLE`
- `AWS_S3_URL`

For MinIO, set `AWS_S3_ENDPOINT` to the MinIO endpoint and
`AWS_S3_FORCE_PATH_STYLE=true`.

For Cloudflare R2, set `AWS_S3_ENDPOINT` to the R2 S3 API endpoint and set
`AWS_S3_URL` to the public/custom domain if files are served through one.

Google Drive embeds are available in the editor. A native Google Drive binary
storage driver would require OAuth-backed file lifecycle management and is
separate from the attachment storage driver.
