# `hash-stream` CLI usage with `ipfs-car`

In this Usage document, we rely on CAR Files as Packs to transport a set of Blobs.

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

### Blob level indexing for Pack (CAR file)

```sh
# Add single-level index entries associating blobs to the pack (CAR file)
# index add <packCid> <filePath> -s single-level
$ hash-stream index add bagbaieraquznspkkfr4hckm2vho7udiy33zk7anb3g732k27lab33tfkwkra file.car -s single-level

Pack CID:
    bagbaieraquznspkkfr4hckm2vho7udiy33zk7anb3g732k27lab33tfkwkra
    base58btc(zQmXJbuPcsVPKuWeky6npZdAgB7CVRjEKCmaKynuWxRweNV)

Indexing (single-level)...
Indexed blob:
    bafkreiblganihhs4tqyasd3ies5zise6rmxbusn67qz3tv27ad32z56ocm
    base58btc(zQmRFEnQEBhu3Vi4Zfw82D57vzFa9vQTQP1wTH2PzspYRLW)
    offset: 96 length: 26
Indexed blob:
    bafybeihhm5tycyw4jxheqviebxkkt5jpjaxgkfihsinxuardpua4yprewa
    base58btc(zQmduxLcjFFwH8AEJcnG4h2VCg592WUqLubitVfXtq7bAzK)
    offset: 159 length: 67

# find target index records stored in the index
# index find records <targetCid> -s single-level
$ hash-stream index find records bafkreiblganihhs4tqyasd3ies5zise6rmxbusn67qz3tv27ad32z56ocm -s single-level

Target CID:
    bafkreiblganihhs4tqyasd3ies5zise6rmxbusn67qz3tv27ad32z56ocm
    base58btc(zQmRFEnQEBhu3Vi4Zfw82D57vzFa9vQTQP1wTH2PzspYRLW)

Finding target (single-level)...
    bafkreiblganihhs4tqyasd3ies5zise6rmxbusn67qz3tv27ad32z56ocm
    base58btc(zQmRFEnQEBhu3Vi4Zfw82D57vzFa9vQTQP1wTH2PzspYRLW)

Index Records:
    base58btc(zQmXJbuPcsVPKuWeky6npZdAgB7CVRjEKCmaKynuWxRweNV)
    type: BLOB, offset: 96, length: 26

$ hash-stream index find records bafybeihhm5tycyw4jxheqviebxkkt5jpjaxgkfihsinxuardpua4yprewa -s single-level

Target CID:
    bafybeihhm5tycyw4jxheqviebxkkt5jpjaxgkfihsinxuardpua4yprewa
    base58btc(zQmduxLcjFFwH8AEJcnG4h2VCg592WUqLubitVfXtq7bAzK)

Finding target (single-level)...
    bafybeihhm5tycyw4jxheqviebxkkt5jpjaxgkfihsinxuardpua4yprewa
    base58btc(zQmduxLcjFFwH8AEJcnG4h2VCg592WUqLubitVfXtq7bAzK)

Index Records:
    base58btc(zQmXJbuPcsVPKuWeky6npZdAgB7CVRjEKCmaKynuWxRweNV)
    type: BLOB, offset: 159, length: 67

$ hash-stream index find records bagbaieraquznspkkfr4hckm2vho7udiy33zk7anb3g732k27lab33tfkwkra -s single-level

Target CID:
    bagbaieraquznspkkfr4hckm2vho7udiy33zk7anb3g732k27lab33tfkwkra
    base58btc(zQmXJbuPcsVPKuWeky6npZdAgB7CVRjEKCmaKynuWxRweNV)

Finding target (single-level)...
    bagbaieraquznspkkfr4hckm2vho7udiy33zk7anb3g732k27lab33tfkwkra
    base58btc(zQmXJbuPcsVPKuWeky6npZdAgB7CVRjEKCmaKynuWxRweNV)

Index Records:
    base58btc(zQmXJbuPcsVPKuWeky6npZdAgB7CVRjEKCmaKynuWxRweNV)
    type: PACK, offset: N/A, length: N/A
```

### Multiple level indexing for Pack (CAR file)

```sh
# add multiple-level index associating a containing CID and its blobs to a set of Packs (CAR files)
# index add <packCid> <filePath> [containingCid] -s multiple-level
$ hash-stream index add bagbaieraquznspkkfr4hckm2vho7udiy33zk7anb3g732k27lab33tfkwkra file.car bafybeihhm5tycyw4jxheqviebxkkt5jpjaxgkfihsinxuardpua4yprewa -s multiple-level

Pack CID:
    bagbaieraquznspkkfr4hckm2vho7udiy33zk7anb3g732k27lab33tfkwkra
    base58btc(zQmXJbuPcsVPKuWeky6npZdAgB7CVRjEKCmaKynuWxRweNV)
Containing CID:
    bafybeihhm5tycyw4jxheqviebxkkt5jpjaxgkfihsinxuardpua4yprewa
    base58btc(zQmduxLcjFFwH8AEJcnG4h2VCg592WUqLubitVfXtq7bAzK)

Indexing (multiple-level)...
Indexed blob:
    bafkreiblganihhs4tqyasd3ies5zise6rmxbusn67qz3tv27ad32z56ocm
    base58btc(zQmRFEnQEBhu3Vi4Zfw82D57vzFa9vQTQP1wTH2PzspYRLW)
    offset: 96 length: 26
Indexed blob:
    bafybeihhm5tycyw4jxheqviebxkkt5jpjaxgkfihsinxuardpua4yprewa
    base58btc(zQmduxLcjFFwH8AEJcnG4h2VCg592WUqLubitVfXtq7bAzK)
    offset: 159 length: 67

# find index records of a given blob/pack/containing stored in the index
# index find records <targetCid> [containingCid] -s multiple-level
$ hash-stream index find records bafkreiblganihhs4tqyasd3ies5zise6rmxbusn67qz3tv27ad32z56ocm bafybeihhm5tycyw4jxheqviebxkkt5jpjaxgkfihsinxuardpua4yprewa -s multiple-level

Target CID:
    bafkreiblganihhs4tqyasd3ies5zise6rmxbusn67qz3tv27ad32z56ocm
    base58btc(zQmRFEnQEBhu3Vi4Zfw82D57vzFa9vQTQP1wTH2PzspYRLW)
Containing CID:
    bafybeihhm5tycyw4jxheqviebxkkt5jpjaxgkfihsinxuardpua4yprewa
    base58btc(zQmduxLcjFFwH8AEJcnG4h2VCg592WUqLubitVfXtq7bAzK)

Finding target (multiple-level)...
    bafkreiblganihhs4tqyasd3ies5zise6rmxbusn67qz3tv27ad32z56ocm
    base58btc(zQmRFEnQEBhu3Vi4Zfw82D57vzFa9vQTQP1wTH2PzspYRLW)

Index Records:
    base58btc(zQmXJbuPcsVPKuWeky6npZdAgB7CVRjEKCmaKynuWxRweNV)
    type: BLOB, offset: 96, length: 26

$ hash-stream index find records bagbaieraquznspkkfr4hckm2vho7udiy33zk7anb3g732k27lab33tfkwkra bafybeihhm5tycyw4jxheqviebxkkt5jpjaxgkfihsinxuardpua4yprewa -s multiple-level

Target CID:
    bagbaieraquznspkkfr4hckm2vho7udiy33zk7anb3g732k27lab33tfkwkra
    base58btc(zQmXJbuPcsVPKuWeky6npZdAgB7CVRjEKCmaKynuWxRweNV)
Containing CID:
    bafybeihhm5tycyw4jxheqviebxkkt5jpjaxgkfihsinxuardpua4yprewa
    base58btc(zQmduxLcjFFwH8AEJcnG4h2VCg592WUqLubitVfXtq7bAzK)

Finding target (multiple-level)...
    bagbaieraquznspkkfr4hckm2vho7udiy33zk7anb3g732k27lab33tfkwkra
    base58btc(zQmXJbuPcsVPKuWeky6npZdAgB7CVRjEKCmaKynuWxRweNV)

Index Records:
    base58btc(zQmXJbuPcsVPKuWeky6npZdAgB7CVRjEKCmaKynuWxRweNV)
    type: PACK, offset: N/A, length: N/A
    Sub-Records:
        base58btc(zQmXJbuPcsVPKuWeky6npZdAgB7CVRjEKCmaKynuWxRweNV)
        type: BLOB, offset: 96, length: 26
        base58btc(zQmXJbuPcsVPKuWeky6npZdAgB7CVRjEKCmaKynuWxRweNV)
        type: BLOB, offset: 159, length: 67

$ hash-stream index find records bafybeihhm5tycyw4jxheqviebxkkt5jpjaxgkfihsinxuardpua4yprewa -s multiple-level

Target CID:
    bafybeihhm5tycyw4jxheqviebxkkt5jpjaxgkfihsinxuardpua4yprewa
    base58btc(zQmduxLcjFFwH8AEJcnG4h2VCg592WUqLubitVfXtq7bAzK)

Finding target (multiple-level)...
    bafybeihhm5tycyw4jxheqviebxkkt5jpjaxgkfihsinxuardpua4yprewa
    base58btc(zQmduxLcjFFwH8AEJcnG4h2VCg592WUqLubitVfXtq7bAzK)

Index Records:
    base58btc(zQmduxLcjFFwH8AEJcnG4h2VCg592WUqLubitVfXtq7bAzK)
    type: CONTAINING, offset: N/A, length: N/A
    Sub-Records:
        base58btc(zQmXJbuPcsVPKuWeky6npZdAgB7CVRjEKCmaKynuWxRweNV)
        type: PACK, offset: N/A, length: N/A
        Sub-Records:
            base58btc(zQmXJbuPcsVPKuWeky6npZdAgB7CVRjEKCmaKynuWxRweNV)
            type: BLOB, offset: 96, length: 26
            base58btc(zQmXJbuPcsVPKuWeky6npZdAgB7CVRjEKCmaKynuWxRweNV)
            type: BLOB, offset: 159, length: 67

# but a containing CID MAY be split across Packs
# considering there are also blobs for it in a file2.car
$ ipfs-car hash file2.car
bagbaierasjalv5zwihm24bgtnjwepcte2hwh76355olccz4el5pd6vj7zafq

$ hash-stream index add bagbaierasjalv5zwihm24bgtnjwepcte2hwh76355olccz4el5pd6vj7zafq file2.car bafybeihhm5tycyw4jxheqviebxkkt5jpjaxgkfihsinxuardpua4yprewa -s multiple-level

Pack CID:
    bagbaierasjalv5zwihm24bgtnjwepcte2hwh76355olccz4el5pd6vj7zafq
    base58btc(zQmRRGhfJMXQ7iNDTKiFFGiCL93jnFDcnd6vqgnizA2vmDb)
Containing CID:
    bafybeihhm5tycyw4jxheqviebxkkt5jpjaxgkfihsinxuardpua4yprewa
    base58btc(zQmduxLcjFFwH8AEJcnG4h2VCg592WUqLubitVfXtq7bAzK)

Indexing (multiple-level)...
Indexed blob:
    bafkreickbxw2ugu5rov6bvjbayhgqehhm3t3vpdoam7wih7c44mm3kps6y
    base58btc(zQmTKjCQe7rSuAxeajoiaciC1JhMwtYageDGj8qu3LDuQeR)
    offset: 98 length: 176643
Indexed blob:
    bafybeicbpa7wm56qbotxrtdoofuofg2hcasouttzw57xyrizd4n72lwjd4
    base58btc(zQmSkDZHnSVBawRdmjo2ivzZpdSSHkJBrWb3EYnfQiAz9rE)
    offset: 176778 length: 64

# Find index records for new pack
$ hash-stream index find records bagbaierasjalv5zwihm24bgtnjwepcte2hwh76355olccz4el5pd6vj7zafq bafybeihhm5tycyw4jxheqviebxkkt5jpjaxgkfihsinxuardpua4yprewa -s multiple-level

Target CID:
    bagbaierasjalv5zwihm24bgtnjwepcte2hwh76355olccz4el5pd6vj7zafq
    base58btc(zQmYBZUsAjCMW4yvAEW2r1K4qMd9voXuaeF9RHLgukLKiq8)
Containing CID:
    bafybeihhm5tycyw4jxheqviebxkkt5jpjaxgkfihsinxuardpua4yprewa
    base58btc(zQmduxLcjFFwH8AEJcnG4h2VCg592WUqLubitVfXtq7bAzK)

Finding target (multiple-level)...
    bagbaierasjalv5zwihm24bgtnjwepcte2hwh76355olccz4el5pd6vj7zafq
    base58btc(zQmYBZUsAjCMW4yvAEW2r1K4qMd9voXuaeF9RHLgukLKiq8)

Index Records:
    base58btc(zQmYBZUsAjCMW4yvAEW2r1K4qMd9voXuaeF9RHLgukLKiq8)
    type: PACK, offset: N/A, length: N/A
    Sub-Records:
        base58btc(zQmYBZUsAjCMW4yvAEW2r1K4qMd9voXuaeF9RHLgukLKiq8)
        type: BLOB, offset: 98, length: 176643
        base58btc(zQmYBZUsAjCMW4yvAEW2r1K4qMd9voXuaeF9RHLgukLKiq8)
        type: BLOB, offset: 176778, length: 64

# Find index records for containing
$ hash-stream index find records bafybeihhm5tycyw4jxheqviebxkkt5jpjaxgkfihsinxuardpua4yprewa -s multiple-level

Target CID:
    bafybeihhm5tycyw4jxheqviebxkkt5jpjaxgkfihsinxuardpua4yprewa
    base58btc(zQmduxLcjFFwH8AEJcnG4h2VCg592WUqLubitVfXtq7bAzK)

Finding target (multiple-level)...
    bafybeihhm5tycyw4jxheqviebxkkt5jpjaxgkfihsinxuardpua4yprewa
    base58btc(zQmduxLcjFFwH8AEJcnG4h2VCg592WUqLubitVfXtq7bAzK)

Index Records:
    base58btc(zQmduxLcjFFwH8AEJcnG4h2VCg592WUqLubitVfXtq7bAzK)
    type: CONTAINING, offset: N/A, length: N/A
    Sub-Records:
        base58btc(zQmXJbuPcsVPKuWeky6npZdAgB7CVRjEKCmaKynuWxRweNV)
        type: PACK, offset: N/A, length: N/A
        Sub-Records:
            base58btc(zQmXJbuPcsVPKuWeky6npZdAgB7CVRjEKCmaKynuWxRweNV)
            type: BLOB, offset: 96, length: 26
            base58btc(zQmXJbuPcsVPKuWeky6npZdAgB7CVRjEKCmaKynuWxRweNV)
            type: BLOB, offset: 159, length: 67
        base58btc(zQmYBZUsAjCMW4yvAEW2r1K4qMd9voXuaeF9RHLgukLKiq8)
        type: PACK, offset: N/A, length: N/A
        Sub-Records:
            base58btc(zQmYBZUsAjCMW4yvAEW2r1K4qMd9voXuaeF9RHLgukLKiq8)
            type: BLOB, offset: 98, length: 176643
            base58btc(zQmYBZUsAjCMW4yvAEW2r1K4qMd9voXuaeF9RHLgukLKiq8)
            type: BLOB, offset: 176778, length: 64
```
