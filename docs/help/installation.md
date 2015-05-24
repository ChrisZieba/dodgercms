Installing DodgerCMS requires creating a few buckets in [S3](http://aws.amazon.com/s3/) and a new [IAM](http://aws.amazon.com/iam/) user.

## Buckets

DodgerCMS requires a static website bucket in S3 for the frontend website, and an optional website bucket for the manager. If you don't need cloud access to the manager then you can simply run the manager locally and skip creating a bucket for it. You will also need a bucket for uploaded assets, and another to store the source markdown files. *The bucket names below should be changed to reflect your own settings*.

- `data.dodgercms.com`

  Used to store the markdown files. This is a private bucket, and does not need a bucket policy since it defaults to private. Edit the `CORS` configuration.

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

- `assets.dodgercms.com`

   Used for uploaded images and other resources. A pre-existing bucket can be used for the assets, a new one is not necessary. This bucket should be public, an example policy with limited privileges is as follows:

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
            "Resource": "arn:aws:s3:::assets.dodgercms.com/*"
         }
      ]
   }
   ```

   The `CORS` file will also need to be modified.

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
        <AllowedHeader>*</AllowedHeader>
    </CORSRule>
</CORSConfiguration>
   ```

- `dodgercms.com`

   This bucket is used for the generated `HTML` files. It is the website end users will be visiting, and must be [configured as a static website](http://docs.aws.amazon.com/AmazonS3/latest/dev/HowDoIWebsiteConfiguration.html). 

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
            "Resource": "arn:aws:s3:::dodgercms.com/*"
         }
      ]
   }
   ```

   The `CORS` file will also need to be modified.

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

- `manager.dodgercms.com`

    Bucket for the admin manager, also must be [configured as a static website](http://docs.aws.amazon.com/AmazonS3/latest/dev/HowDoIWebsiteConfiguration.html). If you do not need cloud access to the manager, and instead will work locally, *this bucket is optional*.

   After the bucket is setup, you will need to upload the contents of https://github.com/ChrisZieba/dodgercms into it. For more information, see this article on [how to upload objects to S3](http://docs.aws.amazon.com/AmazonS3/latest/UG/UploadingObjectsintoAmazonS3.html).

- `www.dodgercms.com`

    Optional bucket used to redirect `www` to the apex. 

## User Account

Create a user account in AWS for the application. **You should not give this user permissions to anything other than the `S3` buckets needed for this application.** The user does not need sign-in credentials to the console, but it does need an **access key** for the authentication to the manager. These credentials are exchanged for the federated token and are not stored by the application, unless explicitly chosen.

### Sample Policy

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
                "s3:PutObject",
                "s3:GetBucketWebsite",
                "s3:PutBucketWebsite",
                "s3:DeleteBucketWebsite",
                "s3:GetBucketLogging",
                "s3:GetBucketVersioning",
                "s3:GetBucketLocation"
            ],
            "Resource": [
                "arn:aws:s3:::data.dodgercms.com",
                "arn:aws:s3:::data.dodgercms.com/*",
                "arn:aws:s3:::assets.dodgercms.com",
                "arn:aws:s3:::assets.dodgercms.com/*",
                "arn:aws:s3:::dodgercms.com",
                "arn:aws:s3:::dodgercms.com/*"
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

## Domain

You can setup `DNS` to point to your site bucket quite easily by adding a `CNAME` record for the bucket. For more information on how to setup a custom domain please refer to this [guide](https://docs.aws.amazon.com/AmazonS3/latest/dev/website-hosting-custom-domain-walkthrough.html).