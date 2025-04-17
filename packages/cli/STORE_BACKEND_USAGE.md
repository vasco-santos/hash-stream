# `hash-stream` CLI Store backend usage

## Introduction

By default `hash-stream` cli relies on a local FS store to store the generated indexes and packs. However, it can also be used with other backend stores like a S3-like remote storage.

## Getting started

### Install

Install the CLI from npm (**requires Node 20 or higher**):

```sh
npm install -g @hash-stream/cli
```

## S3-like remote store backend

### Setup environment

The common remote stores S3-Like are S3 client compatible backends, such as AWS S3 iteself and Cloudflare R2.

#### S3-like Store Environment Variables

| Variable                      | Description                                            |
| ----------------------------- | ------------------------------------------------------ |
| `AWS_ACCESS_KEY_ID`           | Your AWS access key                                    |
| `AWS_SECRET_ACCESS_KEY`       | Your AWS secret key                                    |
| `AWS_SESSION_TOKEN`           | _(optional)_ Temporary session token for assumed roles |
| `AWS_REGION`                  | _(optional)_ AWS region (default: `us-east-1`)         |
| `AWS_ENDPOINT`                | _(optional)_ Custom endpoint for the bucket            |
| `HASH_STREAM_S3_INDEX_BUCKET` | Name of the S3 bucket to store indexes                 |
| `HASH_STREAM_S3_PACK_BUCKET`  | Name of the S3 bucket to store packs                   |
| `HASH_STREAM_S3_INDEX_PREFIX` | _(optional)_ Prefix/folder path within the bucket      |
| `HASH_STREAM_S3_PACK_PREFIX`  | _(optional)_ Prefix/folder path within the bucket      |

#### Example usage

```sh
# Set backend via env vars
export HASH_STREAM_STORE_BACKEND="s3"
export AWS_ACCESS_KEY_ID="AKIA..."
export AWS_SECRET_ACCESS_KEY="..."
export AWS_REGION="auto"
export AWS_ENDPOINT="https://....r2.cloudflarestorage.com"
export HASH_STREAM_S3_INDEX_BUCKET="hashstream-index"
export HASH_STREAM_S3_PACK_BUCKET="hashstream-pack"
export HASH_STREAM_S3_INDEX_PREFIX="staging/"
export HASH_STREAM_S3_PACK_PREFIX="staging/"

# Run any command
hash-stream pack write IMG_9528.mov --pack-size 10000000 --store-backend s3
```

Or override the backend on a specific command:

```sh
hash-stream pack write IMG_9528.mov --store-backend fs
```

You can also create an environmental file `hash-stream.env` and get them to be used without adding environmental variables to your shell:

```sh
# hash-stream.env
AWS_ACCESS_KEY_ID="AKIA..."
AWS_SECRET_ACCESS_KEY="..."
AWS_REGION="auto"
AWS_ENDPOINT="https://....r2.cloudflarestorage.com"
HASH_STREAM_S3_INDEX_BUCKET="hashstream-index"
HASH_STREAM_S3_PACK_BUCKET="hashstream-pack"
HASH_STREAM_S3_INDEX_PREFIX="staging/"
HASH_STREAM_S3_PACK_PREFIX="staging/"
```

```sh
env $(cat myenv.env | xargs) hash-stream pack write IMG_9528.mov --pack-size 10000000 --store-backend s3

Packing file: IMG_9528.mov
    Pack Max Size: 10000000 bytes
    Index Writer: multiple-level
    Store backend: s3

Containing CID:
    MH(bafybeiaxbrtsdhi4n2qv53wskm7s6dcr3wpxy7kqdcjp2tx2dafxeiqu2m)

Packs:
    MH(bafkreigvylk6q2vmti3i7z6c2rv5b3jk52btod4epse5dl2ni2kxu4wdte)
        Blobs:
            MH(bafkreidjbm25tjpzg66ddnitlogc2bifbbji4rcxfzuep5llfnpa7hui2e),
            MH(bafkreihkwlpvy46rbd7do6oa7l7gp2urxazp5lk3onakixbon2gvvsavna),
            MH(bafkreig2k2hhgvie7pxcfktkctvn72bw2dgg6wsu4cemixyiqdhznrv3ce),
            MH(bafkreicxbwgntwtizqqewws3xtwkt32sjjypbhqwvg6bki3u6kx52yiz4y),
            MH(bafkreibrq22eilaj5pvoc6luqeycfc2t6opjlbhpinasisxmxgcv2yfrgu),
            MH(bafkreidfmitzyypu3hdxglewmfiqcies67dosbgepnpudwnydlr67kkgri),
            MH(bafkreidptaxd2uubepctq5wr5yepze7serf524alvadctpjv7su6ug2egy),
            MH(bafkreigmy4pwdap6fia6veb3od6zacqlsk6oxozlsodgtqyxi63h3z2zem),
            MH(bafkreieeaoo6ewyigodpvzlu66rg7qi7pgeve7lh7osdd7mtv66c5g23vq)


    MH(bafkreicsn43ropajl3vgtgqcfq6r6qidwgxarbzbtgnungzshv2ui3s7fe)
        Blobs:
            MH(bafkreiaayh53fuqf53onxchkn23oxcebai2mp63dzwjojrbqgwnyiblsnq),
            MH(bafkreigjecysg76hvjoaw4t4fj7aggbhojsw327jiwzyasnrfh43kxrsdy),
            MH(bafkreieto3xhqg6bezukenranjbacuu6jxodgofk2znttpfkszzvpjnjhe),
            MH(bafkreiej7pqfd6pbp4m2syk552ttfliw4dhpwf22n43qsvwgwkdap6iave),
            MH(bafkreib46iztegkgtltbbkl2vb7qt7fphuqsnysh6fn6ef56bwrk7rtp6a),
            MH(bafkreiezhrrjvecdls7pc5xjx2eywcleeohvayenhvvkgpqlzeszy4llby),
            MH(bafkreieq4fw4arrhvq3fvbpenijwh4uurrimcq3oylx24y5tj6xxn42jjq),
            MH(bafkreiaxbrtsdhi4n2qv53wskm7s6dcr3wpxy7kqdcjp2tx2dafxeiqu2m)
```
