# `hash-stream` CLI basic usage

## Getting started

Install the CLI from npm (**requires Node 20 or higher**):

```sh
npm install -g @hash-stream/cli
```

## Create a set of packs from a file

```sh
# Pack writer sses multiple-level index writer implementation by default to associate blobs to the pack (CAR file). Example uses maximum pack size to have multiple packs for the file.
# pack write <filePath> --pack-size <number>
$ hash-stream pack write IMG_9528.mov --pack-size 10000000

Packing file: IMG_9528.mov
    Pack Max Size: 10000000 bytes
    Index Writer: multiple-level
    Store backend: fs

Containing CID:
    bafkreiaxbrtsdhi4n2qv53wskm7s6dcr3wpxy7kqdcjp2tx2dafxeiqu2m
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

## Find Index records for the written file

### Find location of a specific blob

```sh
# find target index records stored in the index
# index find records <targetCid> <containingCid>
$ hash-stream index find records bafkreigjecysg76hvjoaw4t4fj7aggbhojsw327jiwzyasnrfh43kxrsdy bafkreiaxbrtsdhi4n2qv53wskm7s6dcr3wpxy7kqdcjp2tx2dafxeiqu2m

Target CID:
    bafkreigjecysg76hvjoaw4t4fj7aggbhojsw327jiwzyasnrfh43kxrsdy
    base58btc(zQmbsmZzmMc9kAEfjnh8s2wh9CAKR25op2eDLnNpkdSxJSh)
Containing CID:
    bafkreiaxbrtsdhi4n2qv53wskm7s6dcr3wpxy7kqdcjp2tx2dafxeiqu2m
    base58btc(zQmPtd4BkLdfLC8k1TcWeWQvgE7LMPxrp3ipHV5iDUp53WA)

Finding target written using (multiple-level)...
    bafkreigjecysg76hvjoaw4t4fj7aggbhojsw327jiwzyasnrfh43kxrsdy
    base58btc(zQmbsmZzmMc9kAEfjnh8s2wh9CAKR25op2eDLnNpkdSxJSh)

Index Records:
    multihash: base58btc(zQmbsmZzmMc9kAEfjnh8s2wh9CAKR25op2eDLnNpkdSxJSh)
    location: base58btc(zQmTtSVxPLQs4AgqsrZqdocT9Hzom1h93E75JJpYFEfn2RE)
    type: BLOB, offset: 1048713, length: 1048576
```

### Find location of a specific pack

```sh
# find target index records stored in the index
# index find records <targetCid> <containingCid>
$ hash-stream index find records bafkreigvylk6q2vmti3i7z6c2rv5b3jk52btod4epse5dl2ni2kxu4wdte bafkreiaxbrtsdhi4n2qv53wskm7s6dcr3wpxy7kqdcjp2tx2dafxeiqu2m
Target CID:
    bafkreigvylk6q2vmti3i7z6c2rv5b3jk52btod4epse5dl2ni2kxu4wdte
    base58btc(zQmcj5rzVKBfKz4rWCKRVfr6TmJPMhPjEjvyALTNKZd1Sba)
Containing CID:
    bafkreiaxbrtsdhi4n2qv53wskm7s6dcr3wpxy7kqdcjp2tx2dafxeiqu2m
    base58btc(zQmPtd4BkLdfLC8k1TcWeWQvgE7LMPxrp3ipHV5iDUp53WA)

Finding target written using (multiple-level)...
    bafkreigvylk6q2vmti3i7z6c2rv5b3jk52btod4epse5dl2ni2kxu4wdte
    base58btc(zQmcj5rzVKBfKz4rWCKRVfr6TmJPMhPjEjvyALTNKZd1Sba)

Index Records:
    multihash: base58btc(zQmcj5rzVKBfKz4rWCKRVfr6TmJPMhPjEjvyALTNKZd1Sba)
    location: base58btc(zQmcj5rzVKBfKz4rWCKRVfr6TmJPMhPjEjvyALTNKZd1Sba)
    type: PACK, offset: N/A, length: N/A

    Sub-Records:
        multihash: base58btc(zQmVQhS2Vd13wumFjMkvXd1gHX1DnZ846kRJSo6zKS64AAU)
        location: base58btc(zQmcj5rzVKBfKz4rWCKRVfr6TmJPMhPjEjvyALTNKZd1Sba)
        type: BLOB, offset: 57, length: 1048576

        multihash: base58btc(zQme8pJjXuAbxweudkYJwn6v4mCZke5xSQhWJYqXoKPrEbR)
        location: base58btc(zQmcj5rzVKBfKz4rWCKRVfr6TmJPMhPjEjvyALTNKZd1Sba)
        type: BLOB, offset: 1048672, length: 1048576

        multihash: base58btc(zQmd2x8zYEeec2fkqGyEYXPSUKaFTZ4SS1QsRGuUozdmoHz)
        location: base58btc(zQmcj5rzVKBfKz4rWCKRVfr6TmJPMhPjEjvyALTNKZd1Sba)
        type: BLOB, offset: 2097287, length: 1048576

        multihash: base58btc(zQmUCUAQwxQHZRaWcojDLSnyFp2RaUWcB6gDksvauqtmZkR)
        location: base58btc(zQmcj5rzVKBfKz4rWCKRVfr6TmJPMhPjEjvyALTNKZd1Sba)
        type: BLOB, offset: 3145902, length: 1048576

        multihash: base58btc(zQmRfypVyXqzqreHyD3y9MKmSzNrb2K86fU9Cttap162q8g)
        location: base58btc(zQmcj5rzVKBfKz4rWCKRVfr6TmJPMhPjEjvyALTNKZd1Sba)
        type: BLOB, offset: 4194517, length: 1048576

        multihash: base58btc(zQmVAQhJ6HK5sWD21p3k4X75MicfQMjq8eqSU1xgBVkFrB3)
        location: base58btc(zQmcj5rzVKBfKz4rWCKRVfr6TmJPMhPjEjvyALTNKZd1Sba)
        type: BLOB, offset: 5243132, length: 1048576

        multihash: base58btc(zQmVrGZ3ZtT9MT2F6KwHTSvBGW6QWjDvB3xQjVYVbw91btZ)
        location: base58btc(zQmcj5rzVKBfKz4rWCKRVfr6TmJPMhPjEjvyALTNKZd1Sba)
        type: BLOB, offset: 6291747, length: 1048576

        multihash: base58btc(zQmc81z5TnsrKQPgmtmc63bDDjXeDeF4GxiMV7W46pf9e6E)
        location: base58btc(zQmcj5rzVKBfKz4rWCKRVfr6TmJPMhPjEjvyALTNKZd1Sba)
        type: BLOB, offset: 7340362, length: 1048576

        multihash: base58btc(zQmXDyixoWSEWDJijus7UPNZUGcdeURLc7DxXkE3vtBX3JT)
        location: base58btc(zQmcj5rzVKBfKz4rWCKRVfr6TmJPMhPjEjvyALTNKZd1Sba)
        type: BLOB, offset: 8388977, length: 1048576
```

### Find location of a specific containing

```sh
# find target index records stored in the index for containing
# index find records <targetCid>
$ hash-stream index find records bafkreiaxbrtsdhi4n2qv53wskm7s6dcr3wpxy7kqdcjp2tx2dafxeiqu2m

Packing file: IMG_9528.mov
    Pack Max Size: 10000000 bytes
    Index Writer: multiple-level

Containing CID:
    bafkreiaxbrtsdhi4n2qv53wskm7s6dcr3wpxy7kqdcjp2tx2dafxeiqu2m
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

## Streamer dump written packs

Install the CLI for `ipfs-car` to inspect written packs content:

```sh
npm install -g ipfs-car
```

### Streamer dump blob within a containing

```sh
# Dump the blob data associated with the given target CID into the file system
# streamer dump <targetCid> <filePath> [containingCid]
$ hash-stream streamer dump bafkreigjecysg76hvjoaw4t4fj7aggbhojsw327jiwzyasnrfh43kxrsdy blob.car bafkreiaxbrtsdhi4n2qv53wskm7s6dcr3wpxy7kqdcjp2tx2dafxeiqu2m

Target CID:
      bafkreigjecysg76hvjoaw4t4fj7aggbhojsw327jiwzyasnrfh43kxrsdy
      base58btc(zQmbsmZzmMc9kAEfjnh8s2wh9CAKR25op2eDLnNpkdSxJSh)
Containing CID:
      bafkreiaxbrtsdhi4n2qv53wskm7s6dcr3wpxy7kqdcjp2tx2dafxeiqu2m
      base58btc(zQmPtd4BkLdfLC8k1TcWeWQvgE7LMPxrp3ipHV5iDUp53WA)

Successfully wrote bafkreigjecysg76hvjoaw4t4fj7aggbhojsw327jiwzyasnrfh43kxrsdy bytes to /Users/vcs/work/github/hash-stream/blob.car

# Listing blocks of written CAR file, it should contain the CID of the fetched blob
$ ipfs-car blocks blob.car
bafkreigjecysg76hvjoaw4t4fj7aggbhojsw327jiwzyasnrfh43kxrsdy
```

### Streamer dump pack within a containing

```sh
# Dump the pack data associated with the given target CID into the file system
# streamer dump <targetCid> <filePath> [containingCid]
$ hash-stream streamer dump bafkreicsn43ropajl3vgtgqcfq6r6qidwgxarbzbtgnungzshv2ui3s7fe pack.car bafkreiaxbrtsdhi4n2qv53wskm7s6dcr3wpxy7kqdcjp2tx2dafxeiqu2m

Target CID:
      bafkreicsn43ropajl3vgtgqcfq6r6qidwgxarbzbtgnungzshv2ui3s7fe
      base58btc(zQmTtSVxPLQs4AgqsrZqdocT9Hzom1h93E75JJpYFEfn2RE)
Containing CID:
      bafkreiaxbrtsdhi4n2qv53wskm7s6dcr3wpxy7kqdcjp2tx2dafxeiqu2m
      base58btc(zQmPtd4BkLdfLC8k1TcWeWQvgE7LMPxrp3ipHV5iDUp53WA)

Successfully wrote bafkreicsn43ropajl3vgtgqcfq6r6qidwgxarbzbtgnungzshv2ui3s7fe bytes to /Users/vcs/work/github/hash-stream/pack.car

# Listing blocks of written CAR file, it should contain the blob CIDs previously listed on the index records
$ ipfs-car blocks pack.car
bafkreiaayh53fuqf53onxchkn23oxcebai2mp63dzwjojrbqgwnyiblsnq
bafkreigjecysg76hvjoaw4t4fj7aggbhojsw327jiwzyasnrfh43kxrsdy
bafkreieto3xhqg6bezukenranjbacuu6jxodgofk2znttpfkszzvpjnjhe
bafkreiej7pqfd6pbp4m2syk552ttfliw4dhpwf22n43qsvwgwkdap6iave
bafkreib46iztegkgtltbbkl2vb7qt7fphuqsnysh6fn6ef56bwrk7rtp6a
bafkreiezhrrjvecdls7pc5xjx2eywcleeohvayenhvvkgpqlzeszy4llby
bafkreieq4fw4arrhvq3fvbpenijwh4uurrimcq3oylx24y5tj6xxn42jjq
bafkreiaxbrtsdhi4n2qv53wskm7s6dcr3wpxy7kqdcjp2tx2dafxeiqu2m
```

### Streamer dump containing

```sh
# Dump the pack data associated with the given containing CID as target CID into the file system
# streamer dump <targetCid> <filePath> [containingCid]
$ hash-stream streamer dump bafkreiaxbrtsdhi4n2qv53wskm7s6dcr3wpxy7kqdcjp2tx2dafxeiqu2m containing.car

Target CID:
      bafkreiaxbrtsdhi4n2qv53wskm7s6dcr3wpxy7kqdcjp2tx2dafxeiqu2m
      base58btc(zQmPtd4BkLdfLC8k1TcWeWQvgE7LMPxrp3ipHV5iDUp53WA)

Successfully wrote bafkreiaxbrtsdhi4n2qv53wskm7s6dcr3wpxy7kqdcjp2tx2dafxeiqu2m bytes to /Users/vcs/work/github/hash-stream/containing.car

# Listing blocks of written CAR file, it should contain the blob CIDs previously listed on the index records for both packs, together with a root CID
$ ipfs-car blocks containing.car
bafkreidjbm25tjpzg66ddnitlogc2bifbbji4rcxfzuep5llfnpa7hui2e
bafkreihkwlpvy46rbd7do6oa7l7gp2urxazp5lk3onakixbon2gvvsavna
bafkreig2k2hhgvie7pxcfktkctvn72bw2dgg6wsu4cemixyiqdhznrv3ce
bafkreicxbwgntwtizqqewws3xtwkt32sjjypbhqwvg6bki3u6kx52yiz4y
bafkreibrq22eilaj5pvoc6luqeycfc2t6opjlbhpinasisxmxgcv2yfrgu
bafkreidfmitzyypu3hdxglewmfiqcies67dosbgepnpudwnydlr67kkgri
bafkreidptaxd2uubepctq5wr5yepze7serf524alvadctpjv7su6ug2egy
bafkreigmy4pwdap6fia6veb3od6zacqlsk6oxozlsodgtqyxi63h3z2zem
bafkreieeaoo6ewyigodpvzlu66rg7qi7pgeve7lh7osdd7mtv66c5g23vq
bafkreiaayh53fuqf53onxchkn23oxcebai2mp63dzwjojrbqgwnyiblsnq
bafkreigjecysg76hvjoaw4t4fj7aggbhojsw327jiwzyasnrfh43kxrsdy
bafkreieto3xhqg6bezukenranjbacuu6jxodgofk2znttpfkszzvpjnjhe
bafkreiej7pqfd6pbp4m2syk552ttfliw4dhpwf22n43qsvwgwkdap6iave
bafkreib46iztegkgtltbbkl2vb7qt7fphuqsnysh6fn6ef56bwrk7rtp6a
bafkreiezhrrjvecdls7pc5xjx2eywcleeohvayenhvvkgpqlzeszy4llby
bafkreieq4fw4arrhvq3fvbpenijwh4uurrimcq3oylx24y5tj6xxn42jjq
bafybeiaxbrtsdhi4n2qv53wskm7s6dcr3wpxy7kqdcjp2tx2dafxeiqu2m
bafkreiaxbrtsdhi4n2qv53wskm7s6dcr3wpxy7kqdcjp2tx2dafxeiqu2m

# Unpacking the containing.car should get to same content that was written
ipfs-car unpack containing.car --output new-img.mov --root bafkreiaxbrtsdhi4n2qv53wskm7s6dcr3wpxy7kqdcjp2tx2dafxeiqu2m

# Check diff
diff IMG_9528.mov new-img.mov
```
