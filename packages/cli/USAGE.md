# `hash-stream` CLI usage with `ipfs-car`

## Getting started

Install the CLI from npm (**requires Node 20 or higher**):

```sh
npm install -g @hash-stream/cli
npm install -g ipfs-car
```

## Create and Inspect CAR file

```sh
# Pack a given file into a CAR file
$ ipfs-car pack file.txt --output file.car

# Show the root CID in the CAR file
$ ipfs-car roots file.car
bafybeihhm5tycyw4jxheqviebxkkt5jpjaxgkfihsinxuardpua4yprewa

# Show the CIDs for all the blocks of the CAR file
$ ipfs-car blocks file.car
bafkreiblganihhs4tqyasd3ies5zise6rmxbusn67qz3tv27ad32z56ocm
bafybeihhm5tycyw4jxheqviebxkkt5jpjaxgkfihsinxuardpua4yprewa

# Generate CID for a CAR file
$ ipfs-car hash file.car
bagbaieraquznspkkfr4hckm2vho7udiy33zk7anb3g732k27lab33tfkwkra
```

## Examples

### Block level indexing for CAR file

```sh
# create block-level index associating blocks to the CAR file
# index create <containerCid> <filePath> -s block-level
$ hash-stream index create bagbaieraquznspkkfr4hckm2vho7udiy33zk7anb3g732k27lab33tfkwkra file.car -s block-level

Container CID:
    bagbaieraquznspkkfr4hckm2vho7udiy33zk7anb3g732k27lab33tfkwkra
    base58btc(zQmXJbuPcsVPKuWeky6npZdAgB7CVRjEKCmaKynuWxRweNV)

Indexing (block-level)...
Indexed block:
    bafkreiblganihhs4tqyasd3ies5zise6rmxbusn67qz3tv27ad32z56ocm
    base58btc(zQmRFEnQEBhu3Vi4Zfw82D57vzFa9vQTQP1wTH2PzspYRLW)
    offset: 96 length: 26
Indexed block:
    bafybeihhm5tycyw4jxheqviebxkkt5jpjaxgkfihsinxuardpua4yprewa
    base58btc(zQmduxLcjFFwH8AEJcnG4h2VCg592WUqLubitVfXtq7bAzK)
    offset: 159 length: 67

# find blocks location using the index
# index find block <blockCid> -s block-level
$ hash-stream index find block bafkreiblganihhs4tqyasd3ies5zise6rmxbusn67qz3tv27ad32z56ocm -s block-level

Block CID:
    bafkreiblganihhs4tqyasd3ies5zise6rmxbusn67qz3tv27ad32z56ocm
    base58btc(zQmRFEnQEBhu3Vi4Zfw82D57vzFa9vQTQP1wTH2PzspYRLW)

Finding block (block-level)...
    bafkreiblganihhs4tqyasd3ies5zise6rmxbusn67qz3tv27ad32z56ocm
    base58btc(zQmRFEnQEBhu3Vi4Zfw82D57vzFa9vQTQP1wTH2PzspYRLW)

Location:
    base58btc(zQmXJbuPcsVPKuWeky6npZdAgB7CVRjEKCmaKynuWxRweNV)
    offset: 96 length: 26

$ hash-stream index find block bafybeihhm5tycyw4jxheqviebxkkt5jpjaxgkfihsinxuardpua4yprewa -s block-level

Block CID:
    bafybeihhm5tycyw4jxheqviebxkkt5jpjaxgkfihsinxuardpua4yprewa
    base58btc(zQmduxLcjFFwH8AEJcnG4h2VCg592WUqLubitVfXtq7bAzK)

Finding block (block-level)...
    bafybeihhm5tycyw4jxheqviebxkkt5jpjaxgkfihsinxuardpua4yprewa
    base58btc(zQmduxLcjFFwH8AEJcnG4h2VCg592WUqLubitVfXtq7bAzK)

Location:
    base58btc(zQmXJbuPcsVPKuWeky6npZdAgB7CVRjEKCmaKynuWxRweNV)
    offset: 159 length: 67
```

### Multiple level indexing for CAR file

```sh
# create multiple-level index associating a root CID and its blocks to a set of CAR(s) file(s)
# index create <containerCid> <filePath> [contextCid] -s multiple-level
$ hash-stream index create bagbaieraquznspkkfr4hckm2vho7udiy33zk7anb3g732k27lab33tfkwkra file.car bafybeihhm5tycyw4jxheqviebxkkt5jpjaxgkfihsinxuardpua4yprewa -s multiple-level

Container CID:
    bagbaieraquznspkkfr4hckm2vho7udiy33zk7anb3g732k27lab33tfkwkra
    base58btc(zQmXJbuPcsVPKuWeky6npZdAgB7CVRjEKCmaKynuWxRweNV)
Context CID:
    bafybeihhm5tycyw4jxheqviebxkkt5jpjaxgkfihsinxuardpua4yprewa
    base58btc(zQmduxLcjFFwH8AEJcnG4h2VCg592WUqLubitVfXtq7bAzK)

Indexing (multiple-level)...
Indexed block:
    bafkreiblganihhs4tqyasd3ies5zise6rmxbusn67qz3tv27ad32z56ocm
    base58btc(zQmRFEnQEBhu3Vi4Zfw82D57vzFa9vQTQP1wTH2PzspYRLW)
    offset: 96 length: 26
Indexed block:
    bafybeihhm5tycyw4jxheqviebxkkt5jpjaxgkfihsinxuardpua4yprewa
    base58btc(zQmduxLcjFFwH8AEJcnG4h2VCg592WUqLubitVfXtq7bAzK)
    offset: 159 length: 67

# find blocks location using the index and hinting context root CID
# index find block <blockCid> [contextCid] -s multiple-level
$ hash-stream index find block bafkreiblganihhs4tqyasd3ies5zise6rmxbusn67qz3tv27ad32z56ocm bafybeihhm5tycyw4jxheqviebxkkt5jpjaxgkfihsinxuardpua4yprewa -s multiple-level

Block CID:
    bafkreiblganihhs4tqyasd3ies5zise6rmxbusn67qz3tv27ad32z56ocm
    base58btc(zQmRFEnQEBhu3Vi4Zfw82D57vzFa9vQTQP1wTH2PzspYRLW)
Context CID:
    bafybeihhm5tycyw4jxheqviebxkkt5jpjaxgkfihsinxuardpua4yprewa
    base58btc(zQmduxLcjFFwH8AEJcnG4h2VCg592WUqLubitVfXtq7bAzK)

Finding block (block-level)...
    bafkreiblganihhs4tqyasd3ies5zise6rmxbusn67qz3tv27ad32z56ocm
    base58btc(zQmRFEnQEBhu3Vi4Zfw82D57vzFa9vQTQP1wTH2PzspYRLW)

Location:
    base58btc(zQmXJbuPcsVPKuWeky6npZdAgB7CVRjEKCmaKynuWxRweNV)
    offset: 96 length: 26

$ hash-stream index find block bafybeihhm5tycyw4jxheqviebxkkt5jpjaxgkfihsinxuardpua4yprewa bafybeihhm5tycyw4jxheqviebxkkt5jpjaxgkfihsinxuardpua4yprewa -s multiple-level

Block CID:
    bafybeihhm5tycyw4jxheqviebxkkt5jpjaxgkfihsinxuardpua4yprewa
    base58btc(zQmduxLcjFFwH8AEJcnG4h2VCg592WUqLubitVfXtq7bAzK)
Context CID:
    bafybeihhm5tycyw4jxheqviebxkkt5jpjaxgkfihsinxuardpua4yprewa
    base58btc(zQmduxLcjFFwH8AEJcnG4h2VCg592WUqLubitVfXtq7bAzK)

Finding block (block-level)...
    bafybeihhm5tycyw4jxheqviebxkkt5jpjaxgkfihsinxuardpua4yprewa
    base58btc(zQmduxLcjFFwH8AEJcnG4h2VCg592WUqLubitVfXtq7bAzK)

Location:
    base58btc(zQmXJbuPcsVPKuWeky6npZdAgB7CVRjEKCmaKynuWxRweNV)
    offset: 159 length: 67

# find containers that have the blocks for a given root CID
# index find containers <contentCid>
$ hash-stream index find containers bafybeihhm5tycyw4jxheqviebxkkt5jpjaxgkfihsinxuardpua4yprewa -s multiple-level

Location:
    content CID: bafybeihhm5tycyw4jxheqviebxkkt5jpjaxgkfihsinxuardpua4yprewa
    base58btc(zdj7Wm1Ci3o6jQszsYEMXDgZQKmJHLUE2FUmv8RATvZeZA5AF)
    shards:
        base58btc(zQmXJbuPcsVPKuWeky6npZdAgB7CVRjEKCmaKynuWxRweNV)

# but a root CID MAY be sharded across multiple CAR files
# considering there are also blocks for it in a file2.car
$ ipfs-car hash file2.car
bagbaierafxbbjjrhght7yzsg4e2hi2kb53uhhcu7ishekq6jdu3udarm5tba

$ hash-stream index create bagbaierafxbbjjrhght7yzsg4e2hi2kb53uhhcu7ishekq6jdu3udarm5tba file2.car bafybeihhm5tycyw4jxheqviebxkkt5jpjaxgkfihsinxuardpua4yprewa -s multiple-level

Container CID:
    bagbaierafxbbjjrhght7yzsg4e2hi2kb53uhhcu7ishekq6jdu3udarm5tba
    base58btc(zQmRRGhfJMXQ7iNDTKiFFGiCL93jnFDcnd6vqgnizA2vmDb)
Context CID:
    bafybeihhm5tycyw4jxheqviebxkkt5jpjaxgkfihsinxuardpua4yprewa
    base58btc(zQmduxLcjFFwH8AEJcnG4h2VCg592WUqLubitVfXtq7bAzK)

Indexing (multiple-level)...
Indexed block:
    bafkreigj55bm7linlocmeg2getwzaivj3h566vr2t2nkl2rfnjrtjma34i
    base58btc(zQmbvvG4HHa3aUCRZTtZBpTGBs44ca8nTeDdueQFZatmEnm)
    offset: 98 length: 176020
Indexed block:
    bafybeicuyqc7lu3cjiybw532fqzxizjmo27mliei5ow2xjkwtwcn55wzpm
    base58btc(zQmU3YKXBhCgSfij6RsfTan8x6Lm1g22xYTqH6g5imbB4Rp)
    offset: 176155 length: 64

$ hash-stream index find containers bafybeihhm5tycyw4jxheqviebxkkt5jpjaxgkfihsinxuardpua4yprewa -s multiple-level

Location:
    content CID: bafybeihhm5tycyw4jxheqviebxkkt5jpjaxgkfihsinxuardpua4yprewa
    base58btc(zdj7Wm1Ci3o6jQszsYEMXDgZQKmJHLUE2FUmv8RATvZeZA5AF)
    shards:
        base58btc(zQmRRGhfJMXQ7iNDTKiFFGiCL93jnFDcnd6vqgnizA2vmDb),
        base58btc(zQmXJbuPcsVPKuWeky6npZdAgB7CVRjEKCmaKynuWxRweNV)
```
