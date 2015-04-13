![DodgerCMS](http://i.imgur.com/EmVj8OL.png)

A simple CMS using AWS Lambda and S3 for storage. Markdown files are created and edited in the editor, and then converted to markdown by a Lambda function. 

# Use Cases

DodgerCMS was built to create documentation as quickly as possible.

# Installation

You will need four buckets in s3 for this application

- (data.domain.com) one for storing the source markdown files
- (assets.domain.com) for storing the upload images and other resources
- (domain.com) the generated html files (this will be the static website end users will be visiting)
- (manager.domain.com) a bucket for the admin manager - also a static website
- (www.domain.com) a fifth (optional) bucket for redirecting `www` to the apex

- `data.domain.com`

   This is a private bucket, and does not need a bucket policy since it defaults to private.

- `assets.domain.com`

   This bucket should be public, an example policy is as follows:

```
{
	"Version": "2012-10-17",
	"Id": "Policy1427772347182",
	"Statement": [
		{
			"Sid": "Stmt1427772340560",
			"Effect": "Allow",
			"Principal": "*",
			"Action": "s3:GetObject",
			"Resource": "arn:aws:s3:::assets.domain.com/*"
		}
	]
}

```

The CORS file will also need to be modified:

```
<?xml version="1.0" encoding="UTF-8"?>
<CORSConfiguration xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
    <CORSRule>
        <AllowedOrigin>*</AllowedOrigin>
        <AllowedMethod>HEAD</AllowedMethod>
        <AllowedMethod>GET</AllowedMethod>
        <AllowedMethod>PUT</AllowedMethod>
        <AllowedMethod>POST</AllowedMethod>
        <AllowedMethod>DELETE</AllowedMethod>
        <ExposeHeader>ETag</ExposeHeader>
        <ExposeHeader>x-amz-meta-title</ExposeHeader>
        <ExposeHeader>x-amz-meta-label</ExposeHeader>
        <AllowedHeader>*</AllowedHeader>
    </CORSRule>
</CORSConfiguration>

```

You will want to do is create an IAM user who can upload and modify the data (`data.domain.com`) and assets bucket (assets.domain.com), and create a federated access token. This user will need an access key and secret for the authentication of the manager. These credentials are exchanged for the federated token and are not stored by the application. An example policy for the user:

```
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "Stmt1427944232000",
            "Effect": "Allow",
            "Action": [
                "s3:ListBucket",
                "s3:GetObject",
                "s3:DeleteObject",
                "s3:PutObject"
            ],
            "Resource": [
                "arn:aws:s3:::data.domain.com",
                "arn:aws:s3:::data.domain.com/*",
                "arn:aws:s3:::assets.domain.com",
                "arn:aws:s3:::assets.domain.com/*"
            ]
        },
        {
            "Effect": "Allow",
            "Action": "sts:GetFederationToken",
            "Resource": "*"
        }
    ]
}
```

# Libraries 

- highlightjs
- marked
- aws sdk
- jstree