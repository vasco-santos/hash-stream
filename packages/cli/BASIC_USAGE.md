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

## Find Index records for the written file

### Find location of a specific blob

```sh
# find target index records stored in the index
# index find records <targetCid> <containingCid>
$ hash-stream index find records bafkreigjecysg76hvjoaw4t4fj7aggbhojsw327jiwzyasnrfh43kxrsdy bafybeiaxbrtsdhi4n2qv53wskm7s6dcr3wpxy7kqdcjp2tx2dafxeiqu2m

Target CID: MH(bafkreigjecysg76hvjoaw4t4fj7aggbhojsw327jiwzyasnrfh43kxrsdy)
Containing CID: MH(bafybeiaxbrtsdhi4n2qv53wskm7s6dcr3wpxy7kqdcjp2tx2dafxeiqu2m)
Store backend: fs

Finding target...

Index Records:
    CID: MH(bafkreigjecysg76hvjoaw4t4fj7aggbhojsw327jiwzyasnrfh43kxrsdy)
    location: MH(bafkreicsn43ropajl3vgtgqcfq6r6qidwgxarbzbtgnungzshv2ui3s7fe)
    type: BLOB, offset: 1048713, length: 1048576
```

### Find location of a specific pack

```sh
# find target index records stored in the index
# index find records <targetCid> <containingCid>
$ hash-stream index find records bafkreigvylk6q2vmti3i7z6c2rv5b3jk52btod4epse5dl2ni2kxu4wdte bafybeiaxbrtsdhi4n2qv53wskm7s6dcr3wpxy7kqdcjp2tx2dafxeiqu2m

Target CID: MH(bafkreigvylk6q2vmti3i7z6c2rv5b3jk52btod4epse5dl2ni2kxu4wdte)
Containing CID: MH(bafybeiaxbrtsdhi4n2qv53wskm7s6dcr3wpxy7kqdcjp2tx2dafxeiqu2m)
Store backend: fs

Finding target...

Index Records:
    CID: MH(bafkreigvylk6q2vmti3i7z6c2rv5b3jk52btod4epse5dl2ni2kxu4wdte)
    location: MH(bafkreigvylk6q2vmti3i7z6c2rv5b3jk52btod4epse5dl2ni2kxu4wdte)
    type: PACK, offset: N/A, length: N/A

    Sub-Records:
        CID: MH(bafkreidjbm25tjpzg66ddnitlogc2bifbbji4rcxfzuep5llfnpa7hui2e)
        location: MH(bafkreigvylk6q2vmti3i7z6c2rv5b3jk52btod4epse5dl2ni2kxu4wdte)
        type: BLOB, offset: 57, length: 1048576

        CID: MH(bafkreihkwlpvy46rbd7do6oa7l7gp2urxazp5lk3onakixbon2gvvsavna)
        location: MH(bafkreigvylk6q2vmti3i7z6c2rv5b3jk52btod4epse5dl2ni2kxu4wdte)
        type: BLOB, offset: 1048672, length: 1048576

        CID: MH(bafkreig2k2hhgvie7pxcfktkctvn72bw2dgg6wsu4cemixyiqdhznrv3ce)
        location: MH(bafkreigvylk6q2vmti3i7z6c2rv5b3jk52btod4epse5dl2ni2kxu4wdte)
        type: BLOB, offset: 2097287, length: 1048576

        CID: MH(bafkreicxbwgntwtizqqewws3xtwkt32sjjypbhqwvg6bki3u6kx52yiz4y)
        location: MH(bafkreigvylk6q2vmti3i7z6c2rv5b3jk52btod4epse5dl2ni2kxu4wdte)
        type: BLOB, offset: 3145902, length: 1048576

        CID: MH(bafkreibrq22eilaj5pvoc6luqeycfc2t6opjlbhpinasisxmxgcv2yfrgu)
        location: MH(bafkreigvylk6q2vmti3i7z6c2rv5b3jk52btod4epse5dl2ni2kxu4wdte)
        type: BLOB, offset: 4194517, length: 1048576

        CID: MH(bafkreidfmitzyypu3hdxglewmfiqcies67dosbgepnpudwnydlr67kkgri)
        location: MH(bafkreigvylk6q2vmti3i7z6c2rv5b3jk52btod4epse5dl2ni2kxu4wdte)
        type: BLOB, offset: 5243132, length: 1048576

        CID: MH(bafkreidptaxd2uubepctq5wr5yepze7serf524alvadctpjv7su6ug2egy)
        location: MH(bafkreigvylk6q2vmti3i7z6c2rv5b3jk52btod4epse5dl2ni2kxu4wdte)
        type: BLOB, offset: 6291747, length: 1048576

        CID: MH(bafkreigmy4pwdap6fia6veb3od6zacqlsk6oxozlsodgtqyxi63h3z2zem)
        location: MH(bafkreigvylk6q2vmti3i7z6c2rv5b3jk52btod4epse5dl2ni2kxu4wdte)
        type: BLOB, offset: 7340362, length: 1048576

        CID: MH(bafkreieeaoo6ewyigodpvzlu66rg7qi7pgeve7lh7osdd7mtv66c5g23vq)
        location: MH(bafkreigvylk6q2vmti3i7z6c2rv5b3jk52btod4epse5dl2ni2kxu4wdte)
        type: BLOB, offset: 8388977, length: 1048576
```

### Find location of a specific containing

```sh
# find target index records stored in the index for containing
# index find records <targetCid>
$ hash-stream index find records bafybeiaxbrtsdhi4n2qv53wskm7s6dcr3wpxy7kqdcjp2tx2dafxeiqu2m

Target CID: MH(bafybeiaxbrtsdhi4n2qv53wskm7s6dcr3wpxy7kqdcjp2tx2dafxeiqu2m)
Store backend: fs

Finding target...

Index Records:
    CID: MH(bafkreiaxbrtsdhi4n2qv53wskm7s6dcr3wpxy7kqdcjp2tx2dafxeiqu2m)
    location: MH(bafkreiaxbrtsdhi4n2qv53wskm7s6dcr3wpxy7kqdcjp2tx2dafxeiqu2m)
    type: CONTAINING, offset: N/A, length: N/A

    Sub-Records:
        CID: MH(bafkreigvylk6q2vmti3i7z6c2rv5b3jk52btod4epse5dl2ni2kxu4wdte)
        location: MH(bafkreigvylk6q2vmti3i7z6c2rv5b3jk52btod4epse5dl2ni2kxu4wdte)
        type: PACK, offset: N/A, length: N/A

        Sub-Records:
            CID: MH(bafkreidjbm25tjpzg66ddnitlogc2bifbbji4rcxfzuep5llfnpa7hui2e)
            location: MH(bafkreigvylk6q2vmti3i7z6c2rv5b3jk52btod4epse5dl2ni2kxu4wdte)
            type: BLOB, offset: 57, length: 1048576

            CID: MH(bafkreihkwlpvy46rbd7do6oa7l7gp2urxazp5lk3onakixbon2gvvsavna)
            location: MH(bafkreigvylk6q2vmti3i7z6c2rv5b3jk52btod4epse5dl2ni2kxu4wdte)
            type: BLOB, offset: 1048672, length: 1048576

            CID: MH(bafkreig2k2hhgvie7pxcfktkctvn72bw2dgg6wsu4cemixyiqdhznrv3ce)
            location: MH(bafkreigvylk6q2vmti3i7z6c2rv5b3jk52btod4epse5dl2ni2kxu4wdte)
            type: BLOB, offset: 2097287, length: 1048576

            CID: MH(bafkreicxbwgntwtizqqewws3xtwkt32sjjypbhqwvg6bki3u6kx52yiz4y)
            location: MH(bafkreigvylk6q2vmti3i7z6c2rv5b3jk52btod4epse5dl2ni2kxu4wdte)
            type: BLOB, offset: 3145902, length: 1048576

            CID: MH(bafkreibrq22eilaj5pvoc6luqeycfc2t6opjlbhpinasisxmxgcv2yfrgu)
            location: MH(bafkreigvylk6q2vmti3i7z6c2rv5b3jk52btod4epse5dl2ni2kxu4wdte)
            type: BLOB, offset: 4194517, length: 1048576

            CID: MH(bafkreidfmitzyypu3hdxglewmfiqcies67dosbgepnpudwnydlr67kkgri)
            location: MH(bafkreigvylk6q2vmti3i7z6c2rv5b3jk52btod4epse5dl2ni2kxu4wdte)
            type: BLOB, offset: 5243132, length: 1048576

            CID: MH(bafkreidptaxd2uubepctq5wr5yepze7serf524alvadctpjv7su6ug2egy)
            location: MH(bafkreigvylk6q2vmti3i7z6c2rv5b3jk52btod4epse5dl2ni2kxu4wdte)
            type: BLOB, offset: 6291747, length: 1048576

            CID: MH(bafkreigmy4pwdap6fia6veb3od6zacqlsk6oxozlsodgtqyxi63h3z2zem)
            location: MH(bafkreigvylk6q2vmti3i7z6c2rv5b3jk52btod4epse5dl2ni2kxu4wdte)
            type: BLOB, offset: 7340362, length: 1048576

            CID: MH(bafkreieeaoo6ewyigodpvzlu66rg7qi7pgeve7lh7osdd7mtv66c5g23vq)
            location: MH(bafkreigvylk6q2vmti3i7z6c2rv5b3jk52btod4epse5dl2ni2kxu4wdte)
            type: BLOB, offset: 8388977, length: 1048576

        CID: MH(bafkreicsn43ropajl3vgtgqcfq6r6qidwgxarbzbtgnungzshv2ui3s7fe)
        location: MH(bafkreicsn43ropajl3vgtgqcfq6r6qidwgxarbzbtgnungzshv2ui3s7fe)
        type: PACK, offset: N/A, length: N/A

        Sub-Records:
            CID: MH(bafkreiaayh53fuqf53onxchkn23oxcebai2mp63dzwjojrbqgwnyiblsnq)
            location: MH(bafkreicsn43ropajl3vgtgqcfq6r6qidwgxarbzbtgnungzshv2ui3s7fe)
            type: BLOB, offset: 98, length: 1048576

            CID: MH(bafkreigjecysg76hvjoaw4t4fj7aggbhojsw327jiwzyasnrfh43kxrsdy)
            location: MH(bafkreicsn43ropajl3vgtgqcfq6r6qidwgxarbzbtgnungzshv2ui3s7fe)
            type: BLOB, offset: 1048713, length: 1048576

            CID: MH(bafkreieto3xhqg6bezukenranjbacuu6jxodgofk2znttpfkszzvpjnjhe)
            location: MH(bafkreicsn43ropajl3vgtgqcfq6r6qidwgxarbzbtgnungzshv2ui3s7fe)
            type: BLOB, offset: 2097328, length: 1048576

            CID: MH(bafkreiej7pqfd6pbp4m2syk552ttfliw4dhpwf22n43qsvwgwkdap6iave)
            location: MH(bafkreicsn43ropajl3vgtgqcfq6r6qidwgxarbzbtgnungzshv2ui3s7fe)
            type: BLOB, offset: 3145943, length: 1048576

            CID: MH(bafkreib46iztegkgtltbbkl2vb7qt7fphuqsnysh6fn6ef56bwrk7rtp6a)
            location: MH(bafkreicsn43ropajl3vgtgqcfq6r6qidwgxarbzbtgnungzshv2ui3s7fe)
            type: BLOB, offset: 4194558, length: 1048576

            CID: MH(bafkreiezhrrjvecdls7pc5xjx2eywcleeohvayenhvvkgpqlzeszy4llby)
            location: MH(bafkreicsn43ropajl3vgtgqcfq6r6qidwgxarbzbtgnungzshv2ui3s7fe)
            type: BLOB, offset: 5243173, length: 1048576

            CID: MH(bafkreieq4fw4arrhvq3fvbpenijwh4uurrimcq3oylx24y5tj6xxn42jjq)
            location: MH(bafkreicsn43ropajl3vgtgqcfq6r6qidwgxarbzbtgnungzshv2ui3s7fe)
            type: BLOB, offset: 6291788, length: 393848

            CID: MH(bafkreiaxbrtsdhi4n2qv53wskm7s6dcr3wpxy7kqdcjp2tx2dafxeiqu2m)
            location: MH(bafkreicsn43ropajl3vgtgqcfq6r6qidwgxarbzbtgnungzshv2ui3s7fe)
            type: BLOB, offset: 6685674, length: 809
```

## Streamer dump written packs

Install the CLI for `ipfs-car` to inspect written packs content:

```sh
npm install -g ipfs-car
```

### Streamer dump blob within a containing as RAW

```sh
# Dump the blob data associated with the given target CID into the file system
# streamer dump <targetCid> <filePath> [containingCid] --format raw
$ hash-stream streamer dump bafkreigjecysg76hvjoaw4t4fj7aggbhojsw327jiwzyasnrfh43kxrsdy blob.raw bafybeiaxbrtsdhi4n2qv53wskm7s6dcr3wpxy7kqdcjp2tx2dafxeiqu2m --format raw

Target CID: MH(bafkreigjecysg76hvjoaw4t4fj7aggbhojsw327jiwzyasnrfh43kxrsdy)
Containing CID: MH(bafybeiaxbrtsdhi4n2qv53wskm7s6dcr3wpxy7kqdcjp2tx2dafxeiqu2m)

Successfully wrote bafkreigjecysg76hvjoaw4t4fj7aggbhojsw327jiwzyasnrfh43kxrsdy bytes to /Users/vcs/work/github/hash-stream/blob.raw
```

### Streamer dump blob within a containing as CAR

```sh
# Dump the blob data associated with the given target CID into the file system
# streamer dump <targetCid> <filePath> [containingCid] --format car
$ hash-stream streamer dump bafkreigjecysg76hvjoaw4t4fj7aggbhojsw327jiwzyasnrfh43kxrsdy blob.car bafybeiaxbrtsdhi4n2qv53wskm7s6dcr3wpxy7kqdcjp2tx2dafxeiqu2m --format car

Target CID: MH(bafkreigjecysg76hvjoaw4t4fj7aggbhojsw327jiwzyasnrfh43kxrsdy)
Containing CID: MH(bafybeiaxbrtsdhi4n2qv53wskm7s6dcr3wpxy7kqdcjp2tx2dafxeiqu2m)

Successfully wrote bafkreigjecysg76hvjoaw4t4fj7aggbhojsw327jiwzyasnrfh43kxrsdy bytes to /Users/vcs/work/github/hash-stream/blob.car

# Listing blocks of written CAR file, it should contain the CID of the fetched blob
$ ipfs-car blocks blob.car
bafkreigjecysg76hvjoaw4t4fj7aggbhojsw327jiwzyasnrfh43kxrsdy
```

### Streamer dump pack within a containing

```sh
# Dump the pack data associated with the given target CID into the file system
# streamer dump <targetCid> <filePath> [containingCid]
$ hash-stream streamer dump bafkreicsn43ropajl3vgtgqcfq6r6qidwgxarbzbtgnungzshv2ui3s7fe pack.car bafybeiaxbrtsdhi4n2qv53wskm7s6dcr3wpxy7kqdcjp2tx2dafxeiqu2m

Target CID: MH(bafkreicsn43ropajl3vgtgqcfq6r6qidwgxarbzbtgnungzshv2ui3s7fe)
Containing CID: MH(bafybeiaxbrtsdhi4n2qv53wskm7s6dcr3wpxy7kqdcjp2tx2dafxeiqu2m)

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
$ hash-stream streamer dump bafybeiaxbrtsdhi4n2qv53wskm7s6dcr3wpxy7kqdcjp2tx2dafxeiqu2m containing.car

Target CID: MH(bafybeiaxbrtsdhi4n2qv53wskm7s6dcr3wpxy7kqdcjp2tx2dafxeiqu2m)

Successfully wrote bafybeiaxbrtsdhi4n2qv53wskm7s6dcr3wpxy7kqdcjp2tx2dafxeiqu2m bytes to /Users/vcs/work/github/hash-stream/containing.car

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
ipfs-car unpack containing.car --output new-img.mov

# Check diff
diff IMG_9528.mov new-img.mov
```
