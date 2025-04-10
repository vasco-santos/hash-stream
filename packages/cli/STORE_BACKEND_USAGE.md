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
    bafyreiaxbrtsdhi4n2qv53wskm7s6dcr3wpxy7kqdcjp2tx2dafxeiqu2m
    base58btc(zQmPtd4BkLdfLC8k1TcWeWQvgE7LMPxrp3ipHV5iDUp53WA)

Packs:
    bafkreigvylk6q2vmti3i7z6c2rv5b3jk52btod4epse5dl2ni2kxu4wdte
    base58btc(zQmcj5rzVKBfKz4rWCKRVfr6TmJPMhPjEjvyALTNKZd1Sba)
        Blobs:
            bafkreidjbm25tjpzg66ddnitlogc2bifbbji4rcxfzuep5llfnpa7hui2e
            base58btc(zQmVQhS2Vd13wumFjMkvXd1gHX1DnZ846kRJSo6zKS64AAU)

            bafkreihkwlpvy46rbd7do6oa7l7gp2urxazp5lk3onakixbon2gvvsavna
            base58btc(zQme8pJjXuAbxweudkYJwn6v4mCZke5xSQhWJYqXoKPrEbR)

            bafkreig2k2hhgvie7pxcfktkctvn72bw2dgg6wsu4cemixyiqdhznrv3ce
            base58btc(zQmd2x8zYEeec2fkqGyEYXPSUKaFTZ4SS1QsRGuUozdmoHz)

            bafkreicxbwgntwtizqqewws3xtwkt32sjjypbhqwvg6bki3u6kx52yiz4y
            base58btc(zQmUCUAQwxQHZRaWcojDLSnyFp2RaUWcB6gDksvauqtmZkR)

            bafkreibrq22eilaj5pvoc6luqeycfc2t6opjlbhpinasisxmxgcv2yfrgu
            base58btc(zQmRfypVyXqzqreHyD3y9MKmSzNrb2K86fU9Cttap162q8g)

            bafkreidfmitzyypu3hdxglewmfiqcies67dosbgepnpudwnydlr67kkgri
            base58btc(zQmVAQhJ6HK5sWD21p3k4X75MicfQMjq8eqSU1xgBVkFrB3)

            bafkreidptaxd2uubepctq5wr5yepze7serf524alvadctpjv7su6ug2egy
            base58btc(zQmVrGZ3ZtT9MT2F6KwHTSvBGW6QWjDvB3xQjVYVbw91btZ)

            bafkreigmy4pwdap6fia6veb3od6zacqlsk6oxozlsodgtqyxi63h3z2zem
            base58btc(zQmc81z5TnsrKQPgmtmc63bDDjXeDeF4GxiMV7W46pf9e6E)

            bafkreieeaoo6ewyigodpvzlu66rg7qi7pgeve7lh7osdd7mtv66c5g23vq
            base58btc(zQmXDyixoWSEWDJijus7UPNZUGcdeURLc7DxXkE3vtBX3JT)



    bafkreicsn43ropajl3vgtgqcfq6r6qidwgxarbzbtgnungzshv2ui3s7fe
    base58btc(zQmTtSVxPLQs4AgqsrZqdocT9Hzom1h93E75JJpYFEfn2RE)
        Blobs:
            bafkreiaayh53fuqf53onxchkn23oxcebai2mp63dzwjojrbqgwnyiblsnq
            base58btc(zQmNPcGa3ggpDXkThp1itG7qSgUDoJTi6q9kbW1HogqueKd)

            bafkreigjecysg76hvjoaw4t4fj7aggbhojsw327jiwzyasnrfh43kxrsdy
            base58btc(zQmbsmZzmMc9kAEfjnh8s2wh9CAKR25op2eDLnNpkdSxJSh)

            bafkreieto3xhqg6bezukenranjbacuu6jxodgofk2znttpfkszzvpjnjhe
            base58btc(zQmYGHpnhuFKgyZ1ZSkztapH8F2aRGM44PdmdXB8YRqHAPz)

            bafkreiej7pqfd6pbp4m2syk552ttfliw4dhpwf22n43qsvwgwkdap6iave
            base58btc(zQmXdHKnm3fB7GsJ5P49XML6e5XYJevZvG8XqS18ViTRiQp)

            bafkreib46iztegkgtltbbkl2vb7qt7fphuqsnysh6fn6ef56bwrk7rtp6a
            base58btc(zQmSSZNfPNkEoRneDk7fTVhVuv8mQzxp23Z3cqdoGHYHo6f)

            bafkreiezhrrjvecdls7pc5xjx2eywcleeohvayenhvvkgpqlzeszy4llby
            base58btc(zQmYepVWAsFdSs3CjmYCsnMKfJovPt46QoCAF6tQ5ykYyKK)

            bafkreieq4fw4arrhvq3fvbpenijwh4uurrimcq3oylx24y5tj6xxn42jjq
            base58btc(zQmY6Cng99RXNktnD3pAcv7MAgpzw5krmJ83coRLSWTXD2s)

            bafkreiaxbrtsdhi4n2qv53wskm7s6dcr3wpxy7kqdcjp2tx2dafxeiqu2m
            base58btc(zQmPtd4BkLdfLC8k1TcWeWQvgE7LMPxrp3ipHV5iDUp53WA)
```
