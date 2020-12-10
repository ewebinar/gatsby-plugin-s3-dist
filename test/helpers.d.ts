/// <reference types="node" />
import S3 from 'aws-sdk/clients/s3';
export declare enum EnvironmentBoolean {
    False = "",
    True = "true"
}
export declare const s3: S3;
/**
 * Permissions to request from IAM when using the included policy for the test runner
 * Basic permissions (ListBucket, GetBucketLocation & GetObject) are automatically included
 */
export declare enum Permission {
    PutObject = "PutObject",
    PutObjectAcl = "PutObjectAcl",
    PutBucketWebsite = "PutBucketWebsite",
    DeleteObject = "DeleteObject",
    CreateBucket = "CreateBucket",
    PutBucketAcl = "PutBucketAcl"
}
export declare const emptyBucket: (bucketName: string) => Promise<void>;
export declare const forceDeleteBucket: (bucketName: string) => Promise<void>;
export declare const generateBucketName: () => string;
export declare const runScript: (cwd: string, script: string, args: string[], env: NodeJS.ProcessEnv) => Promise<{
    exitCode: number;
    output: string;
}>;
export declare const resolveSiteDirectory: (site: string) => string;
export declare const buildSite: (site: string, env: NodeJS.ProcessEnv) => Promise<string>;
export declare const deploySite: (site: string, additionalPermissions: Permission[]) => Promise<string>;
export declare const cleanupExistingBuckets: (deleteBuckets: boolean) => Promise<void>;
