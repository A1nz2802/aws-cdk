import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import {
  CachePolicy,
  CfnOriginAccessControl,
  Distribution,
  OriginAccessControlOriginType,
  SigningBehavior,
  SigningProtocol,
  ViewerProtocolPolicy,
} from 'aws-cdk-lib/aws-cloudfront';
import {
  S3BucketOrigin,
  S3StaticWebsiteOrigin,
} from 'aws-cdk-lib/aws-cloudfront-origins';
import { AnyPrincipal, Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import {
  BlockPublicAccess,
  Bucket,
  BucketEncryption,
  ObjectOwnership,
} from 'aws-cdk-lib/aws-s3';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';

export class Lab14 extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.templateOptions.description = 'CloudFront Cache and Behavior Settings';

    //* Create 3 S3 Buckets
    const pdfBucket = new Bucket(this, 'pdf-bucker', {
      bucketName: 'pdf-bucket-5wyasda9',
      encryption: BucketEncryption.S3_MANAGED,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      objectLockEnabled: false,
      objectOwnership: ObjectOwnership.BUCKET_OWNER_ENFORCED,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const jpgBucket = new Bucket(this, 'jpg-bucket', {
      bucketName: 'jpg-bucket-5wyasda9',
      encryption: BucketEncryption.S3_MANAGED,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      objectLockEnabled: false,
      objectOwnership: ObjectOwnership.BUCKET_OWNER_ENFORCED,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const webSiteBucket = new Bucket(this, 'my-static-website-bucket', {
      bucketName: 'my-static-website-5wyasda9',
      encryption: BucketEncryption.S3_MANAGED,
      blockPublicAccess: {
        blockPublicAcls: false,
        blockPublicPolicy: false,
        ignorePublicAcls: false,
        restrictPublicBuckets: false,
      },
      objectLockEnabled: false,
      objectOwnership: ObjectOwnership.BUCKET_OWNER_ENFORCED,
      removalPolicy: RemovalPolicy.DESTROY,
      websiteIndexDocument: 'index.html',
    });

    webSiteBucket.addToResourcePolicy(
      new PolicyStatement({
        sid: 'Statement1',
        effect: Effect.ALLOW,
        principals: [new AnyPrincipal()],
        actions: ['s3:GetObject'],
        resources: [webSiteBucket.arnForObjects('*')],
      }),
    );

    //* Upload files when the bucket is deployed
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    new BucketDeployment(this, 'DeployWebsite', {
      destinationBucket: webSiteBucket,
      sources: [Source.asset(path.join(__dirname, 'files', 'html'))],
    });

    new BucketDeployment(this, 'DeployJpg', {
      destinationBucket: jpgBucket,
      sources: [Source.asset(path.join(__dirname, 'files', 'jpg'))],
    });

    new BucketDeployment(this, 'DeployPdf', {
      destinationBucket: pdfBucket,
      sources: [Source.asset(path.join(__dirname, 'files', 'pdf'))],
    });

    //* Create OAC
    const myOac = new CfnOriginAccessControl(this, 'MyOAC', {
      originAccessControlConfig: {
        name: 'MyOAC',
        originAccessControlOriginType: OriginAccessControlOriginType.S3,
        signingBehavior: SigningBehavior.ALWAYS,
        signingProtocol: SigningProtocol.SIGV4,
      },
    });

    //* Create Cloudfront Distribution
    new Distribution(this, 'MyCloudfrontDistribution', {
      defaultBehavior: {
        origin: new S3StaticWebsiteOrigin(webSiteBucket),
        cachePolicy: CachePolicy.CACHING_DISABLED,
        viewerProtocolPolicy: ViewerProtocolPolicy.ALLOW_ALL,
      },
      additionalBehaviors: {
        '*.pdf': {
          origin: S3BucketOrigin.withOriginAccessControl(pdfBucket, {
            originAccessControlId: myOac.attrId,
          }),
          cachePolicy: CachePolicy.CACHING_DISABLED,
          viewerProtocolPolicy: ViewerProtocolPolicy.ALLOW_ALL,
        },
        '*.jpg': {
          origin: S3BucketOrigin.withOriginAccessControl(jpgBucket, {
            originAccessControlId: myOac.attrId,
          }),
          cachePolicy: CachePolicy.CACHING_DISABLED,
          viewerProtocolPolicy: ViewerProtocolPolicy.ALLOW_ALL,
        },
      },
    });
  }
}
