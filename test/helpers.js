"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = __importDefault(require("crypto"));
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
const s3_1 = __importDefault(require("aws-sdk/clients/s3"));
// IMPORTANT: Must match what's in test-infrastructure/template.tf
const bucketPrefix = 'gatsby-plugin-s3-tests-';
const bucketRandomCharacters = 12; // Must be an even number
const considerBucketsLeftoverIfOlderThan = 1000 * 60 * 60 * 1; // 1 hour
const region = 'eu-west-1';
var EnvironmentBoolean;
(function (EnvironmentBoolean) {
    EnvironmentBoolean["False"] = "";
    EnvironmentBoolean["True"] = "true";
})(EnvironmentBoolean = exports.EnvironmentBoolean || (exports.EnvironmentBoolean = {}));
exports.s3 = new s3_1.default({
    region,
    customUserAgent: 'TestPerms/Admin+PutObject',
    httpOptions: {
        proxy: process.env.HTTPS_PROXY,
    },
});
/**
 * Permissions to request from IAM when using the included policy for the test runner
 * Basic permissions (ListBucket, GetBucketLocation & GetObject) are automatically included
 */
var Permission;
(function (Permission) {
    Permission["PutObject"] = "PutObject";
    Permission["PutObjectAcl"] = "PutObjectAcl";
    Permission["PutBucketWebsite"] = "PutBucketWebsite";
    Permission["DeleteObject"] = "DeleteObject";
    Permission["CreateBucket"] = "CreateBucket";
    Permission["PutBucketAcl"] = "PutBucketAcl";
})(Permission = exports.Permission || (exports.Permission = {}));
exports.emptyBucket = async (bucketName) => {
    let token;
    do {
        const response = await exports.s3
            .listObjectsV2({
            Bucket: bucketName,
            ContinuationToken: token,
        })
            .promise();
        if (response.Contents && response.Contents.length > 0) {
            await exports.s3
                .deleteObjects({
                Bucket: bucketName,
                Delete: {
                    Objects: response.Contents.map(o => ({ Key: o.Key })),
                },
            })
                .promise();
        }
        token = response.NextContinuationToken;
    } while (token);
};
exports.forceDeleteBucket = async (bucketName) => {
    await exports.emptyBucket(bucketName);
    await exports.s3
        .deleteBucket({
        Bucket: bucketName,
    })
        .promise();
};
exports.generateBucketName = () => {
    return bucketPrefix + crypto_1.default.randomBytes(bucketRandomCharacters / 2).toString('hex');
};
exports.runScript = (cwd, script, args, env) => {
    return new Promise((resolve, reject) => {
        const proc = child_process_1.fork(script, args, { env: Object.assign(Object.assign({}, process.env), env), cwd, stdio: 'pipe' });
        let running = true;
        let output = '';
        proc.stdout.on('data', (chunk) => {
            const str = chunk.toString();
            console.log(str);
            output += str;
        });
        proc.stderr.on('data', (chunk) => {
            const str = chunk.toString();
            console.warn(str);
            output += str;
        });
        proc.once('error', err => {
            if (running) {
                running = false;
                reject(err);
            }
        });
        proc.once('exit', (exitCode, signal) => {
            if (running) {
                running = false;
                if (exitCode !== null) {
                    resolve({ exitCode, output });
                }
                else {
                    // If exitCode is null signal will be non-null
                    // https://nodejs.org/api/child_process.html#child_process_event_exit
                    reject(new Error(`Child process was unexpectedly terminated: ${signal}`));
                }
            }
        });
    });
};
exports.resolveSiteDirectory = (site) => path_1.default.resolve('./examples/', site);
exports.buildSite = async (site, env) => {
    const siteDirectory = exports.resolveSiteDirectory(site);
    console.debug(`building site ${site}.`);
    const output = await exports.runScript(siteDirectory, './node_modules/gatsby/dist/bin/gatsby.js', ['build'], env);
    if (output.exitCode) {
        throw new Error(`Failed to build site ${site}, exited with error code ${output.exitCode}`);
    }
    console.debug(`built site ${site}.`);
    return output.output;
};
exports.deploySite = async (site, additionalPermissions) => {
    const siteDirectory = exports.resolveSiteDirectory(site);
    const userAgent = `TestPerms/${additionalPermissions.join('+')}`;
    // const userAgent = additionalPermissions.map(p => "TestPerms/" + p).join(" ");
    console.log(userAgent);
    console.debug(`deploying site ${site}.`);
    const output = await exports.runScript(siteDirectory, './node_modules/gatsby-plugin-s3/bin.js', ['-y', '--userAgent', userAgent], {});
    if (output.exitCode) {
        throw new Error(`Failed to deploy site ${site}, exited with error \
code ${output.exitCode} and the following output:\n${output.output}`);
    }
    console.debug(`deployed site ${site}.`);
    return output.output;
};
exports.cleanupExistingBuckets = async (deleteBuckets) => {
    const buckets = (await exports.s3.listBuckets().promise()).Buckets;
    if (buckets) {
        const bucketsToDelete = buckets
            .filter(b => !b.CreationDate ||
            b.CreationDate.valueOf() + considerBucketsLeftoverIfOlderThan < Date.now().valueOf())
            .map(b => b.Name)
            .filter(n => n.startsWith(bucketPrefix));
        if (bucketsToDelete.length > 0) {
            if (deleteBuckets) {
                console.log('Deleting leftover test buckets:', bucketsToDelete);
                await Promise.all(bucketsToDelete.map(n => exports.forceDeleteBucket(n)));
            }
            else {
                console.log('Detected leftover test buckets');
                console.log('Set environment variable CLEANUP_TEST_BUCKETS to 1 to remove:', bucketsToDelete);
            }
        }
    }
};
//# sourceMappingURL=helpers.js.map