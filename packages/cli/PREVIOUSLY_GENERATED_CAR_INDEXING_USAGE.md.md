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

### Using single level index writer for Pack (CAR file)

```sh
# Use single-level index writer implementation to associate blobs to the pack (CAR file)
# index add <packCid> <filePath> --iw single-level
$ hash-stream index add bagbaieraquznspkkfr4hckm2vho7udiy33zk7anb3g732k27lab33tfkwkra file.car --iw single-level

Pack CID:
    bagbaieraquznspkkfr4hckm2vho7udiy33zk7anb3g732k27lab33tfkwkra
    base58btc(zQmXJbuPcsVPKuWeky6npZdAgB7CVRjEKCmaKynuWxRweNV)

Indexing with implementation (single-level)...
Indexed Blob:
    bafkreiblganihhs4tqyasd3ies5zise6rmxbusn67qz3tv27ad32z56ocm
    base58btc(zQmRFEnQEBhu3Vi4Zfw82D57vzFa9vQTQP1wTH2PzspYRLW)
    location: zQmXJbuPcsVPKuWeky6npZdAgB7CVRjEKCmaKynuWxRweNV
    offset: 96 length: 26
Indexed Blob:
    bafybeihhm5tycyw4jxheqviebxkkt5jpjaxgkfihsinxuardpua4yprewa
    base58btc(zQmduxLcjFFwH8AEJcnG4h2VCg592WUqLubitVfXtq7bAzK)
    location: zQmXJbuPcsVPKuWeky6npZdAgB7CVRjEKCmaKynuWxRweNV
    offset: 159 length: 67

# find target index records stored in the index
# index find records <targetCid>
$ hash-stream index find records bafkreiblganihhs4tqyasd3ies5zise6rmxbusn67qz3tv27ad32z56ocm

Target CID:
    bafkreiblganihhs4tqyasd3ies5zise6rmxbusn67qz3tv27ad32z56ocm
    base58btc(zQmRFEnQEBhu3Vi4Zfw82D57vzFa9vQTQP1wTH2PzspYRLW)

Finding target...
    bafkreiblganihhs4tqyasd3ies5zise6rmxbusn67qz3tv27ad32z56ocm
    base58btc(zQmRFEnQEBhu3Vi4Zfw82D57vzFa9vQTQP1wTH2PzspYRLW)

Index Records:
    multihash: base58btc(bafkreiblganihhs4tqyasd3ies5zise6rmxbusn67qz3tv27ad32z56ocm)
    location: base58btc(zQmXJbuPcsVPKuWeky6npZdAgB7CVRjEKCmaKynuWxRweNV)
    type: BLOB, offset: 96, length: 26

$ hash-stream index find records bafybeihhm5tycyw4jxheqviebxkkt5jpjaxgkfihsinxuardpua4yprewa

Target CID:
    bafybeihhm5tycyw4jxheqviebxkkt5jpjaxgkfihsinxuardpua4yprewa
    base58btc(zQmduxLcjFFwH8AEJcnG4h2VCg592WUqLubitVfXtq7bAzK)

Finding target...
    bafybeihhm5tycyw4jxheqviebxkkt5jpjaxgkfihsinxuardpua4yprewa
    base58btc(zQmduxLcjFFwH8AEJcnG4h2VCg592WUqLubitVfXtq7bAzK)

Index Records:
    multihash: base58btc(zQmduxLcjFFwH8AEJcnG4h2VCg592WUqLubitVfXtq7bAzK)
    location: base58btc(zQmXJbuPcsVPKuWeky6npZdAgB7CVRjEKCmaKynuWxRweNV)
    type: BLOB, offset: 159, length: 67

$ hash-stream index find records bagbaieraquznspkkfr4hckm2vho7udiy33zk7anb3g732k27lab33tfkwkra

Target CID:
    bagbaieraquznspkkfr4hckm2vho7udiy33zk7anb3g732k27lab33tfkwkra
    base58btc(zQmXJbuPcsVPKuWeky6npZdAgB7CVRjEKCmaKynuWxRweNV)

Finding target...
    bagbaieraquznspkkfr4hckm2vho7udiy33zk7anb3g732k27lab33tfkwkra
    base58btc(zQmXJbuPcsVPKuWeky6npZdAgB7CVRjEKCmaKynuWxRweNV)

Index Records:
    multihash: base58btc(zQmXJbuPcsVPKuWeky6npZdAgB7CVRjEKCmaKynuWxRweNV)
    location: base58btc(zQmXJbuPcsVPKuWeky6npZdAgB7CVRjEKCmaKynuWxRweNV)
    type: PACK, offset: N/A, length: N/A
```

### Using Multiple level index writer for Pack (CAR file)

```sh
# Use single-level index writer implementation to associate blobs to the pack (CAR file)
# index add <packCid> <filePath> [containingCid] --iw multiple-level
$ hash-stream index add bagbaieraquznspkkfr4hckm2vho7udiy33zk7anb3g732k27lab33tfkwkra file.car bafybeihhm5tycyw4jxheqviebxkkt5jpjaxgkfihsinxuardpua4yprewa --iw multiple-level

Pack CID:
    bagbaieraquznspkkfr4hckm2vho7udiy33zk7anb3g732k27lab33tfkwkra
    base58btc(zQmXJbuPcsVPKuWeky6npZdAgB7CVRjEKCmaKynuWxRweNV)
Containing CID:
    bafybeihhm5tycyw4jxheqviebxkkt5jpjaxgkfihsinxuardpua4yprewa
    base58btc(zQmduxLcjFFwH8AEJcnG4h2VCg592WUqLubitVfXtq7bAzK)

Indexing with implementation (multiple-level)...
Indexed Blob:
    bafkreiblganihhs4tqyasd3ies5zise6rmxbusn67qz3tv27ad32z56ocm
    base58btc(zQmRFEnQEBhu3Vi4Zfw82D57vzFa9vQTQP1wTH2PzspYRLW)
    location: zQmXJbuPcsVPKuWeky6npZdAgB7CVRjEKCmaKynuWxRweNV
    offset: 96 length: 26
Indexed Blob:
    bafybeihhm5tycyw4jxheqviebxkkt5jpjaxgkfihsinxuardpua4yprewa
    base58btc(zQmduxLcjFFwH8AEJcnG4h2VCg592WUqLubitVfXtq7bAzK)
    location: zQmXJbuPcsVPKuWeky6npZdAgB7CVRjEKCmaKynuWxRweNV
    offset: 159 length: 67

# find index records of a given blob/pack/containing stored using the associated index writer store
# index find records <targetCid> [containingCid]
$ hash-stream index find records bafkreiblganihhs4tqyasd3ies5zise6rmxbusn67qz3tv27ad32z56ocm bafybeihhm5tycyw4jxheqviebxkkt5jpjaxgkfihsinxuardpua4yprewa

Target CID:
    bafkreiblganihhs4tqyasd3ies5zise6rmxbusn67qz3tv27ad32z56ocm
    base58btc(zQmRFEnQEBhu3Vi4Zfw82D57vzFa9vQTQP1wTH2PzspYRLW)
Containing CID:
    bafybeihhm5tycyw4jxheqviebxkkt5jpjaxgkfihsinxuardpua4yprewa
    base58btc(zQmduxLcjFFwH8AEJcnG4h2VCg592WUqLubitVfXtq7bAzK)

Finding target...
    bafkreiblganihhs4tqyasd3ies5zise6rmxbusn67qz3tv27ad32z56ocm
    base58btc(zQmRFEnQEBhu3Vi4Zfw82D57vzFa9vQTQP1wTH2PzspYRLW)

Index Records:
    multihash: base58btc(zQmRFEnQEBhu3Vi4Zfw82D57vzFa9vQTQP1wTH2PzspYRLW)
    location: base58btc(zQmXJbuPcsVPKuWeky6npZdAgB7CVRjEKCmaKynuWxRweNV)
    type: BLOB, offset: 96, length: 26

$ hash-stream index find records bagbaieraquznspkkfr4hckm2vho7udiy33zk7anb3g732k27lab33tfkwkra bafybeihhm5tycyw4jxheqviebxkkt5jpjaxgkfihsinxuardpua4yprewa

Target CID:
    bagbaieraquznspkkfr4hckm2vho7udiy33zk7anb3g732k27lab33tfkwkra
    base58btc(zQmXJbuPcsVPKuWeky6npZdAgB7CVRjEKCmaKynuWxRweNV)
Containing CID:
    bafybeihhm5tycyw4jxheqviebxkkt5jpjaxgkfihsinxuardpua4yprewa
    base58btc(zQmduxLcjFFwH8AEJcnG4h2VCg592WUqLubitVfXtq7bAzK)

Finding target...
    bagbaieraquznspkkfr4hckm2vho7udiy33zk7anb3g732k27lab33tfkwkra
    base58btc(zQmXJbuPcsVPKuWeky6npZdAgB7CVRjEKCmaKynuWxRweNV)

Index Records:
    multihash: base58btc(zQmXJbuPcsVPKuWeky6npZdAgB7CVRjEKCmaKynuWxRweNV)
    location: base58btc(zQmXJbuPcsVPKuWeky6npZdAgB7CVRjEKCmaKynuWxRweNV)
    type: PACK, offset: N/A, length: N/A
    Sub-Records:
        multihash: base58btc(zQmRFEnQEBhu3Vi4Zfw82D57vzFa9vQTQP1wTH2PzspYRLW)
        location: base58btc(zQmXJbuPcsVPKuWeky6npZdAgB7CVRjEKCmaKynuWxRweNV)
        type: BLOB, offset: 96, length: 26

        multihash: base58btc(zQmRFEnQEBhu3Vi4Zfw82D57vzFa9vQTQP1wTH2PzspYRLW)
        location: base58btc(zQmXJbuPcsVPKuWeky6npZdAgB7CVRjEKCmaKynuWxRweNV)
        type: BLOB, offset: 159, length: 67

$ hash-stream index find records bafybeihhm5tycyw4jxheqviebxkkt5jpjaxgkfihsinxuardpua4yprewa

Target CID:
    bafybeihhm5tycyw4jxheqviebxkkt5jpjaxgkfihsinxuardpua4yprewa
    base58btc(zQmduxLcjFFwH8AEJcnG4h2VCg592WUqLubitVfXtq7bAzK)

Finding target...
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

            base58btc(zQmduxLcjFFwH8AEJcnG4h2VCg592WUqLubitVfXtq7bAzK)
            type: BLOB, offset: 159, length: 67

# but a containing CID MAY be split across Packs
# considering there are also blobs for it in a file2.car
$ ipfs-car hash file2.car
bagbaierasjalv5zwihm24bgtnjwepcte2hwh76355olccz4el5pd6vj7zafq

$ hash-stream index add bagbaierasjalv5zwihm24bgtnjwepcte2hwh76355olccz4el5pd6vj7zafq file2.car bafybeihhm5tycyw4jxheqviebxkkt5jpjaxgkfihsinxuardpua4yprewa --iw multiple-level

Pack CID:
    bagbaierasjalv5zwihm24bgtnjwepcte2hwh76355olccz4el5pd6vj7zafq
    base58btc(zQmRRGhfJMXQ7iNDTKiFFGiCL93jnFDcnd6vqgnizA2vmDb)
Containing CID:
    bafybeihhm5tycyw4jxheqviebxkkt5jpjaxgkfihsinxuardpua4yprewa
    base58btc(zQmduxLcjFFwH8AEJcnG4h2VCg592WUqLubitVfXtq7bAzK)

Indexing with implementation (multiple-level)...
Indexed Blob:
    bafkreickbxw2ugu5rov6bvjbayhgqehhm3t3vpdoam7wih7c44mm3kps6y
    base58btc(zQmTKjCQe7rSuAxeajoiaciC1JhMwtYageDGj8qu3LDuQeR)
    location: zQmRRGhfJMXQ7iNDTKiFFGiCL93jnFDcnd6vqgnizA2vmDb
    offset: 98 length: 176643
Indexed Blob:
    bafybeicbpa7wm56qbotxrtdoofuofg2hcasouttzw57xyrizd4n72lwjd4
    base58btc(zQmSkDZHnSVBawRdmjo2ivzZpdSSHkJBrWb3EYnfQiAz9rE)
    location: zQmRRGhfJMXQ7iNDTKiFFGiCL93jnFDcnd6vqgnizA2vmDb
    offset: 176778 length: 64

# Find index records for new pack
$ hash-stream index find records bagbaierasjalv5zwihm24bgtnjwepcte2hwh76355olccz4el5pd6vj7zafq bafybeihhm5tycyw4jxheqviebxkkt5jpjaxgkfihsinxuardpua4yprewa

Target CID:
    bagbaierasjalv5zwihm24bgtnjwepcte2hwh76355olccz4el5pd6vj7zafq
    base58btc(zQmYBZUsAjCMW4yvAEW2r1K4qMd9voXuaeF9RHLgukLKiq8)
Containing CID:
    bafybeihhm5tycyw4jxheqviebxkkt5jpjaxgkfihsinxuardpua4yprewa
    base58btc(zQmduxLcjFFwH8AEJcnG4h2VCg592WUqLubitVfXtq7bAzK)

Finding target...
    bagbaierasjalv5zwihm24bgtnjwepcte2hwh76355olccz4el5pd6vj7zafq
    base58btc(zQmYBZUsAjCMW4yvAEW2r1K4qMd9voXuaeF9RHLgukLKiq8)

Index Records:
    base58btc(zQmYBZUsAjCMW4yvAEW2r1K4qMd9voXuaeF9RHLgukLKiq8)
    type: PACK, offset: N/A, length: N/A
    Sub-Records:
        multihash: base58btc(zQmTKjCQe7rSuAxeajoiaciC1JhMwtYageDGj8qu3LDuQeR)
        location: base58btc(zQmYBZUsAjCMW4yvAEW2r1K4qMd9voXuaeF9RHLgukLKiq8)
        type: BLOB, offset: 98, length: 176643

        multihash: base58btc(zQmSkDZHnSVBawRdmjo2ivzZpdSSHkJBrWb3EYnfQiAz9rE)
        location: base58btc(zQmYBZUsAjCMW4yvAEW2r1K4qMd9voXuaeF9RHLgukLKiq8)
        type: BLOB, offset: 176778, length: 64

# Find index records for containing
$ hash-stream index find records bafybeihhm5tycyw4jxheqviebxkkt5jpjaxgkfihsinxuardpua4yprewa

Target CID:
    bafybeihhm5tycyw4jxheqviebxkkt5jpjaxgkfihsinxuardpua4yprewa
    base58btc(zQmduxLcjFFwH8AEJcnG4h2VCg592WUqLubitVfXtq7bAzK)

Finding targets...
    bafybeihhm5tycyw4jxheqviebxkkt5jpjaxgkfihsinxuardpua4yprewa
    base58btc(zQmduxLcjFFwH8AEJcnG4h2VCg592WUqLubitVfXtq7bAzK)

Index Records:
    base58btc(zQmduxLcjFFwH8AEJcnG4h2VCg592WUqLubitVfXtq7bAzK)
    type: CONTAINING, offset: N/A, length: N/A
    Sub-Records:
        multihash: base58btc(zQmXJbuPcsVPKuWeky6npZdAgB7CVRjEKCmaKynuWxRweNV)
        location: base58btc(zQmXJbuPcsVPKuWeky6npZdAgB7CVRjEKCmaKynuWxRweNV)
        type: PACK, offset: N/A, length: N/A
        Sub-Records:
            multihash: base58btc(bafkreiblganihhs4tqyasd3ies5zise6rmxbusn67qz3tv27ad32z56ocm)
            location: base58btc(zQmXJbuPcsVPKuWeky6npZdAgB7CVRjEKCmaKynuWxRweNV)
            type: BLOB, offset: 96, length: 26

            multihash: base58btc(zQmduxLcjFFwH8AEJcnG4h2VCg592WUqLubitVfXtq7bAzK)
            location: base58btc(zQmXJbuPcsVPKuWeky6npZdAgB7CVRjEKCmaKynuWxRweNV)
            type: BLOB, offset: 159, length: 67

        multihash: base58btc(zQmYBZUsAjCMW4yvAEW2r1K4qMd9voXuaeF9RHLgukLKiq8)
        location: base58btc(zQmYBZUsAjCMW4yvAEW2r1K4qMd9voXuaeF9RHLgukLKiq8)
        type: PACK, offset: N/A, length: N/A
        Sub-Records:
            multihash: base58btc(zQmTKjCQe7rSuAxeajoiaciC1JhMwtYageDGj8qu3LDuQeR)
            location: base58btc(zQmYBZUsAjCMW4yvAEW2r1K4qMd9voXuaeF9RHLgukLKiq8)
            type: BLOB, offset: 98, length: 176643

            multihash: base58btc(zQmSkDZHnSVBawRdmjo2ivzZpdSSHkJBrWb3EYnfQiAz9rE)
            location: base58btc(zQmYBZUsAjCMW4yvAEW2r1K4qMd9voXuaeF9RHLgukLKiq8)
            type: BLOB, offset: 176778, length: 64
```
